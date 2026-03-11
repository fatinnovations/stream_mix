import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsData {
  totalPlays: number;
  totalLikes: number;
  totalFollowers: number;
  songsCount: number;
  recentPlays: { date: string; count: number }[];
  topSongs: { id: string; title: string; plays: number }[];
}

export function useArtistAnalytics(profileId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'artist', profileId],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!profileId) {
        return {
          totalPlays: 0,
          totalLikes: 0,
          totalFollowers: 0,
          songsCount: 0,
          recentPlays: [],
          topSongs: [],
        };
      }

      // Fetch songs with play counts
      const { data: songs } = await supabase
        .from('songs')
        .select('id, title, play_count')
        .eq('artist_id', profileId)
        .order('play_count', { ascending: false });

      const songIds = songs?.map((s) => s.id) || [];
      const totalPlays = songs?.reduce((acc, s) => acc + (s.play_count || 0), 0) || 0;

      // Fetch total likes (only if we have songs)
      let likesCount = 0;
      if (songIds.length > 0) {
        const { count } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .in('song_id', songIds);
        likesCount = count || 0;
      }

      // Fetch followers
      const { count: followersCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', profileId);

      return {
        totalPlays,
        totalLikes: likesCount,
        totalFollowers: followersCount || 0,
        songsCount: songs?.length || 0,
        recentPlays: [],
        topSongs:
          songs?.slice(0, 5).map((s) => ({
            id: s.id,
            title: s.title,
            plays: s.play_count || 0,
          })) || [],
      };
    },
    enabled: !!profileId,
  });
}
