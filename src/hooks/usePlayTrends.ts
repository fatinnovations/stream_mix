import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

export interface DailyPlayData {
  date: string;
  plays: number;
}

export interface PlayTrendsData {
  daily: DailyPlayData[];
  weekly: DailyPlayData[];
  totalPlaysLast7Days: number;
  totalPlaysLast30Days: number;
  averageDailyPlays: number;
}

export function usePlayTrends() {
  return useQuery({
    queryKey: ['admin', 'play-trends'],
    queryFn: async (): Promise<PlayTrendsData> => {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      
      // Fetch play history for the last 30 days
      const { data: playHistory, error } = await supabase
        .from('play_history')
        .select('played_at')
        .gte('played_at', thirtyDaysAgo.toISOString())
        .order('played_at', { ascending: true });

      if (error) throw error;

      // Generate all dates in the range
      const allDates = eachDayOfInterval({
        start: thirtyDaysAgo,
        end: now,
      });

      // Count plays per day
      const playsByDay = new Map<string, number>();
      allDates.forEach(date => {
        playsByDay.set(format(date, 'yyyy-MM-dd'), 0);
      });

      (playHistory || []).forEach((play) => {
        const dateKey = format(new Date(play.played_at), 'yyyy-MM-dd');
        playsByDay.set(dateKey, (playsByDay.get(dateKey) || 0) + 1);
      });

      // Convert to array for daily data (last 14 days for chart)
      const daily: DailyPlayData[] = [];
      const last14Days = eachDayOfInterval({
        start: subDays(now, 13),
        end: now,
      });
      
      last14Days.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        daily.push({
          date: format(date, 'MMM dd'),
          plays: playsByDay.get(dateKey) || 0,
        });
      });

      // Group by week (last 4 weeks)
      const weekly: DailyPlayData[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = subDays(now, (i + 1) * 7);
        const weekEnd = subDays(now, i * 7);
        let weekPlays = 0;
        
        eachDayOfInterval({ start: weekStart, end: weekEnd }).forEach(date => {
          const dateKey = format(date, 'yyyy-MM-dd');
          weekPlays += playsByDay.get(dateKey) || 0;
        });
        
        weekly.push({
          date: `Week ${4 - i}`,
          plays: weekPlays,
        });
      }

      // Calculate totals
      const sevenDaysAgo = subDays(now, 7);
      let totalPlaysLast7Days = 0;
      let totalPlaysLast30Days = 0;

      playsByDay.forEach((count, dateKey) => {
        totalPlaysLast30Days += count;
        if (new Date(dateKey) >= sevenDaysAgo) {
          totalPlaysLast7Days += count;
        }
      });

      const averageDailyPlays = Math.round(totalPlaysLast30Days / 30);

      return {
        daily,
        weekly,
        totalPlaysLast7Days,
        totalPlaysLast30Days,
        averageDailyPlays,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
