import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Music, X, Loader2, CheckCircle, AlertCircle, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Profile } from '@/types/database';

const MOODS = ['happy', 'chill', 'workout', 'gospel', 'party', 'sad', 'romantic', 'energetic'] as const;

interface BulkSongItem {
  id: string;
  file: File;
  title: string;
  coverFile: File | null;
  coverPreview: string | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface BulkUploadFormProps {
  artists: Profile[];
  genres: { id: string; name: string; icon: string | null }[];
  profileId: string;
}

export default function BulkUploadForm({ artists, genres, profileId }: BulkUploadFormProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [songs, setSongs] = useState<BulkSongItem[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [genreId, setGenreId] = useState('');
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState('English');
  const [uploading, setUploading] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const audioFiles = files.filter(f => f.type.includes('audio'));
    const oversized = audioFiles.filter(f => f.size > 50 * 1024 * 1024);

    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed 50MB and were skipped`);
    }

    const valid = audioFiles.filter(f => f.size <= 50 * 1024 * 1024);
    if (valid.length === 0) {
      toast.error('No valid audio files selected');
      return;
    }

    const newSongs: BulkSongItem[] = valid.map(file => ({
      id: crypto.randomUUID(),
      file,
      title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      coverFile: null,
      coverPreview: null,
      status: 'pending',
    }));

    setSongs(prev => [...prev, ...newSongs]);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const updateSong = (id: string, updates: Partial<BulkSongItem>) => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSong = (id: string) => {
    setSongs(prev => prev.filter(s => s.id !== id));
  };

  const handleCoverChange = (songId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.includes('image')) {
      updateSong(songId, { coverFile: file, coverPreview: URL.createObjectURL(file) });
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedArtistId) {
      toast.error('Please select an artist');
      return;
    }
    const pendingSongs = songs.filter(s => s.status === 'pending' || s.status === 'error');
    if (pendingSongs.length === 0) {
      toast.error('No songs to upload');
      return;
    }

    setUploading(true);
    setCompletedCount(0);
    let completed = 0;

    for (const song of pendingSongs) {
      updateSong(song.id, { status: 'uploading' });

      try {
        // Upload audio
        const audioExt = song.file.name.split('.').pop();
        const audioPath = `${selectedArtistId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${audioExt}`;
        const { error: audioError } = await supabase.storage.from('music').upload(audioPath, song.file);
        if (audioError) throw audioError;

        const { data: audioUrlData } = supabase.storage.from('music').getPublicUrl(audioPath);

        // Upload cover if present
        let coverUrl = null;
        if (song.coverFile) {
          const coverExt = song.coverFile.name.split('.').pop();
          const coverPath = `${selectedArtistId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${coverExt}`;
          const { error: coverError } = await supabase.storage.from('covers').upload(coverPath, song.coverFile);
          if (!coverError) {
            const { data: coverUrlData } = supabase.storage.from('covers').getPublicUrl(coverPath);
            coverUrl = coverUrlData.publicUrl;
          }
        }

        // Insert song record
        const { error: songError } = await supabase.from('songs').insert({
          artist_id: selectedArtistId,
          title: song.title,
          audio_url: audioUrlData.publicUrl,
          cover_art_url: coverUrl,
          genre_id: genreId || null,
          mood: mood as any || null,
          language,
          is_published: true,
          is_approved: true,
          approved_by: profileId,
          approved_at: new Date().toISOString(),
        });

        if (songError) throw songError;

        completed++;
        setCompletedCount(completed);
        updateSong(song.id, { status: 'done' });
      } catch (error: any) {
        console.error('Upload error for', song.title, error);
        updateSong(song.id, { status: 'error', error: error.message || 'Upload failed' });
      }
    }

    setUploading(false);
    const failed = pendingSongs.length - completed;
    if (failed === 0) {
      toast.success(`All ${completed} songs uploaded successfully!`);
    } else {
      toast.warning(`${completed} uploaded, ${failed} failed. You can retry failed songs.`);
    }
  };

  const pendingCount = songs.filter(s => s.status === 'pending' || s.status === 'error').length;
  const totalForUpload = songs.filter(s => s.status !== 'done').length;

  return (
    <div className="space-y-6">
      {/* Shared Settings */}
      <div className="space-y-4 p-4 rounded-xl bg-secondary/50 border border-border">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Shared Settings (applied to all songs)</h3>
        <div className="space-y-2">
          <Label>Assign to Artist *</Label>
          <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
            <SelectTrigger className="h-12 bg-background border-border">
              <SelectValue placeholder="Select an artist" />
            </SelectTrigger>
            <SelectContent>
              {artists.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.display_name || a.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Genre</Label>
            <Select value={genreId} onValueChange={setGenreId}>
              <SelectTrigger className="h-10 bg-background border-border"><SelectValue placeholder="Genre" /></SelectTrigger>
              <SelectContent>
                {genres.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.icon} {g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mood</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger className="h-10 bg-background border-border"><SelectValue placeholder="Mood" /></SelectTrigger>
              <SelectContent>
                {MOODS.map(m => (
                  <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Input value={language} onChange={e => setLanguage(e.target.value)} className="h-10 bg-background border-border" />
          </div>
        </div>
      </div>

      {/* Add Files */}
      <input ref={audioInputRef} type="file" accept="audio/*" multiple onChange={handleFilesSelected} className="hidden" />
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => audioInputRef.current?.click()}
        className="w-full p-8 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center gap-3"
      >
        <Upload className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="font-semibold">Select Audio Files</p>
          <p className="text-sm text-muted-foreground">Select multiple MP3/WAV files (up to 50MB each)</p>
        </div>
      </motion.button>

      {/* Song List */}
      {songs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{songs.length} song{songs.length !== 1 ? 's' : ''} queued</h3>
            {!uploading && songs.some(s => s.status === 'done') && (
              <Button variant="ghost" size="sm" onClick={() => setSongs(prev => prev.filter(s => s.status !== 'done'))}>
                Clear completed
              </Button>
            )}
          </div>

          <AnimatePresence>
            {songs.map(song => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  song.status === 'done' ? 'border-green-500/30 bg-green-500/5' :
                  song.status === 'error' ? 'border-destructive/30 bg-destructive/5' :
                  song.status === 'uploading' ? 'border-primary/30 bg-primary/5' :
                  'border-border bg-secondary/30'
                }`}
              >
                {/* Cover thumbnail */}
                <label className="w-12 h-12 rounded-lg border border-border flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverChange(song.id, e)} disabled={uploading} />
                  {song.coverPreview ? (
                    <img src={song.coverPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="h-5 w-5 text-muted-foreground" />
                  )}
                </label>

                {/* Status icon */}
                <div className="flex-shrink-0">
                  {song.status === 'done' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {song.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                  {song.status === 'uploading' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                  {song.status === 'pending' && <Music className="h-5 w-5 text-muted-foreground" />}
                </div>

                {/* Title input */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={song.title}
                    onChange={e => updateSong(song.id, { title: e.target.value })}
                    className="h-8 text-sm bg-transparent border-none px-1 focus-visible:ring-1"
                    disabled={uploading || song.status === 'done'}
                  />
                  <p className="text-xs text-muted-foreground truncate px-1">
                    {song.file.name} • {(song.file.size / 1024 / 1024).toFixed(1)} MB
                    {song.error && <span className="text-destructive ml-2">{song.error}</span>}
                  </p>
                </div>

                {/* Remove */}
                {!uploading && song.status !== 'done' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeSong(song.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading {completedCount} of {totalForUpload}...</span>
            <span>{Math.round((completedCount / totalForUpload) * 100)}%</span>
          </div>
          <Progress value={(completedCount / totalForUpload) * 100} className="h-2" />
        </div>
      )}

      {/* Upload Button */}
      <Button
        onClick={handleBulkUpload}
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={uploading || pendingCount === 0 || !selectedArtistId || artists.length === 0}
      >
        {uploading ? (
          <><Loader2 className="h-5 w-5 animate-spin" />Uploading {completedCount}/{totalForUpload}...</>
        ) : (
          <><Upload className="h-5 w-5" />Upload {pendingCount} Song{pendingCount !== 1 ? 's' : ''}</>
        )}
      </Button>
    </div>
  );
}
