import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Song, Playlist } from '@/types/database';
import { STALE_TIME } from '@/lib/queryClient';

export function useLikedSongs(profileId: string | undefined) {
  return useQuery({
    queryKey: ['library', 'liked', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('likes')
        .select(`
          song:songs(
            *,
            artist:profiles!songs_artist_id_fkey(*),
            genre:genres(*)
          )
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data?.map((like: any) => like.song).filter(Boolean) ?? []) as Song[];
    },
    enabled: !!profileId,
    staleTime: STALE_TIME.SHORT,
  });
}

export function useUserPlaylists(profileId: string | undefined) {
  return useQuery({
    queryKey: ['library', 'playlists', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('owner_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Playlist[];
    },
    enabled: !!profileId,
    staleTime: STALE_TIME.SHORT,
  });
}

export function usePlayHistory(profileId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['library', 'history', profileId, limit],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('play_history')
        .select(`
          song:songs(
            *,
            artist:profiles!songs_artist_id_fkey(*),
            genre:genres(*)
          )
        `)
        .eq('user_id', profileId)
        .order('played_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const songs = data?.map((item: any) => item.song).filter(Boolean) ?? [];
      // Remove duplicates while preserving order
      const unique = songs.filter(
        (song: Song, index: number, self: Song[]) =>
          index === self.findIndex((s) => s.id === song.id)
      );
      return unique as Song[];
    },
    enabled: !!profileId,
    staleTime: STALE_TIME.SHORT,
  });
}

export function useRecentlyPlayed(profileId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['library', 'recently-played', profileId, limit],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('play_history')
        .select(`
          song_id,
          played_at,
          songs!play_history_song_id_fkey(*, artist:profiles!songs_artist_id_fkey(*), genre:genres(*))
        `)
        .eq('user_id', profileId)
        .order('played_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const uniqueSongs: Song[] = [];
      const seenIds = new Set<string>();

      for (const item of (data as any[]) ?? []) {
        if (item?.songs && !seenIds.has(item.song_id)) {
          seenIds.add(item.song_id);
          uniqueSongs.push(item.songs as Song);
          if (uniqueSongs.length >= limit) break;
        }
      }
      return uniqueSongs;
    },
    enabled: !!profileId,
    staleTime: STALE_TIME.SHORT,
  });
}
