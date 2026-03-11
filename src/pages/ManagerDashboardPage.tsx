import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Music, CreditCard, Plus, Eye, TrendingUp, UserPlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { toast } from 'sonner';
import {
  useManagerData,
  useAddArtistToRoster,
  useRemoveArtistFromRoster,
} from '@/hooks/useManagerData';

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isManager, loading: rolesLoading } = useUserRoles();
  const [addArtistDialogOpen, setAddArtistDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error, refetch } = useManagerData(profile?.id);
  const addArtistMutation = useAddArtistToRoster();
  const removeArtistMutation = useRemoveArtistFromRoster();

  const managedArtists = data?.managedArtists || [];
  const availableArtists = data?.availableArtists || [];

  useEffect(() => {
    if (!user && !rolesLoading) {
      navigate('/auth');
      return;
    }
    
    if (!rolesLoading && !isManager) {
      toast.error('Access denied. Manager privileges required.');
      navigate('/');
    }
  }, [user, isManager, rolesLoading, navigate]);

  const handleAddArtist = (artistId: string) => {
    if (!profile) return;
    addArtistMutation.mutate(
      { artistId, managerId: profile.id },
      { onSuccess: () => setAddArtistDialogOpen(false) }
    );
  };

  const handleRemoveArtist = (artistId: string) => {
    removeArtistMutation.mutate(artistId);
  };

  const filteredArtists = availableArtists.filter(
    (artist) =>
      artist.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSongs = managedArtists.reduce((sum, a) => sum + (a.songs_count || 0), 0);
  const totalPlays = managedArtists.reduce((sum, a) => sum + (a.total_plays || 0), 0);
  const activeSubscriptions = managedArtists.filter((a) => a.subscription?.status === 'active').length;

  if (rolesLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isManager) return null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Failed to load manager data</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-accent/20">
          <Users className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your artists</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-3 sm:p-4 text-center">
          <Users className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{managedArtists.length}</p>
          <p className="text-xs text-muted-foreground">Artists</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <Music className="h-4 w-4 text-accent mx-auto mb-1" />
          <p className="text-xl font-bold">{totalSongs}</p>
          <p className="text-xs text-muted-foreground">Songs</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <TrendingUp className="h-4 w-4 text-green-500 mx-auto mb-1" />
          <p className="text-xl font-bold">{totalPlays.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Plays</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <CreditCard className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
          <p className="text-xl font-bold">{activeSubscriptions}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
      </div>

      {/* Add Artist Button */}
      <Button onClick={() => setAddArtistDialogOpen(true)} className="w-full sm:w-auto mb-6" variant="outline">
        <UserPlus className="h-4 w-4 mr-2" />
        Add Artist to Roster
      </Button>

      {/* Artists List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Artists</h2>
        {managedArtists.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No artists in your roster yet</p>
            <Button onClick={() => setAddArtistDialogOpen(true)} className="mt-4">
              Add Your First Artist
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {managedArtists.map((artist) => (
              <div key={artist.id} className="glass-card p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={artist.avatar_url || '/placeholder.svg'}
                    alt={artist.display_name || artist.username}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{artist.display_name || artist.username}</h3>
                    <p className="text-sm text-muted-foreground">@{artist.username}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {artist.subscription?.status === 'active' ? (
                        <Badge variant="default" className="capitalize text-xs">
                          {artist.subscription.plan}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">No Active Sub</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{artist.songs_count} songs</span>
                      <span className="text-xs text-muted-foreground">{artist.total_plays?.toLocaleString()} plays</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/artist/${artist.username}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/analytics?artist=${artist.id}`)}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Stats
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveArtist(artist.id)}
                    disabled={removeArtistMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Artist Dialog */}
      <Dialog open={addArtistDialogOpen} onOpenChange={setAddArtistDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Artist to Roster</DialogTitle>
            <DialogDescription>Search and add artists to manage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredArtists.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No available artists found</p>
              ) : (
                filteredArtists.map((artist) => (
                  <div
                    key={artist.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <img
                      src={artist.avatar_url || '/placeholder.svg'}
                      alt={artist.display_name || artist.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{artist.display_name || artist.username}</p>
                      <p className="text-sm text-muted-foreground">@{artist.username}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddArtist(artist.id)}
                      disabled={addArtistMutation.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
