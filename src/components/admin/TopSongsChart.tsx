import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trophy, Play, Download } from 'lucide-react';
import { useTopSongs } from '@/hooks/useTopSongs';
import { Skeleton } from '@/components/ui/skeleton';

const RANK_COLORS = [
  'hsl(45, 100%, 50%)',   // Gold color
  'hsl(0, 0%, 75%)',      // Silver color
  'hsl(30, 50%, 45%)',    // Bronze color
  'hsl(var(--primary))',
  'hsl(var(--primary))',
  'hsl(var(--primary))',
  'hsl(var(--primary))',
  'hsl(var(--primary))',
  'hsl(var(--primary))',
  'hsl(var(--primary))',
];

export function TopSongsChart() {
  const { data: songs, isLoading, error } = useTopSongs(10);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !songs) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load top songs...
        </CardContent>
      </Card>
    );
  }

  const maxPlays = songs[0]?.playCount || 1;
  const chartData = songs.map((song, index) => ({
    ...song,
    rank: index + 1,
    percentage: (song.playCount / maxPlays) * 100,
  }));

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Songs Leaderboard
        </CardTitle>
        <CardDescription>Most played tracks on the platform</CardDescription>
      </CardHeader>
      <CardContent>
        {songs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No songs data available
          </div>
        ) : (
          <>
            {/* Leaderboard List */}
            <div className="space-y-2 mb-6">
              {chartData.slice(0, 5).map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {/* Rank Badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      song.rank === 1
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : song.rank === 2
                        ? 'bg-gray-400/20 text-gray-400'
                        : song.rank === 3
                        ? 'bg-amber-700/20 text-amber-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {song.rank}
                  </div>

                  {/* Song Cover */}
                  <img
                    src={song.coverArtUrl || '/placeholder.svg'}
                    alt={song.title}
                    className="w-10 h-10 rounded object-cover"
                  />

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artistName}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-primary">
                      <Play className="h-3 w-3" />
                      <span className="font-medium">{song.playCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Download className="h-3 w-3" />
                      <span>{song.downloadCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bar Chart for Top 10 */}
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="rank"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={25}
                    tickFormatter={(value) => `#${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toLocaleString()} plays`,
                      props.payload.title,
                    ]}
                    labelFormatter={(label) => `Rank #${label}`}
                  />
                  <Bar dataKey="playCount" radius={[0, 4, 4, 0]} name="Plays">
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={RANK_COLORS[index] || 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
