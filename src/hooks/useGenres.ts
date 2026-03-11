import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Genre } from '@/types/database';
import { STALE_TIME } from '@/lib/queryClient';

export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Genre[];
    },
    staleTime: STALE_TIME.LONG, // Genres rarely change
  });
}

export function useGenreBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['genres', 'slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as Genre | null;
    },
    enabled: !!slug,
    staleTime: STALE_TIME.LONG,
  });
}
