import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Smile, CloudSun, Dumbbell, Heart, PartyPopper, Frown, HeartHandshake, Zap, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SongMood } from '@/types/database';
import { SongCard } from '@/components/songs/SongCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { useSongsByMood } from '@/hooks/useSongs';

const MOOD_INFO: Record<SongMood, { icon: LucideIcon; label: string; color: string }> = {
  happy: { icon: Smile, label: 'Happy Vibes', color: 'from-yellow-500 to-orange-500' },
  chill: { icon: CloudSun, label: 'Chill Mode', color: 'from-blue-500 to-cyan-500' },
  workout: { icon: Dumbbell, label: 'Workout', color: 'from-red-500 to-pink-500' },
  gospel: { icon: Heart, label: 'Gospel', color: 'from-purple-500 to-indigo-500' },
  party: { icon: PartyPopper, label: 'Party', color: 'from-pink-500 to-rose-500' },
  sad: { icon: Frown, label: 'Sad', color: 'from-slate-500 to-gray-500' },
  romantic: { icon: HeartHandshake, label: 'Romantic', color: 'from-rose-500 to-red-500' },
  energetic: { icon: Zap, label: 'Energetic', color: 'from-amber-500 to-yellow-500' },
};

export default function MoodPage() {
  const { mood } = useParams<{ mood: string }>();
  const navigate = useNavigate();
  const { playSong, setQueue } = usePlayer();

  const moodInfo = MOOD_INFO[mood as SongMood];
  const { data: songs = [], isLoading } = useSongsByMood(mood as SongMood);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header with gradient */}
      <div className={`-mx-4 -mt-4 mb-6 p-6 bg-gradient-to-br ${moodInfo?.color || 'from-primary to-accent'}`}>
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            {moodInfo && <moodInfo.icon className="h-10 w-10 text-white mb-2" />}
            <h1 className="text-2xl font-bold text-white">{moodInfo?.label}</h1>
            <p className="text-white/80">{songs.length} songs</p>
          </div>
          {songs.length > 0 && (
            <Button 
              variant="secondary" 
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={handlePlayAll}
            >
              <Play className="h-4 w-4 fill-white" />
              Play All
            </Button>
          )}
        </div>
      </div>

      {/* Songs */}
      <div className="space-y-2">
        {songs.length > 0 ? (
          songs.map((song, index) => (
            <SongCard key={song.id} song={song} variant="compact" index={index} />
          ))
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            No songs with this mood yet
          </p>
        )}
      </div>
    </div>
  );
}
