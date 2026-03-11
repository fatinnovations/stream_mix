import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Song } from '@/types/database';
import { toast } from 'sonner';

export function useDownloadSong() {
  const [downloading, setDownloading] = useState(false);

  const downloadSong = async (song: Song) => {
    if (downloading) return;
    setDownloading(true);

    try {
      // Fetch the audio file as a blob
      const response = await fetch(song.audio_url);
      if (!response.ok) throw new Error('Failed to fetch audio');
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Build filename from song title and artist
      const artistName = song.artist?.display_name || song.artist?.username || 'Unknown';
      const ext = song.audio_url.split('.').pop()?.split('?')[0] || 'mp3';
      a.download = `${song.title} - ${artistName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Increment download count
      await supabase
        .from('songs')
        .update({ download_count: (song.download_count || 0) + 1 })
        .eq('id', song.id);

      toast.success(`"${song.title}" downloaded!`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download song');
    } finally {
      setDownloading(false);
    }
  };

  return { downloadSong, downloading };
}
