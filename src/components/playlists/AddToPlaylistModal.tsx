import { useState } from 'react';
import { Plus, Check, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CreatePlaylistModal from './CreatePlaylistModal';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { useUserPlaylists } from '@/hooks/useLibrary';
import { useAddSongToPlaylist, useRemoveSongFromPlaylist } from '@/hooks/usePlaylist';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AddToPlaylistModalProps {
  songId: string;
  trigger?: React.ReactNode;
}

export default function AddToPlaylistModal({ songId, trigger }: AddToPlaylistModalProps) {
  const { profile } = useAuth();
  const { checkAuth } = useLoginPrompt();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: playlists = [], isLoading: loadingPlaylists } = useUserPlaylists(open ? profile?.id : undefined);

  const { data: songPlaylists = [] } = useQuery({
    queryKey: ['song', songId, 'in-playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select('playlist_id')
        .eq('song_id', songId);
      if (error) throw error;
      return (data ?? []).map((sp) => sp.playlist_id);
    },
    enabled: open && !!songId,
    staleTime: 1000 * 60 * 1,
  });

  const addSongMutation = useAddSongToPlaylist();
  const removeSongMutation = useRemoveSongFromPlaylist('');

  const handleTogglePlaylist = async (playlistId: string) => {
    const isInPlaylist = songPlaylists.includes(playlistId);

    try {
      if (isInPlaylist) {
        const { error } = await supabase
          .from('playlist_songs')
          .delete()
          .eq('playlist_id', playlistId)
          .eq('song_id', songId);
        if (error) throw error;
        toast.success('Removed from playlist');
      } else {
        await addSongMutation.mutateAsync({ playlistId, songId });
        toast.success('Added to playlist');
      }
      queryClient.invalidateQueries({ queryKey: ['song', songId, 'in-playlists'] });
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('Song already in playlist');
      } else {
        toast.error(isInPlaylist ? 'Failed to remove from playlist' : 'Failed to add to playlist');
      }
    }
  };

  const handlePlaylistCreated = (playlistId: string) => {
    queryClient.invalidateQueries({ queryKey: ['library', 'playlists', profile?.id] });
    handleTogglePlaylist(playlistId);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !checkAuth('add songs to playlists')) return;
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add to Playlist
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <CreatePlaylistModal
            onPlaylistCreated={handlePlaylistCreated}
            trigger={
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Playlist
              </Button>
            }
          />

          {loadingPlaylists ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : playlists.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No playlists yet. Create one above!
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {playlists.map((playlist) => {
                const isInPlaylist = songPlaylists.includes(playlist.id);
                return (
                  <button
                    key={playlist.id}
                    onClick={() => handleTogglePlaylist(playlist.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isInPlaylist ? 'bg-primary/20' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                      <Music className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{playlist.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {playlist.is_public ? 'Public' : 'Private'}
                      </p>
                    </div>
                    {isInPlaylist && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
