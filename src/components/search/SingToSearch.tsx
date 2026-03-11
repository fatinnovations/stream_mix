import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Search, Music, Loader2, AudioLines } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Song } from '@/types/database';
import { SongCard } from '@/components/songs/SongCard';
import { toast } from 'sonner';

interface SingToSearchProps {
  onClose?: () => void;
}

type SearchMode = 'lyrics' | 'hum';

export function SingToSearch({ onClose }: SingToSearchProps) {
  const [mode, setMode] = useState<SearchMode>('lyrics');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ title: string; artist: string; reasoning: string }>>([]);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pulseScale, setPulseScale] = useState(1);

  const SpeechRecognition = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

  // ── Lyrics text search ──
  const searchLyrics = useCallback(async (query: string) => {
    if (!query || query.length < 3) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*, artist:profiles!songs_artist_id_fkey(*), genre:genres(*)')
        .eq('is_published', true)
        .eq('is_approved', true)
        .or(`lyrics.ilike.%${query}%,title.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;
      setResults((data ?? []) as Song[]);
    } catch {
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ── Search database with AI-provided terms ──
  const searchWithTerms = useCallback(async (terms: string[]) => {
    if (!terms.length) return;
    setIsSearching(true);
    try {
      const orFilter = terms
        .map(t => `title.ilike.%${t}%,lyrics.ilike.%${t}%`)
        .join(',');
      const { data, error } = await supabase
        .from('songs')
        .select('*, artist:profiles!songs_artist_id_fkey(*), genre:genres(*)')
        .eq('is_published', true)
        .eq('is_approved', true)
        .or(orFilter)
        .limit(20);
      if (error) throw error;
      setResults((data ?? []) as Song[]);
    } catch {
      // silently fail – AI suggestions are still shown
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ── Hum recognition via edge function ──
  const recognizeHumming = useCallback(async (audioBlob: Blob) => {
    setIsSearching(true);
    setHasSearched(true);
    setAiSuggestions([]);
    try {
      // Convert blob → base64
      const buffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hum-recognize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ audioBase64: base64 }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Too many requests. Please wait a moment.');
          return;
        }
        if (response.status === 402) {
          toast.error('AI credits exhausted.');
          return;
        }
        throw new Error('Recognition failed');
      }

      const result = await response.json();

      if (result.identified && result.suggestions?.length) {
        setAiSuggestions(result.suggestions);
        // Also search the local database
        if (result.searchTerms?.length) {
          await searchWithTerms(result.searchTerms);
        }
      } else {
        setAiSuggestions([]);
        setResults([]);
      }
    } catch (err) {
      console.error('Hum recognition error:', err);
      toast.error('Could not recognize the melody. Try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchWithTerms]);

  // ── Mic permission helper ──
  const requestMicPermission = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const permissionStatus = await navigator.permissions?.query({ name: 'microphone' as PermissionName }).catch(() => null);
      if (permissionStatus?.state === 'denied') {
        toast.error('Microphone access is blocked. Please enable it in your browser settings.');
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch {
      toast.error('Microphone access denied. Please allow access and try again.');
      return null;
    }
  }, []);

  // ── Lyrics mode: Speech Recognition (request mic permission first) ──
  const startLyricsListening = useCallback(async () => {
    const stream = await requestMicPermission();
    if (!stream) return;
    stream.getTracks().forEach(t => t.stop());

    if (!SpeechRecognition) {
      toast.error('Voice search not supported. Try Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      let interim = '', final = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      if (final) setTranscript(prev => (prev + ' ' + final).trim());
      setInterimTranscript(interim);
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') toast.error('Microphone access denied.');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [SpeechRecognition, requestMicPermission]);

  const stopLyricsListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    const fullText = (transcript + ' ' + interimTranscript).trim();
    if (fullText.length >= 3) searchLyrics(fullText);
    setInterimTranscript('');
  }, [transcript, interimTranscript, searchLyrics]);

  // ── Hum mode: MediaRecorder ──

  const startHumRecording = useCallback(async () => {
    const stream = await requestMicPermission();
    if (!stream) return;

    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await recognizeHumming(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsListening(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      stream.getTracks().forEach(t => t.stop());
      toast.error('Could not start recording.');
    }
  }, [recognizeHumming, requestMicPermission]);

  const stopHumRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsListening(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  // Unified start / stop
  const handleToggle = useCallback(() => {
    if (isListening) {
      mode === 'lyrics' ? stopLyricsListening() : stopHumRecording();
    } else {
      setResults([]);
      setAiSuggestions([]);
      setHasSearched(false);
      setTranscript('');
      mode === 'lyrics' ? startLyricsListening() : startHumRecording();
    }
  }, [isListening, mode, startLyricsListening, stopLyricsListening, startHumRecording, stopHumRecording]);

  // Pulse animation
  useEffect(() => {
    if (isListening) {
      pulseInterval.current = setInterval(() => setPulseScale(p => p === 1 ? 1.15 : 1), 600);
    } else {
      if (pulseInterval.current) clearInterval(pulseInterval.current);
      setPulseScale(1);
    }
    return () => { if (pulseInterval.current) clearInterval(pulseInterval.current); };
  }, [isListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const displayText = (transcript + ' ' + interimTranscript).trim();
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">
          {mode === 'lyrics' ? 'Sing to Search' : 'Hum to Search'}
        </h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === 'lyrics' ? 'default' : 'secondary'}
          size="sm"
          className="rounded-full gap-2 flex-1"
          onClick={() => { if (!isListening) { setMode('lyrics'); setHasSearched(false); setResults([]); setAiSuggestions([]); } }}
          disabled={isListening}
        >
          <Mic className="h-4 w-4" /> Lyrics
        </Button>
        <Button
          variant={mode === 'hum' ? 'default' : 'secondary'}
          size="sm"
          className="rounded-full gap-2 flex-1"
          onClick={() => { if (!isListening) { setMode('hum'); setHasSearched(false); setResults([]); setAiSuggestions([]); } }}
          disabled={isListening}
        >
          <AudioLines className="h-4 w-4" /> Hum / Whistle
        </Button>
      </div>

      {/* Mic area */}
      <div className="flex flex-col items-center gap-6 mb-6">
        <p className="text-sm text-muted-foreground text-center max-w-[280px]">
          {isListening
            ? mode === 'lyrics'
              ? 'Listening… Sing or say the lyrics you remember'
              : `Recording… Hum or whistle the melody (${formatTime(recordingDuration)})`
            : mode === 'lyrics'
              ? 'Tap the mic and sing or say the lyrics'
              : 'Tap the mic and hum or whistle the melody'}
        </p>

        {/* Animated mic button */}
        <div className="relative">
          <AnimatePresence>
            {isListening && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "absolute inset-0 rounded-full border-2",
                      mode === 'hum' ? 'border-accent/40' : 'border-primary/30'
                    )}
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.5 + i * 0.3, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleToggle}
            animate={{ scale: pulseScale }}
            transition={{ duration: 0.3 }}
            className={cn(
              'relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-colors',
              isListening
                ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30'
                : mode === 'hum'
                  ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/30'
                  : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
            )}
          >
            {isListening ? (
              <MicOff className="h-8 w-8" />
            ) : mode === 'hum' ? (
              <AudioLines className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </motion.button>
        </div>

        {/* Live transcript (lyrics mode) */}
        {mode === 'lyrics' && displayText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-secondary/60 rounded-xl p-4 max-h-24 overflow-auto"
          >
            <p className="text-sm text-foreground/80 italic">"{displayText}"</p>
          </motion.div>
        )}

        {/* Hum mode recording indicator */}
        {mode === 'hum' && isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 bg-secondary/60 rounded-xl px-4 py-3"
          >
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Recording melody… Stop when ready
            </span>
          </motion.div>
        )}

        {/* Re-search button (lyrics mode) */}
        {mode === 'lyrics' && displayText && !isListening && !isSearching && (
          <Button variant="secondary" size="sm" className="rounded-full gap-2" onClick={() => searchLyrics(displayText)}>
            <Search className="h-4 w-4" /> Search again
          </Button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto min-h-0">
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">
              {mode === 'hum' ? 'Analyzing melody with AI…' : 'Searching lyrics…'}
            </span>
          </div>
        )}

        {/* AI suggestions (hum mode) */}
        {!isSearching && aiSuggestions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
              AI Suggestions
            </p>
            <div className="space-y-2">
              {aiSuggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-secondary/70 rounded-xl p-3 cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => searchLyrics(s.title)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Music className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.artist}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{s.reasoning}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Database results */}
        {!isSearching && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {results.length} matching song{results.length !== 1 ? 's' : ''} in library
            </p>
            {results.map((song, index) => (
              <SongCard key={song.id} song={song} variant="compact" index={index} />
            ))}
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && aiSuggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
            <Music className="h-10 w-10 opacity-40" />
            <p className="text-sm">No matching songs found</p>
            <p className="text-xs text-center max-w-[240px]">
              {mode === 'hum'
                ? 'Try humming more clearly or for a longer duration'
                : 'Try singing a different part or use clearer words'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
