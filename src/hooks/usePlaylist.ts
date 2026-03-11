import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Playlist, Song } from '@/types/database';

export function usePlaylistById(playlistId: string | undefined) {
  return useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      if (!playlistId) return null;
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', playlistId)
        .maybeSingle();
      if (error) throw error;
      return data as Playlist | null;
    },
    enabled: !!playlistId,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePlaylistSongs(playlistId: string | undefined) {
  return useQuery({
    queryKey: ['playlist', playlistId, 'songs'],
    queryFn: async () => {
      if (!playlistId) return [];
      const { data, error } = await supabase
        .from('playlist_songs')
        .select(`position, song:songs(*, artist:profiles!songs_artist_id_fkey(display_name, username, avatar_url))`)
        .eq('playlist_id', playlistId)
        .order('position');
      if (error) throw error;
      return (data?.map((item: any) => item.song).filter(Boolean) ?? []) as Song[];
    },
    enabled: !!playlistId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useUpdatePlaylist(playlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { title?: string; description?: string }) => {
      const { error } = await supabase
        .from('playlists')
        .update(updates)
        .eq('id', playlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['library', 'playlists'] });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistId: string) => {
      const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
      if (error) throw error;
    },
    onSuccess: (_, playlistId) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['library', 'playlists'] });
    },
  });
}

export function useRemoveSongFromPlaylist(playlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (songId: string) => {
      const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('song_id', songId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId, 'songs'] });
    },
  });
}

export function useAddSongToPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: string; songId: string }) => {
      // Get current max position
      const { data: existing } = await supabase
        .from('playlist_songs')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = (existing?.[0]?.position ?? -1) + 1;

      const { error } = await supabase
        .from('playlist_songs')
        .insert({ playlist_id: playlistId, song_id: songId, position: nextPosition });
      if (error) throw error;
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId, 'songs'] });
    },
  });
}
