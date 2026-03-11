import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Song } from '@/types/database';

export function useMyArtistSongs(profileId: string | undefined) {
  return useQuery({
    queryKey: ['profile', profileId, 'my-songs'],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('songs')
        .select(`*, artist:profiles!songs_artist_id_fkey(*), genre:genres(*)`)
        .eq('artist_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Song[];
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useProfileStats(profileId: string | undefined) {
  return useQuery({
    queryKey: ['profile', profileId, 'stats'],
    queryFn: async () => {
      if (!profileId) return { songs: 0, followers: 0, following: 0, likes: 0 };

      const [songsCount, followersCount, followingCount, likesCount] = await Promise.all([
        supabase.from('songs').select('id', { count: 'exact', head: true }).eq('artist_id', profileId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileId),
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', profileId),
      ]);

      return {
        songs: songsCount.count ?? 0,
        followers: followersCount.count ?? 0,
        following: followingCount.count ?? 0,
        likes: likesCount.count ?? 0,
      };
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 2,
  });
}
