import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Heart, Users, MapPin, Clock, TrendingUp, Calendar, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Song } from '@/types/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface SongAnalytics {
  song: Song | null;
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  playsByCountry: { country: string; plays: number }[];
  playsByCity: { city: string; plays: number }[];
  recentPlays: { date: string; plays: number }[];
  averagePlayDuration: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function SongAnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [data, setData] = useState<SongAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !id) {
      navigate('/');
      return;
    }
    fetchSongAnalytics();
  }, [profile, id]);

  const fetchSongAnalytics = async () => {
    if (!profile || !id) return;
    setLoading(true);

    try {
      // Fetch song
      const { data: song } = await supabase
        .from('songs')
        .select('*, genre:genres(*)')
        .eq('id', id)
        .eq('artist_id', profile.id)
        .single();

      if (!song) {
        navigate('/analytics');
        return;
      }

      // Fetch play history
      const { data: playHistory } = await supabase
        .from('play_history')
        .select('*')
        .eq('song_id', id);

      // Fetch likes count
      const { count: likesCount } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('song_id', id);

      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('song_id', id);

      // Process play data by country
      const countryMap = new Map<string, number>();
      const cityMap = new Map<string, number>();
      let totalDuration = 0;
      let durationCount = 0;

      playHistory?.forEach(play => {
        if (play.country) {
          countryMap.set(play.country, (countryMap.get(play.country) || 0) + 1);
        }
        if (play.city) {
          cityMap.set(play.city, (cityMap.get(play.city) || 0) + 1);
        }
        if (play.duration_played) {
          totalDuration += play.duration_played;
          durationCount++;
        }
      });

      const playsByCountry = Array.from(countryMap.entries())
        .map(([country, plays]) => ({ country, plays }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 6);

      const playsByCity = Array.from(cityMap.entries())
        .map(([city, plays]) => ({ city, plays }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 6);

      // Process plays by date (last 7 days)
      const dateMap = new Map<string, number>();
      const last7Days = [...Array(7)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      last7Days.forEach(date => dateMap.set(date, 0));

      playHistory?.forEach(play => {
        const date = play.played_at.split('T')[0];
        if (dateMap.has(date)) {
          dateMap.set(date, (dateMap.get(date) || 0) + 1);
        }
      });

      const recentPlays = Array.from(dateMap.entries()).map(([date, plays]) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        plays
      }));

      setData({
        song: song as Song,
        totalPlays: song.play_count || 0,
        totalLikes: likesCount || 0,
        totalComments: commentsCount || 0,
        playsByCountry,
        playsByCity,
        recentPlays,
        averagePlayDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!data?.song) return null;

  return (
    <div className="py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{data.song.title}</h1>
          <p className="text-sm text-muted-foreground">Song Analytics</p>
        </div>
      </div>

      {/* Song Preview */}
      <div className="glass-card p-4 flex items-center gap-4">
        <img
          src={data.song.cover_art_url || '/placeholder.svg'}
          alt={data.song.title}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{data.song.title}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {data.song.genre?.name || 'Unknown'} • {data.song.mood || 'No mood'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Play className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Total Plays</span>
          </div>
          <p className="text-2xl font-bold">{data.totalPlays.toLocaleString()}</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-red-500" />
            <span className="text-sm text-muted-foreground">Total Likes</span>
          </div>
          <p className="text-2xl font-bold">{data.totalLikes.toLocaleString()}</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">Comments</span>
          </div>
          <p className="text-2xl font-bold">{data.totalComments.toLocaleString()}</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Avg. Listen</span>
          </div>
          <p className="text-2xl font-bold">
            {Math.floor(data.averagePlayDuration / 60)}:{String(data.averagePlayDuration % 60).padStart(2, '0')}
          </p>
        </div>
      </div>

      {/* Plays Over Time Chart */}
      <section className="glass-card p-4">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Plays This Week
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.recentPlays}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="plays" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Demographics */}
      <section className="glass-card p-4">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent" />
          Listener Demographics
        </h2>
        
        {data.playsByCountry.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Top Countries</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.playsByCountry} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="country" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="plays" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            No demographic data available yet
          </p>
        )}
      </section>

      {/* Top Cities */}
      {data.playsByCity.length > 0 && (
        <section className="glass-card p-4">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            Top Cities
          </h2>
          <div className="space-y-3">
            {data.playsByCity.map((item, index) => (
              <div key={item.city} className="flex items-center gap-3">
                <span className="w-6 text-muted-foreground">{index + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.city}</p>
                  <div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full gradient-primary"
                      style={{ width: `${(item.plays / data.playsByCity[0].plays) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{item.plays}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Engagement Rate */}
      <section className="glass-card p-4">
        <h2 className="text-lg font-bold mb-4">Engagement Rate</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-secondary rounded-xl">
            <p className="text-3xl font-bold text-primary">
              {data.totalPlays > 0 ? ((data.totalLikes / data.totalPlays) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">Like Rate</p>
          </div>
          <div className="text-center p-4 bg-secondary rounded-xl">
            <p className="text-3xl font-bold text-accent">
              {data.totalPlays > 0 ? ((data.totalComments / data.totalPlays) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">Comment Rate</p>
          </div>
        </div>
      </section>
    </div>
  );
}
