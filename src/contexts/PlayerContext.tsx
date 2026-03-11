import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Howl } from 'howler';
import { Song } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type RepeatMode = 'off' | 'one' | 'all';

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  queue: Song[];
  queueIndex: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playSong: (song: Song) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  togglePlay: () => void;
  seekTo: (position: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (song: Song) => void;
  playNextInQueue: (song: Song) => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  reorderQueue: (newQueue: Song[]) => void;
  removeFromQueue: (index: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Helper function to fetch artist songs and trending songs for auto-play queue
async function fetchArtistAndTrendingSongs(artistId: string, currentSongId: string): Promise<Song[]> {
  // Fetch all songs from the same artist
  const { data: artistSongs } = await supabase
    .from('songs')
    .select(`
      *,
      artist:profiles!songs_artist_id_fkey(*),
      genre:genres(*)
    `)
    .eq('artist_id', artistId)
    .eq('is_published', true)
    .eq('is_approved', true)
    .order('play_count', { ascending: false });

  // Fetch trending songs (excluding the artist's songs)
  const { data: trendingSongs } = await supabase
    .from('songs')
    .select(`
      *,
      artist:profiles!songs_artist_id_fkey(*),
      genre:genres(*)
    `)
    .eq('is_published', true)
    .eq('is_approved', true)
    .neq('artist_id', artistId)
    .order('play_count', { ascending: false })
    .limit(20);

  const allSongs: Song[] = [];
  const seenIds = new Set<string>();

  // Add artist songs first, starting with the current song
  if (artistSongs) {
    // Find current song and put it first
    const currentSong = artistSongs.find(s => s.id === currentSongId);
    if (currentSong) {
      allSongs.push(currentSong as Song);
      seenIds.add(currentSong.id);
    }
    
    // Add remaining artist songs
    for (const song of artistSongs) {
      if (!seenIds.has(song.id)) {
        allSongs.push(song as Song);
        seenIds.add(song.id);
      }
    }
  }

  // Append trending songs after artist songs
  if (trendingSongs) {
    for (const song of trendingSongs) {
      if (!seenIds.has(song.id)) {
        allSongs.push(song as Song);
        seenIds.add(song.id);
      }
    }
  }

  return allSongs;
}

// Helper function to fetch random songs for auto-play when queue is empty
async function fetchRandomSongs(): Promise<Song[]> {
  // Try to get from localStorage cache first
  const cachedSongs = localStorage.getItem('cached-songs');
  let songs: Song[] = [];
  
  // Fetch random songs from the database
  const { data: randomSongs } = await supabase
    .from('songs')
    .select(`
      *,
      artist:profiles!songs_artist_id_fkey(*),
      genre:genres(*)
    `)
    .eq('is_published', true)
    .eq('is_approved', true)
    .order('play_count', { ascending: false })
    .limit(30);

  if (randomSongs && randomSongs.length > 0) {
    // Shuffle the songs randomly
    songs = [...randomSongs] as Song[];
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songs[i], songs[j]] = [songs[j], songs[i]];
    }
    // Cache songs for future use
    localStorage.setItem('cached-songs', JSON.stringify(songs));
  } else if (cachedSongs) {
    // Fall back to cached songs if database fetch fails
    try {
      songs = JSON.parse(cachedSongs) as Song[];
      // Shuffle cached songs
      for (let i = songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songs[i], songs[j]] = [songs[j], songs[i]];
      }
    } catch (e) {
      console.error('Error parsing cached songs:', e);
    }
  }

  return songs;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('player-volume');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [queue, setQueueState] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(() => {
    return localStorage.getItem('player-shuffle') === 'true';
  });
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    const saved = localStorage.getItem('player-repeat') as RepeatMode;
    return saved === 'one' || saved === 'all' ? saved : 'off';
  });
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  
  const howlRef = useRef<Howl | null>(null);
  const progressInterval = useRef<number | null>(null);
  const hasTrackedPlayRef = useRef(false);

  const { profile } = useAuth();

  // Refs to hold latest values for callbacks
  const queueRef = useRef<Song[]>([]);
  const queueIndexRef = useRef(-1);
  const shuffleRef = useRef(false);
  const repeatModeRef = useRef<RepeatMode>('off');
  const shuffledIndicesRef = useRef<number[]>([]);

  // We pass this to Howler's `onend` to ensure the handler is always registered
  // for the *current* Howl instance (autoplay reliability).
  const handleSongEndRef = useRef<() => void>(() => {});

  // Keep refs in sync with state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);
  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);
  useEffect(() => {
    shuffledIndicesRef.current = shuffledIndices;
  }, [shuffledIndices]);

  const clearProgressInterval = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const startProgressInterval = useCallback(() => {
    clearProgressInterval();
    progressInterval.current = window.setInterval(() => {
      if (howlRef.current && howlRef.current.playing()) {
        setProgress(howlRef.current.seek() as number);
      }
    }, 100);
  }, [clearProgressInterval]);

  const incrementPlayCount = useCallback(
    async (songId: string) => {
      try {
        const { error } = await supabase.rpc('track_play', {
          _song_id: songId,
          _profile_id: profile?.id ?? null,
        });

        if (error) throw error;
      } catch (error) {
        console.error('Error tracking play:', error);
      }
    },
    [profile?.id]
  );


  // Generate shuffled indices when shuffle is enabled or queue changes
  const generateShuffledIndices = useCallback((length: number, currentIdx: number) => {
    const indices = Array.from({ length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    // Move current index to front if it exists
    if (currentIdx >= 0 && currentIdx < length) {
      const pos = indices.indexOf(currentIdx);
      if (pos > 0) {
        indices.splice(pos, 1);
        indices.unshift(currentIdx);
      }
    }
    return indices;
  }, []);

  // Internal play function
  const playSongInternal = useCallback(
    (song: Song, shouldAutoPlay = true) => {
      if (howlRef.current) {
        howlRef.current.unload();
      }

      setCurrentSong(song);
      setProgress(0);
      hasTrackedPlayRef.current = false;

      const newHowl = new Howl({
        src: [song.audio_url],
        html5: true,
        volume: volume,
        onplay: () => {
          setIsPlaying(true);
          setDuration(newHowl.duration() || 0);
          startProgressInterval();

          // Howler fires `onplay` both on initial play and on resume.
          // Only track a play once per loaded song.
          if (!hasTrackedPlayRef.current) {
            hasTrackedPlayRef.current = true;
            incrementPlayCount(song.id);
          }
        },
        onpause: () => {
          setIsPlaying(false);
          clearProgressInterval();
        },
        onload: () => {
          setDuration(newHowl.duration() || 0);
        },
        onend: () => {
          // Autoplay (next track) must be handled reliably even when Howl instances change.
          handleSongEndRef.current();
        },
      });


      howlRef.current = newHowl;

      if (shouldAutoPlay) {
        newHowl.play();
      }
    },
    [volume, startProgressInterval, clearProgressInterval]
  );

  // Handle song end - uses refs to get latest values
  const handleSongEnd = useCallback(async () => {
    const currentRepeatMode = repeatModeRef.current;
    const currentQueue = queueRef.current;
    const currentQueueIndex = queueIndexRef.current;
    const currentShuffle = shuffleRef.current;
    const currentShuffledIndices = shuffledIndicesRef.current;

    if (currentRepeatMode === 'one') {
      // Repeat current song
      if (howlRef.current) {
        howlRef.current.seek(0);
        howlRef.current.play();
      }
      return;
    }

    // If queue is empty or at end, fetch random songs for auto-play
    if (currentQueue.length === 0 || (currentQueueIndex >= currentQueue.length - 1 && currentRepeatMode !== 'all')) {
      console.log('Queue empty or at end, fetching random songs for auto-play');
      const randomSongs = await fetchRandomSongs();
      if (randomSongs.length > 0) {
        setQueueState(randomSongs);
        queueRef.current = randomSongs;
        setQueueIndex(0);
        queueIndexRef.current = 0;
        
        if (shuffleRef.current) {
          const indices = generateShuffledIndices(randomSongs.length, 0);
          setShuffledIndices(indices);
          shuffledIndicesRef.current = indices;
        }
        
        playSongInternal(randomSongs[0]);
        return;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    let nextIndex: number;

    if (currentShuffle) {
      const currentShufflePos = currentShuffledIndices.indexOf(currentQueueIndex);
      const nextShufflePos = currentShufflePos + 1;

      if (nextShufflePos < currentShuffledIndices.length) {
        nextIndex = currentShuffledIndices[nextShufflePos];
      } else if (currentRepeatMode === 'all') {
        // Reshuffle and start over
        const newIndices = generateShuffledIndices(currentQueue.length, -1);
        setShuffledIndices(newIndices);
        shuffledIndicesRef.current = newIndices;
        nextIndex = newIndices[0];
      } else {
        // Fetch random songs instead of stopping
        const randomSongs = await fetchRandomSongs();
        if (randomSongs.length > 0) {
          setQueueState(randomSongs);
          queueRef.current = randomSongs;
          setQueueIndex(0);
          queueIndexRef.current = 0;
          const indices = generateShuffledIndices(randomSongs.length, 0);
          setShuffledIndices(indices);
          shuffledIndicesRef.current = indices;
          playSongInternal(randomSongs[0]);
        } else {
          setIsPlaying(false);
        }
        return;
      }
    } else {
      nextIndex = currentQueueIndex + 1;
      if (nextIndex >= currentQueue.length) {
        if (currentRepeatMode === 'all') {
          nextIndex = 0;
        } else {
          // Fetch random songs instead of stopping
          const randomSongs = await fetchRandomSongs();
          if (randomSongs.length > 0) {
            setQueueState(randomSongs);
            queueRef.current = randomSongs;
            setQueueIndex(0);
            queueIndexRef.current = 0;
            playSongInternal(randomSongs[0]);
          } else {
            setIsPlaying(false);
          }
          return;
        }
      }
    }

    setQueueIndex(nextIndex);
    queueIndexRef.current = nextIndex;
    playSongInternal(currentQueue[nextIndex]);
  }, [generateShuffledIndices, playSongInternal]);

  // Keep the onend callback pointing at the latest handler
  useEffect(() => {
    handleSongEndRef.current = handleSongEnd;
  }, [handleSongEnd]);

  const playSong = useCallback(async (song: Song) => {
    // Ensure queueIndex stays in sync so next/previous/autoplay work reliably.
    const q = queueRef.current;
    let idx = q.findIndex((s) => s.id === song.id);

    if (idx === -1) {
      // If nothing has set a queue yet (e.g. play from Song Detail), 
      // build a smart queue: all artist songs + trending songs
      if (q.length === 0 && song.artist_id) {
        // Start playing immediately, then build queue in background
        playSongInternal(song);
        
        // Fetch artist songs + trending songs for continuous playback
        const smartQueue = await fetchArtistAndTrendingSongs(song.artist_id, song.id);
        
        if (smartQueue.length > 0) {
          setQueueState(smartQueue);
          queueRef.current = smartQueue;
          setQueueIndex(0); // Current song is always first
          queueIndexRef.current = 0;
          
          if (shuffleRef.current) {
            const indices = generateShuffledIndices(smartQueue.length, 0);
            setShuffledIndices(indices);
            shuffledIndicesRef.current = indices;
          }
        }
        return;
      } else if (q.length === 0) {
        setQueueState([song]);
        queueRef.current = [song];
        idx = 0;
      } else {
        // Queue exists but doesn't include this song; keep current index as-is.
        idx = queueIndexRef.current;
      }
    }

    if (idx >= 0) {
      setQueueIndex(idx);
      queueIndexRef.current = idx;

      if (shuffleRef.current && queueRef.current.length > 0 && shuffledIndicesRef.current.length === 0) {
        const indices = generateShuffledIndices(queueRef.current.length, idx);
        setShuffledIndices(indices);
        shuffledIndicesRef.current = indices;
      }
    }

    playSongInternal(song);
  }, [generateShuffledIndices, playSongInternal]);

  const pauseSong = useCallback(() => {
    howlRef.current?.pause();
  }, []);

  const resumeSong = useCallback(() => {
    howlRef.current?.play();
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseSong();
    } else {
      resumeSong();
    }
  }, [isPlaying, pauseSong, resumeSong]);

  const seekTo = useCallback((position: number) => {
    howlRef.current?.seek(position);
    setProgress(position);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    localStorage.setItem('player-volume', String(newVolume));
    howlRef.current?.volume(newVolume);
  }, []);

  const playNext = useCallback(async () => {
    const currentQueue = queueRef.current;
    const currentQueueIndex = queueIndexRef.current;
    const currentShuffle = shuffleRef.current;
    const currentShuffledIndices = shuffledIndicesRef.current;
    const currentRepeatMode = repeatModeRef.current;

    console.log('playNext called - queue length:', currentQueue.length, 'queueIndex:', currentQueueIndex);

    // If queue is empty, fetch random songs
    if (currentQueue.length === 0) {
      console.log('Queue empty, fetching random songs');
      const randomSongs = await fetchRandomSongs();
      if (randomSongs.length > 0) {
        setQueueState(randomSongs);
        queueRef.current = randomSongs;
        setQueueIndex(0);
        queueIndexRef.current = 0;
        
        if (shuffleRef.current) {
          const indices = generateShuffledIndices(randomSongs.length, 0);
          setShuffledIndices(indices);
          shuffledIndicesRef.current = indices;
        }
        
        playSongInternal(randomSongs[0]);
      }
      return;
    }
    
    let nextIndex: number;
    
    if (currentShuffle) {
      const currentShufflePos = currentShuffledIndices.indexOf(currentQueueIndex);
      const nextShufflePos = currentShufflePos + 1;
      
      if (nextShufflePos < currentShuffledIndices.length) {
        nextIndex = currentShuffledIndices[nextShufflePos];
      } else if (currentRepeatMode === 'all') {
        const newIndices = generateShuffledIndices(currentQueue.length, -1);
        setShuffledIndices(newIndices);
        shuffledIndicesRef.current = newIndices;
        nextIndex = newIndices[0];
      } else {
        // At end of shuffle, fetch random songs
        const randomSongs = await fetchRandomSongs();
        if (randomSongs.length > 0) {
          setQueueState(randomSongs);
          queueRef.current = randomSongs;
          setQueueIndex(0);
          queueIndexRef.current = 0;
          const indices = generateShuffledIndices(randomSongs.length, 0);
          setShuffledIndices(indices);
          shuffledIndicesRef.current = indices;
          playSongInternal(randomSongs[0]);
        }
        return;
      }
    } else {
      nextIndex = currentQueueIndex + 1;
      if (nextIndex >= currentQueue.length) {
        if (currentRepeatMode === 'all') {
          nextIndex = 0;
        } else {
          // At end of queue, fetch random songs
          const randomSongs = await fetchRandomSongs();
          if (randomSongs.length > 0) {
            setQueueState(randomSongs);
            queueRef.current = randomSongs;
            setQueueIndex(0);
            queueIndexRef.current = 0;
            playSongInternal(randomSongs[0]);
          }
          return;
        }
      }
    }

    console.log('Playing next at index:', nextIndex);
    setQueueIndex(nextIndex);
    queueIndexRef.current = nextIndex;
    playSongInternal(currentQueue[nextIndex]);
  }, [generateShuffledIndices, playSongInternal]);

  const playPrevious = useCallback(() => {
    const currentQueue = queueRef.current;
    const currentQueueIndex = queueIndexRef.current;
    const currentShuffle = shuffleRef.current;
    const currentShuffledIndices = shuffledIndicesRef.current;
    const currentRepeatMode = repeatModeRef.current;

    console.log('playPrevious called - queue length:', currentQueue.length, 'queueIndex:', currentQueueIndex);

    if (currentQueue.length === 0) return;
    
    // If more than 3 seconds in, restart current song
    if (progress > 3) {
      seekTo(0);
      return;
    }
    
    let prevIndex: number;
    
    if (currentShuffle) {
      const currentShufflePos = currentShuffledIndices.indexOf(currentQueueIndex);
      const prevShufflePos = currentShufflePos - 1;
      
      if (prevShufflePos >= 0) {
        prevIndex = currentShuffledIndices[prevShufflePos];
      } else if (currentRepeatMode === 'all') {
        prevIndex = currentShuffledIndices[currentShuffledIndices.length - 1];
      } else {
        seekTo(0);
        return;
      }
    } else {
      prevIndex = currentQueueIndex - 1;
      if (prevIndex < 0) {
        if (currentRepeatMode === 'all') {
          prevIndex = currentQueue.length - 1;
        } else {
          seekTo(0);
          return;
        }
      }
    }

    console.log('Playing previous at index:', prevIndex);
    setQueueIndex(prevIndex);
    queueIndexRef.current = prevIndex;
    playSongInternal(currentQueue[prevIndex]);
  }, [progress, seekTo, playSongInternal]);

  const addToQueue = useCallback((song: Song) => {
    setQueueState(prev => {
      const newQueue = [...prev, song];
      queueRef.current = newQueue;
      return newQueue;
    });
  }, []);

  const playNextInQueue = useCallback((song: Song) => {
    setQueueState(prev => {
      const currentIdx = queueIndexRef.current;
      const insertAt = currentIdx + 1;
      const newQueue = [...prev.slice(0, insertAt), song, ...prev.slice(insertAt)];
      queueRef.current = newQueue;
      
      // Update shuffle indices if shuffle is on
      if (shuffleRef.current && newQueue.length > 0) {
        const newIndices = generateShuffledIndices(newQueue.length, currentIdx);
        setShuffledIndices(newIndices);
        shuffledIndicesRef.current = newIndices;
      }
      
      return newQueue;
    });
  }, [generateShuffledIndices]);

  const setQueue = useCallback((songs: Song[], startIndex = 0) => {
    console.log('setQueue called with', songs.length, 'songs, startIndex:', startIndex);
    setQueueState(songs);
    queueRef.current = songs;
    setQueueIndex(startIndex);
    queueIndexRef.current = startIndex;
    
    if (shuffle) {
      const newIndices = generateShuffledIndices(songs.length, startIndex);
      setShuffledIndices(newIndices);
      shuffledIndicesRef.current = newIndices;
    }
    
    if (songs.length > 0 && startIndex < songs.length) {
      playSongInternal(songs[startIndex]);
    }
  }, [shuffle, generateShuffledIndices, playSongInternal]);

  const clearQueue = useCallback(() => {
    setQueueState([]);
    queueRef.current = [];
    setQueueIndex(-1);
    queueIndexRef.current = -1;
    setShuffledIndices([]);
    shuffledIndicesRef.current = [];
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => {
      const newShuffle = !prev;
      shuffleRef.current = newShuffle;
      localStorage.setItem('player-shuffle', String(newShuffle));
      if (newShuffle && queueRef.current.length > 0) {
        const newIndices = generateShuffledIndices(queueRef.current.length, queueIndexRef.current);
        setShuffledIndices(newIndices);
        shuffledIndicesRef.current = newIndices;
      }
      console.log('Shuffle toggled:', newShuffle);
      return newShuffle;
    });
  }, [generateShuffledIndices]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      let newMode: RepeatMode;
      if (prev === 'off') newMode = 'all';
      else if (prev === 'all') newMode = 'one';
      else newMode = 'off';
      repeatModeRef.current = newMode;
      localStorage.setItem('player-repeat', newMode);
      console.log('Repeat mode toggled:', newMode);
      return newMode;
    });
  }, []);

  const reorderQueue = useCallback((newQueue: Song[]) => {
    // Find current song's new position in the reordered queue
    const currentSongId = currentSong?.id;
    let newIndex = queueIndexRef.current;
    
    if (currentSongId) {
      newIndex = newQueue.findIndex(s => s.id === currentSongId);
      if (newIndex === -1) newIndex = 0;
    }
    
    setQueueState(newQueue);
    queueRef.current = newQueue;
    setQueueIndex(newIndex);
    queueIndexRef.current = newIndex;
    
    // Reset shuffle indices if shuffle is on
    if (shuffleRef.current && newQueue.length > 0) {
      const newIndices = generateShuffledIndices(newQueue.length, newIndex);
      setShuffledIndices(newIndices);
      shuffledIndicesRef.current = newIndices;
    }
  }, [currentSong?.id, generateShuffledIndices]);

  const removeFromQueue = useCallback((index: number) => {
    const currentQueue = queueRef.current;
    if (index < 0 || index >= currentQueue.length) return;
    
    // Don't allow removing the currently playing song
    if (index === queueIndexRef.current) return;
    
    const newQueue = [...currentQueue];
    newQueue.splice(index, 1);
    
    // Adjust queueIndex if we removed a song before the current one
    let newIndex = queueIndexRef.current;
    if (index < queueIndexRef.current) {
      newIndex = queueIndexRef.current - 1;
    }
    
    setQueueState(newQueue);
    queueRef.current = newQueue;
    setQueueIndex(newIndex);
    queueIndexRef.current = newIndex;
    
    // Reset shuffle indices if shuffle is on
    if (shuffleRef.current && newQueue.length > 0) {
      const newIndices = generateShuffledIndices(newQueue.length, newIndex);
      setShuffledIndices(newIndices);
      shuffledIndicesRef.current = newIndices;
    }
  }, [generateShuffledIndices]);

  useEffect(() => {
    return () => {
      clearProgressInterval();
      howlRef.current?.unload();
    };
  }, [clearProgressInterval]);

  return (
    <PlayerContext.Provider value={{
      currentSong,
      isPlaying,
      progress,
      duration,
      volume,
      queue,
      queueIndex,
      shuffle,
      repeatMode,
      playSong,
      pauseSong,
      resumeSong,
      togglePlay,
      seekTo,
      setVolume,
      playNext,
      playPrevious,
      addToQueue,
      playNextInQueue,
      setQueue,
      clearQueue,
      toggleShuffle,
      toggleRepeat,
      reorderQueue,
      removeFromQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
