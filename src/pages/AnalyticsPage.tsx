import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Music, Users, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useArtistAnalytics } from '@/hooks/useAnalytics';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data, isLoading, error, refetch } = useArtistAnalytics(profile?.id);

  useEffect(() => {
    if (!profile || profile.user_type !== 'artist') {
      navigate('/');
    }
  }, [profile, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Failed to load analytics</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
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
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold">{data?.totalPlays.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Plays</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Music className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold">{data?.totalLikes.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Likes</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-accent/20">
              <Users className="h-5 w-5 text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold">{data?.totalFollowers.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Followers</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Music className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl font-bold">{data?.songsCount}</p>
          <p className="text-sm text-muted-foreground">Songs</p>
        </div>
      </div>

      {/* Top Songs */}
      <section>
        <h2 className="text-lg font-bold mb-4">Top Performing Songs</h2>
        <div className="space-y-3">
          {data?.topSongs.map((song, index) => (
            <div 
              key={song.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-secondary cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => navigate(`/analytics/song/${song.id}`)}
            >
              <span className="text-lg font-bold text-muted-foreground w-6">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{song.title}</p>
                <p className="text-sm text-muted-foreground">
                  {song.plays.toLocaleString()} plays
                </p>
              </div>
              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full gradient-primary"
                  style={{ 
                    width: `${(song.plays / (data.topSongs[0]?.plays || 1)) * 100}%` 
                  }}
                />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
          {data?.topSongs.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">
              No songs data yet
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
