import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Song, SongMood } from '@/types/database';
import { STALE_TIME } from '@/lib/queryClient';

const SONG_SELECT = `*, artist:profiles!songs_artist_id_fkey(*), genre:genres(*)`;

export function useTrendingSongs(limit = 50) {
  return useQuery({
    queryKey: ['songs', 'trending', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select(SONG_SELECT)
        .eq('is_published', true)
        .eq('is_approved', true)
        .order('play_count', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Song[];
    },
    staleTime: STALE_TIME.MEDIUM,
  });
}

export function useNewReleases(limit = 50) {
  return useQuery({
    queryKey: ['songs', 'new-releases', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select(SONG_SELECT)
        .eq('is_published', true)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Song[];
    },
    staleTime: STALE_TIME.MEDIUM,
  });
}

export function useSongsByGenre(genreId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['songs', 'genre', genreId],
    queryFn: async () => {
      if (!genreId) return [];
      const { data, error } = await supabase
        .from('songs')
        .select(SONG_SELECT)
        .eq('genre_id', genreId)
        .eq('is_published', true)
        .eq('is_approved', true)
        .order('play_count', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Song[];
    },
    enabled: !!genreId && enabled,
    staleTime: STALE_TIME.MEDIUM,
  });
}

export function useSongsByMood(mood: SongMood | undefined, enabled = true) {
  return useQuery({
    queryKey: ['songs', 'mood', mood],
    queryFn: async () => {
      if (!mood) return [];
      const { data, error } = await supabase
        .from('songs')
        .select(SONG_SELECT)
        .eq('mood', mood)
        .eq('is_published', true)
        .eq('is_approved', true)
        .order('play_count', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Song[];
    },
    enabled: !!mood && enabled,
    staleTime: STALE_TIME.MEDIUM,
  });
}

export function useSearchSongs(query: string, enabled = true) {
  return useQuery({
    queryKey: ['songs', 'search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data, error } = await supabase
        .from('songs')
        .select(SONG_SELECT)
        .eq('is_published', true)
        .eq('is_approved', true)
        .ilike('title', `%${query}%`)
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Song[];
    },
    enabled: enabled && query.length >= 2,
    staleTime: STALE_TIME.SHORT,
  });
}

// Prefetch songs for smoother navigation
export function usePrefetchSongs() {
  const queryClient = useQueryClient();

  return {
    prefetchTrending: () => {
      queryClient.prefetchQuery({
        queryKey: ['songs', 'trending', 50],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('songs')
            .select(SONG_SELECT)
            .eq('is_published', true)
            .eq('is_approved', true)
            .order('play_count', { ascending: false })
            .limit(50);
          if (error) throw error;
          return (data ?? []) as Song[];
        },
        staleTime: STALE_TIME.MEDIUM,
      });
    },
    prefetchNewReleases: () => {
      queryClient.prefetchQuery({
        queryKey: ['songs', 'new-releases', 50],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('songs')
            .select(SONG_SELECT)
            .eq('is_published', true)
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          return (data ?? []) as Song[];
        },
        staleTime: STALE_TIME.MEDIUM,
      });
    },
  };
}
