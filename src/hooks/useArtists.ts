import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { STALE_TIME } from '@/lib/queryClient';

export function useTopArtists(limit = 100) {
  return useQuery({
    queryKey: ['artists', 'top', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'artist')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    staleTime: STALE_TIME.LONG,
  });
}

export function useSearchArtists(query: string, enabled = true) {
  return useQuery({
    queryKey: ['artists', 'search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'artist')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    enabled: enabled && query.length >= 2,
    staleTime: STALE_TIME.SHORT,
  });
}

export function useAllArtists(limit = 200) {
  return useQuery({
    queryKey: ['artists', 'all', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'artist')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    staleTime: STALE_TIME.LONG,
  });
}

// Prefetch artists for smoother navigation
export function usePrefetchArtists() {
  const queryClient = useQueryClient();

  return {
    prefetchTop: () => {
      queryClient.prefetchQuery({
        queryKey: ['artists', 'top', 100],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_type', 'artist')
            .order('created_at', { ascending: false })
            .limit(100);
          if (error) throw error;
          return (data ?? []) as Profile[];
        },
        staleTime: STALE_TIME.LONG,
      });
    },
  };
}
