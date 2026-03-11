import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreatePlaylistModalProps {
  onPlaylistCreated?: (playlistId: string) => void;
  trigger?: React.ReactNode;
}

export default function CreatePlaylistModal({ onPlaylistCreated, trigger }: CreatePlaylistModalProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!profile) {
      toast.error('Please sign in to create a playlist');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a playlist title');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        owner_id: profile.id,
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error('Failed to create playlist');
    } else {
      toast.success('Playlist created!');
      setOpen(false);
      setTitle('');
      setDescription('');
      setIsPublic(true);
      onPlaylistCreated?.(data.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Playlist
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Playlist"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this playlist about?"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Public playlist</p>
              <p className="text-sm text-muted-foreground">Anyone can view this playlist</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !title.trim()}>
              {loading ? 'Creating...' : 'Create Playlist'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
