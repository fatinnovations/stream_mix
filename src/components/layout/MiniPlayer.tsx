import { Play, Pause, Music } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function MiniPlayer() {
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    togglePlay,
    playNext,
    playPrevious,
  } = usePlayer();
  const navigate = useNavigate();

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-16 left-0 right-0 z-40 px-2"
      >
        <div 
          className="bg-card/95 backdrop-blur-xl rounded-lg mx-1 overflow-hidden shadow-lg border border-border/30 cursor-pointer"
          onClick={() => navigate('/now-playing')}
        >
          <div className="flex items-center gap-3 p-2 pr-3">
            {/* Cover art */}
            <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0">
              {currentSong.cover_art_url ? (
                <img 
                  src={currentSong.cover_art_url} 
                  alt={currentSong.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-secondary flex items-center justify-center">
                  <Music className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Song info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate leading-tight">{currentSong.title}</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                {currentSong.artist?.display_name || currentSong.artist?.username}
              </p>
            </div>

            {/* Controls - just play/pause like Spotify */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => togglePlay()}
                className="h-8 w-8 flex items-center justify-center text-foreground"
              >
                {isPlaying ? (
                  <Pause className="h-[22px] w-[22px] fill-current" />
                ) : (
                  <Play className="h-[22px] w-[22px] fill-current ml-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* Slim bottom progress bar */}
          <div className="h-[2px] bg-muted/40 w-full">
            <div 
              className="h-full bg-primary transition-all duration-150 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
