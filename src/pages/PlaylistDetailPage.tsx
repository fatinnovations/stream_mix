import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, MoreVertical, Pencil, Trash2, Plus, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { toast } from 'sonner';
import { usePlaylistById, usePlaylistSongs, useUpdatePlaylist, useDeletePlaylist, useRemoveSongFromPlaylist } from '@/hooks/usePlaylist';

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playSong, setQueue, currentSong, isPlaying, togglePlay } = usePlayer();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: playlist, isLoading } = usePlaylistById(id);
  const { data: songs = [] } = usePlaylistSongs(id);

  const updateMutation = useUpdatePlaylist(id ?? '');
  const deleteMutation = useDeletePlaylist();
  const removeSongMutation = useRemoveSongFromPlaylist(id ?? '');

  const isOwner = playlist?.owner_id === profile?.id;

  useEffect(() => {
    if (playlist) {
      setEditTitle(playlist.title);
      setEditDescription(playlist.description || '');
    }
  }, [playlist]);

  useEffect(() => {
    if (!isLoading && !playlist && id) {
      toast.error('Playlist not found');
      navigate('/library');
    }
  }, [isLoading, playlist, id, navigate]);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };

  const handlePlaySong = (song: typeof songs[0], index: number) => {
    setQueue(songs.slice(index));
    playSong(song);
  };

  const handleRemoveSong = async (songId: string) => {
    try {
      await removeSongMutation.mutateAsync(songId);
      toast.success('Song removed');
    } catch {
      toast.error('Failed to remove song');
    }
  };

  const handleUpdatePlaylist = async () => {
    try {
      await updateMutation.mutateAsync({ title: editTitle, description: editDescription });
      setEditDialogOpen(false);
      toast.success('Playlist updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDeletePlaylist = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Playlist deleted');
      navigate('/library');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!playlist) return null;

  return (
    <div className="p-4 pb-32">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1">{playlist.title}</h1>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeletePlaylist} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Music className="h-10 w-10 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{playlist.title}</h2>
            {playlist.description && (
              <p className="text-sm text-muted-foreground mt-1">{playlist.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">{songs.length} songs</p>
          </div>
        </div>
        {songs.length > 0 && (
          <Button onClick={handlePlayAll} className="w-full mt-4 gradient-primary">
            <Play className="h-4 w-4 mr-2" />
            Play All
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {songs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Empty playlist</p>
            <Button variant="outline" onClick={() => navigate('/discover')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Songs
            </Button>
          </div>
        ) : (
          songs.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <span className="w-6 text-sm text-muted-foreground">{index + 1}</span>
              <img
                src={song.cover_art_url || '/placeholder.svg'}
                alt={song.title}
                className="w-12 h-12 rounded-lg object-cover cursor-pointer"
                onClick={() => handlePlaySong(song, index)}
              />
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => handlePlaySong(song, index)}
              >
                <p className={`font-medium truncate ${currentSong?.id === song.id ? 'text-primary' : ''}`}>
                  {song.title}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {song.artist?.display_name || 'Unknown'}
                </p>
              </div>
              {currentSong?.id === song.id && (
                <Button variant="ghost" size="icon" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemoveSong(song.id)}
                  disabled={removeSongMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePlaylist} disabled={updateMutation.isPending}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
