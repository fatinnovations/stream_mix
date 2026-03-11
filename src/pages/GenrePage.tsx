import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SongCard } from '@/components/songs/SongCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { useGenreBySlug } from '@/hooks/useGenres';
import { useSongsByGenre } from '@/hooks/useSongs';

export default function GenrePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { playSong, setQueue } = usePlayer();

  const { data: genre, isLoading: loadingGenre } = useGenreBySlug(slug);
  const { data: songs = [], isLoading: loadingSongs } = useSongsByGenre(genre?.id, !!genre);

  const loading = loadingGenre || loadingSongs;

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {genre?.icon} {genre?.name}
          </h1>
          <p className="text-sm text-muted-foreground">{songs.length} songs</p>
        </div>
        {songs.length > 0 && (
          <Button variant="gradient" size="sm" onClick={handlePlayAll}>
            <Play className="h-4 w-4 fill-white" />
            Play All
          </Button>
        )}
      </div>

      {/* Songs */}
      <div className="space-y-2">
        {songs.length > 0 ? (
          songs.map((song, index) => (
            <SongCard key={song.id} song={song} variant="compact" index={index} />
          ))
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            No songs in this genre yet
          </p>
        )}
      </div>
    </div>
  );
}
