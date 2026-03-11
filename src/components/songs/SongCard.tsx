import React from 'react';
import { Play, Pause, ListPlus, ListStart, Music, Download } from 'lucide-react';
import { Song } from '@/types/database';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { useDownloadSong } from '@/hooks/useDownloadSong';

interface SongCardProps {
  song: Song;
  variant?: 'default' | 'compact' | 'horizontal';
  showArtist?: boolean;
  index?: number;
  songs?: Song[];
}

export const SongCard = React.forwardRef<HTMLDivElement, SongCardProps>(function SongCard({ song, variant = 'default', showArtist = true, index, songs }, ref) {
  const { currentSong, isPlaying, playSong, togglePlay, setQueue, addToQueue, playNextInQueue } = usePlayer();
  const navigate = useNavigate();
  const { checkAuth } = useLoginPrompt();
  const { downloadSong } = useDownloadSong();
  const isCurrentSong = currentSong?.id === song.id;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentSong) {
      togglePlay();
    } else if (songs && songs.length > 0) {
      // Find index of this song in the songs array
      const songIndex = songs.findIndex(s => s.id === song.id);
      setQueue(songs, songIndex >= 0 ? songIndex : 0);
    } else {
      playSong(song);
    }
  };

  const handleCardClick = () => {
    navigate(`/song/${song.id}`);
  };

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!checkAuth('add songs to your queue')) return;
    playNextInQueue(song);
    toast.success(`"${song.title}" will play next`);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!checkAuth('add songs to your queue')) return;
    addToQueue(song);
    toast.success(`"${song.title}" added to queue`);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!checkAuth('download songs')) return;
    downloadSong(song);
  };

  const contextMenuContent = (
    <ContextMenuContent>
      <ContextMenuItem onClick={handlePlayNext}>
        <ListStart className="h-4 w-4 mr-2" />
        Play Next
      </ContextMenuItem>
      <ContextMenuItem onClick={handleAddToQueue}>
        <ListPlus className="h-4 w-4 mr-2" />
        Add to Queue
      </ContextMenuItem>
      <ContextMenuItem onClick={handleDownload}>
        <Download className="h-4 w-4 mr-2" />
        Download
      </ContextMenuItem>
    </ContextMenuContent>
  );

  if (variant === 'compact') {
    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index ? index * 0.05 : 0 }}
            onClick={handleCardClick}
            className={cn(
              "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all",
              "hover:bg-secondary/50",
              isCurrentSong && "bg-secondary"
            )}
          >
            <div className="relative h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 group">
              {song.cover_art_url ? (
                <img 
                  src={song.cover_art_url} 
                  alt={song.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-secondary flex items-center justify-center">
                  <Music className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <button 
                onClick={handlePlay}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {isCurrentSong && isPlaying ? (
                  <Pause className="h-5 w-5 text-white fill-white" />
                ) : (
                  <Play className="h-5 w-5 text-white fill-white" />
                )}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{song.title}</p>
              {showArtist && (
                <p className="text-xs text-muted-foreground truncate">
                  {song.artist?.display_name || song.artist?.username}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {song.play_count?.toLocaleString()} plays
            </span>
          </motion.div>
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>
      </>
    );
  }

  if (variant === 'horizontal') {
    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index ? index * 0.05 : 0 }}
            onClick={handleCardClick}
            className="flex-shrink-0 w-36 cursor-pointer group"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
              {song.cover_art_url ? (
                <img 
                  src={song.cover_art_url} 
                  alt={song.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Music className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <button 
                onClick={handlePlay}
                className={cn(
                  "absolute bottom-2 right-2 h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-lg",
                  "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200",
                  isCurrentSong && "opacity-100 translate-y-0"
                )}
              >
                {isCurrentSong && isPlaying ? (
                  <Pause className="h-5 w-5 text-white fill-white" />
                ) : (
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                )}
              </button>
            </div>
            <p className="text-sm font-medium truncate">{song.title}</p>
            {showArtist && (
              <p className="text-xs text-muted-foreground truncate">
                {song.artist?.display_name || song.artist?.username}
              </p>
            )}
          </motion.div>
          </ContextMenuTrigger>
          {contextMenuContent}
        </ContextMenu>
      </>
    );
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index ? index * 0.05 : 0 }}
          onClick={handleCardClick}
          className="glass-card p-4 cursor-pointer card-hover"
        >
          <div className="relative aspect-square rounded-xl overflow-hidden mb-3 group">
            {song.cover_art_url ? (
              <img 
                src={song.cover_art_url} 
                alt={song.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Music className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <button 
              onClick={handlePlay}
              className={cn(
                "absolute bottom-3 right-3 h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg",
                "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200",
                isCurrentSong && "opacity-100 translate-y-0"
              )}
            >
              {isCurrentSong && isPlaying ? (
                <Pause className="h-6 w-6 text-white fill-white" />
              ) : (
                <Play className="h-6 w-6 text-white fill-white ml-0.5" />
              )}
            </button>
          </div>
          <h3 className="font-semibold truncate">{song.title}</h3>
          {showArtist && (
            <p className="text-sm text-muted-foreground truncate">
              {song.artist?.display_name || song.artist?.username}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{song.play_count?.toLocaleString()} plays</span>
            {song.genre && <span>• {song.genre.name}</span>}
          </div>
        </motion.div>
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>
    </>
  );
});
