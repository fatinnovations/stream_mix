import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SongCard } from '@/components/songs/SongCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLikedSongs } from '@/hooks/useLibrary';

export default function LikedSongsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { setQueue } = usePlayer();

  const {
    data: songs = [],
    isLoading,
    isError,
    refetch,
  } = useLikedSongs(profile?.id);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs, 0);
    }
  };

  return (
    <div className="pb-4">
      <header className="flex items-center gap-4 py-4 sticky top-0 z-30 bg-background/80 backdrop-blur-lg">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <h1 className="text-xl font-bold">Liked Songs</h1>
          </div>
          <p className="text-sm text-muted-foreground">{songs.length} songs</p>
        </div>
        <Button onClick={handlePlayAll} className="gradient-primary" disabled={songs.length === 0}>
          <Play className="h-4 w-4 mr-2 fill-current" />
          Play All
        </Button>
      </header>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load liked songs.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : songs.length > 0 ? (
        <div className="space-y-2">
          {songs.map((song, index) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <SongCard song={song} variant="compact" index={index} songs={songs} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No liked songs yet</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/discover')}>
            Discover Music
          </Button>
        </div>
      )}
    </div>
  );
}
