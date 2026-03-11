import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

export interface ManagedArtist extends Profile {
  subscription?: {
    id: string;
    plan: string;
    status: string;
    songs_uploaded: number;
    upload_limit: number;
  };
  songs_count?: number;
  total_plays?: number;
}

export function useManagerData(profileId: string | undefined) {
  return useQuery({
    queryKey: ['manager', 'dashboard', profileId],
    queryFn: async () => {
      if (!profileId) return { managedArtists: [], availableArtists: [] };

      // Fetch artists managed by this manager
      const { data: artistsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('managed_by', profileId)
        .eq('user_type', 'artist');

      const managedArtists: ManagedArtist[] = [];

      if (artistsData) {
        // Fetch subscriptions and stats for each artist
        const artistsWithData = await Promise.all(
          artistsData.map(async (artist) => {
            const [subData, songsCount, playsData] = await Promise.all([
              supabase.from('artist_subscriptions').select('*').eq('artist_id', artist.id).maybeSingle(),
              supabase.from('songs').select('id', { count: 'exact', head: true }).eq('artist_id', artist.id),
              supabase.from('songs').select('play_count').eq('artist_id', artist.id),
            ]);

            const totalPlays = playsData.data?.reduce((sum, song) => sum + (song.play_count || 0), 0) || 0;

            return {
              ...artist,
              subscription: subData.data as any,
              songs_count: songsCount.count || 0,
              total_plays: totalPlays,
            };
          })
        );
        managedArtists.push(...artistsWithData);
      }

      // Fetch all available artists for adding
      const { data: allArtistsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'artist')
        .is('managed_by', null);

      return {
        managedArtists,
        availableArtists: (allArtistsData || []) as Profile[],
      };
    },
    enabled: !!profileId,
  });
}

export function useAddArtistToRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      artistId,
      managerId,
    }: {
      artistId: string;
      managerId: string;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ managed_by: managerId })
        .eq('id', artistId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Artist added to your roster');
      queryClient.invalidateQueries({ queryKey: ['manager', 'dashboard'] });
    },
    onError: () => {
      toast.error('Failed to add artist');
    },
  });
}

export function useRemoveArtistFromRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (artistId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ managed_by: null })
        .eq('id', artistId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Artist removed from your roster');
      queryClient.invalidateQueries({ queryKey: ['manager', 'dashboard'] });
    },
    onError: () => {
      toast.error('Failed to remove artist');
    },
  });
}
