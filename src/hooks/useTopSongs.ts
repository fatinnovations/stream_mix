import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopSong {
  id: string;
  title: string;
  playCount: number;
  downloadCount: number;
  coverArtUrl: string | null;
  artistName: string;
  artistAvatar: string | null;
}

export function useTopSongs(limit: number = 10) {
  return useQuery({
    queryKey: ['admin', 'top-songs', limit],
    queryFn: async (): Promise<TopSong[]> => {
      const { data: songs, error } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          play_count,
          download_count,
          cover_art_url,
          artist:profiles!songs_artist_id_fkey (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('is_approved', true)
        .order('play_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (songs || []).map((song) => ({
        id: song.id,
        title: song.title,
        playCount: song.play_count || 0,
        downloadCount: song.download_count || 0,
        coverArtUrl: song.cover_art_url,
        artistName: song.artist?.display_name || song.artist?.username || 'Unknown',
        artistAvatar: song.artist?.avatar_url || null,
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
