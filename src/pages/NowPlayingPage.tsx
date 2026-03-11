import { useNavigate, } from 'react-router-dom';
import { motion, Reorder } from 'framer-motion';
import {
  ChevronDown,
  Heart,
  Share2,
  ListMusic,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  GripVertical,
  X,
  MoreHorizontal,
  Music,
  AlignLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayer } from '@/contexts/PlayerContext';
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { Song } from '@/types/database';
import { cn } from '@/lib/utils';

export default function NowPlayingPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    queue,
    queueIndex,
    shuffle,
    repeatMode,
    togglePlay,
    seekTo,
    playNext,
    playPrevious,
    playSong,
    toggleShuffle,
    toggleRepeat,
    reorderQueue,
    removeFromQueue,
  } = usePlayer();

  const { checkAuth } = useLoginPrompt();
  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  useEffect(() => {
    const checkLiked = async () => {
      if (!currentSong || !profile) return;
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('song_id', currentSong.id)
        .eq('user_id', profile.id)
        .maybeSingle();
      setIsLiked(!!data);
    };
    checkLiked();
  }, [currentSong, profile]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLike = async () => {
    if (!currentSong) return;
    if (!checkAuth('like songs')) return;
    if (!profile) return;

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('song_id', currentSong.id)
          .eq('user_id', profile.id);
        if (error) { toast.error('Unable to update likes'); return; }
        setIsLiked(false);
        toast.success('Removed from likes');
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ song_id: currentSong.id, user_id: profile.id });
        if (error) { toast.error('Unable to update likes'); return; }
        setIsLiked(true);
        toast.success('Added to likes');
      }
    } catch {
      toast.error('Unable to update likes');
    }
  };

  const handleShare = async () => {
    if (!currentSong) return;
    if (navigator.share) {
      await navigator.share({
        title: currentSong.title,
        text: `Listen to ${currentSong.title}`,
        url: `${window.location.origin}/song/${currentSong.id}`,
      });
    } else {
      await navigator.clipboard.writeText(`${window.location.origin}/song/${currentSong.id}`);
      toast.success('Link copied');
    }
  };

  const handleNext = () => {
    if (!checkAuth('use playback controls')) return;
    playNext();
  };

  const handlePrevious = () => {
    if (!checkAuth('use playback controls')) return;
    playPrevious();
  };

  const handleShuffle = () => {
    if (!checkAuth('use playback controls')) return;
    toggleShuffle();
  };

  const handleRepeat = () => {
    if (!checkAuth('use playback controls')) return;
    toggleRepeat();
  };

  if (!currentSong) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No song playing</p>
      </div>
    );
  }

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Dynamic background blur from cover art */}
      <div className="absolute inset-0">
        {currentSong.cover_art_url && (
          <img
            src={currentSong.cover_art_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-[80px] opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-background/70" />
      </div>

      <div className="relative h-full flex flex-col px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ChevronDown className="h-6 w-6" />
          </Button>
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Playing from
            </span>
            <span className="text-xs font-semibold truncate max-w-[200px]">
              {currentSong.artist?.display_name || 'Library'}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {
            if (!checkAuth('view queue')) return;
            setShowQueue(!showQueue);
            setShowLyrics(false);
          }}>
            {showQueue ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          </Button>
        </div>

        {showQueue ? (
          <QueuePanel
            queue={queue}
            queueIndex={queueIndex}
            currentSongId={currentSong.id}
            onPlay={playSong}
            onRemove={removeFromQueue}
            onReorder={reorderQueue}
          />
        ) : showLyrics ? (
          <LyricsPanel lyrics={currentSong.lyrics} title={currentSong.title} progress={progress} duration={duration} onClose={() => setShowLyrics(false)} />
        ) : (
          <>
            {/* Album Art */}
            <div className="flex-1 flex items-center justify-center py-4 min-h-0">
              <div className="w-full max-w-[340px] aspect-square rounded-lg overflow-hidden shadow-2xl shadow-black/50">
                {currentSong.cover_art_url ? (
                  <img
                    src={currentSong.cover_art_url}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <Music className="h-20 w-20 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Song Info + Like */}
            <div className="flex items-center justify-between mb-6">
              <div className="min-w-0 flex-1 mr-4">
                <h2 className="text-xl font-bold truncate">{currentSong.title}</h2>
                <p className="text-sm text-muted-foreground truncate">
                  {currentSong.artist?.display_name || 'Unknown Artist'}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleLike}>
                <Heart
                  className={cn(
                    'h-6 w-6 transition-colors',
                    isLiked ? 'fill-primary text-primary' : 'text-muted-foreground'
                  )}
                />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <Slider
                value={[progress]}
                max={duration || 100}
                step={1}
                onValueChange={([value]) => {
                  if (!checkAuth('seek in track')) return;
                  seekTo(value);
                }}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 font-medium">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-between mb-6 px-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={handleShuffle}
              >
                <Shuffle
                  className={cn(
                    'h-5 w-5',
                    shuffle ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </Button>
              <Button variant="ghost" size="icon" className="h-12 w-12" onClick={handlePrevious}>
                <SkipBack className="h-7 w-7 fill-current" />
              </Button>
              <button
                className="h-16 w-16 rounded-full bg-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                onClick={() => togglePlay()}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7 text-background fill-background" />
                ) : (
                  <Play className="h-7 w-7 text-background fill-background ml-1" />
                )}
              </button>
              <Button variant="ghost" size="icon" className="h-12 w-12" onClick={handleNext}>
                <SkipForward className="h-7 w-7 fill-current" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={handleRepeat}
              >
                <RepeatIcon
                  className={cn(
                    'h-5 w-5',
                    repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </Button>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pb-6 px-2">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(`/song/${currentSong.id}`)}>
                <Music className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9", showLyrics && "text-primary")}
                onClick={() => {
                  setShowLyrics(!showLyrics);
                  setShowQueue(false);
                }}
              >
                <AlignLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {
                if (!checkAuth('view queue')) return;
                setShowQueue(true);
                setShowLyrics(false);
              }}>
                <ListMusic className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleShare}>
                <Share2 className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ── Lyrics Panel ── */
function LyricsPanel({ lyrics, title, progress, duration, onClose }: { lyrics: string | null; title: string; progress: number; duration: number; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => (lyrics ? lyrics.split('\n') : []), [lyrics]);

  // Calculate which line should be "active" based on progress
  const activeLineIndex = useMemo(() => {
    if (!lyrics || duration === 0) return 0;
    const fraction = progress / duration;
    return Math.min(Math.floor(fraction * lines.length), lines.length - 1);
  }, [progress, duration, lines.length, lyrics]);

  // Auto-scroll to keep active line in view
  useEffect(() => {
    if (!scrollRef.current || !lyrics) return;
    const container = scrollRef.current;
    const lineElements = container.querySelectorAll('[data-lyric-line]');
    const activeLine = lineElements[activeLineIndex] as HTMLElement | undefined;
    if (!activeLine) return;

    const containerHeight = container.clientHeight;
    const targetScroll = activeLine.offsetTop - containerHeight / 3;

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth',
    });
  }, [activeLineIndex, lyrics]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Lyrics</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {lyrics ? (
        <div ref={scrollRef} className="flex-1 overflow-auto pb-8 pr-2 scrollbar-hide">
          <div ref={contentRef} className="space-y-4 pt-8 pb-[40vh]">
            {lines.map((line, i) => (
              <p
                key={i}
                data-lyric-line
                className={cn(
                  'text-[17px] leading-relaxed font-semibold transition-all duration-700 ease-out px-1',
                  i === activeLineIndex
                    ? 'text-foreground scale-[1.02] origin-left'
                    : i < activeLineIndex
                      ? 'text-muted-foreground/30'
                      : 'text-muted-foreground/50'
                )}
              >
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Music className="h-12 w-12 opacity-40" />
          <p className="text-sm">No lyrics available for "{title}"</p>
        </div>
      )}
    </div>
  );
}

/* ── Queue Panel ── */
function QueuePanel({
  queue,
  queueIndex,
  currentSongId,
  onPlay,
  onRemove,
  onReorder,
}: {
  queue: Song[];
  queueIndex: number;
  currentSongId: string;
  onPlay: (song: Song) => void;
  onRemove: (index: number) => void;
  onReorder: (newQueue: Song[]) => void;
}) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      <div className="mb-4">
        <h3 className="text-lg font-bold">Queue</h3>
        <p className="text-sm text-muted-foreground">{queue.length} songs</p>
      </div>
      {queue.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Queue is empty</p>
      ) : (
        <Reorder.Group
          axis="y"
          values={queue}
          onReorder={onReorder}
          className="flex-1 overflow-auto space-y-0.5 pb-8"
        >
          {queue.map((song, index) => (
            <QueueItem
              key={song.id}
              song={song}
              index={index}
              isCurrentSong={currentSongId === song.id}
              queueIndex={queueIndex}
              onPlay={() => onPlay(song)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

/* ── Queue Item ── */
function QueueItem({
  song,
  index,
  isCurrentSong,
  queueIndex,
  onPlay,
  onRemove,
}: {
  song: Song;
  index: number;
  isCurrentSong: boolean;
  queueIndex: number;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const isPast = index < queueIndex;

  return (
    <Reorder.Item
      value={song}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-grab active:cursor-grabbing transition-colors group',
        isCurrentSong
          ? 'bg-primary/15'
          : isPast
            ? 'opacity-40'
            : 'hover:bg-muted/30'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-50" />
      <img
        src={song.cover_art_url || '/placeholder.svg'}
        alt={song.title}
        className="w-10 h-10 rounded object-cover flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
      />
      <div className="flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
        <p className={cn('font-medium text-sm truncate', isCurrentSong && 'text-primary')}>
          {song.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {song.artist?.display_name || 'Unknown Artist'}
        </p>
      </div>
      {!isCurrentSong && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {isCurrentSong && (
        <div className="flex items-end gap-0.5 h-3 flex-shrink-0">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-0.5 bg-primary rounded-full animate-pulse"
              style={{
                height: `${8 + Math.random() * 6}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}
    </Reorder.Item>
  );
}
