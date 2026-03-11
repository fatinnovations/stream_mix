import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Song } from '@/types/database';

export function useArtistById(artistId: string | undefined) {
  return useQuery({
    queryKey: ['artist', artistId],
    queryFn: async () => {
      if (!artistId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', artistId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!artistId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useArtistSongs(artistId: string | undefined) {
  return useQuery({
    queryKey: ['artist', artistId, 'songs'],
    queryFn: async () => {
      if (!artistId) return [];
      const { data, error } = await supabase
        .from('songs')
        .select(`*, artist:profiles!songs_artist_id_fkey(*), genre:genres(*)`)
        .eq('artist_id', artistId)
        .eq('is_published', true)
        .eq('is_approved', true)
        .order('play_count', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Song[];
    },
    enabled: !!artistId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useArtistFollowersCount(artistId: string | undefined) {
  return useQuery({
    queryKey: ['artist', artistId, 'followers-count'],
    queryFn: async () => {
      if (!artistId) return 0;
      const { count, error } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', artistId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!artistId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useIsFollowing(artistId: string | undefined, followerId: string | undefined) {
  return useQuery({
    queryKey: ['artist', artistId, 'is-following', followerId],
    queryFn: async () => {
      if (!artistId || !followerId) return false;
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', artistId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!artistId && !!followerId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useToggleFollow(artistId: string, followerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isCurrentlyFollowing: boolean) => {
      if (isCurrentlyFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', artistId);
        if (error) throw error;
        return false;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: followerId, following_id: artistId });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist', artistId, 'followers-count'] });
      queryClient.invalidateQueries({ queryKey: ['artist', artistId, 'is-following', followerId] });
    },
  });
}
