import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Music, Users, CheckCircle, XCircle, Eye, BadgeCheck, CreditCard, Clock, Image, UserPlus, RefreshCw, Radio, BarChart3, Play, Download, TrendingUp, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Profile } from '@/types/database';
import { toast } from 'sonner';
import {
  useAdminData,
  useApproveSong,
  useRejectSong,
  useVerifyArtist,
  useSaveSubscription,
  useApproveSubscription,
  useRejectSubscription,
  PendingSong,
  Subscription,
  SUBSCRIPTION_PRICING,
} from '@/hooks/useAdminData';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { PlayTrendsChart } from '@/components/admin/PlayTrendsChart';
import { TopSongsChart } from '@/components/admin/TopSongsChart';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const [selectedSong, setSelectedSong] = useState<PendingSong | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<Profile | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan: 'basic',
    status: 'active',
    upload_limit: 10,
    expires_at: ''
  });
  const [createArtistDialogOpen, setCreateArtistDialogOpen] = useState(false);
  const [newArtistEmail, setNewArtistEmail] = useState('');
  const [newArtistUsername, setNewArtistUsername] = useState('');
  const [newArtistDisplayName, setNewArtistDisplayName] = useState('');
  const [creatingArtist, setCreatingArtist] = useState(false);

  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useAdminData();
  const { data: analyticsData, isLoading: analyticsLoading } = useAdminAnalytics();
  const approveSongMutation = useApproveSong();
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const rejectSongMutation = useRejectSong();
  const verifyArtistMutation = useVerifyArtist();
  const saveSubscriptionMutation = useSaveSubscription();
  const approveSubscriptionMutation = useApproveSubscription();
  const rejectSubscriptionMutation = useRejectSubscription();

  const pendingSongs = data?.pendingSongs || [];
  const artists = data?.artists || [];
  const subscriptions = data?.subscriptions || [];

  useEffect(() => {
    if (!user && !rolesLoading) {
      navigate('/auth');
      return;
    }
    
    if (!rolesLoading && !isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [user, isAdmin, rolesLoading, navigate]);

  // Real-time subscription for pending songs
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-songs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'songs',
        },
        (payload) => {
          console.log('Realtime song update:', payload);
          // Invalidate and refetch admin data when songs change
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
          
          if (payload.eventType === 'INSERT' && !(payload.new as any).is_approved) {
            toast.info('New song submitted for review!', {
              description: (payload.new as any).title,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artist_subscriptions',
        },
        (payload) => {
          console.log('Realtime subscription update:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
          
          if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && (payload.new as any).status === 'pending')) {
            toast.info('Subscription requires review!');
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  const handleApproveSong = async (song: PendingSong) => {
    const artistSub = subscriptions.find(s => s.artist_id === song.artist_id);
    if (!artistSub || artistSub.status !== 'active') {
      toast.error('Artist does not have an active subscription');
      return;
    }
    
    if (!profile) return;
    approveSongMutation.mutate({ song, profileId: profile.id, subscription: artistSub });
  };

  const handleRejectSong = () => {
    if (!selectedSong) return;
    rejectSongMutation.mutate(
      { songId: selectedSong.id, rejectionReason },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setSelectedSong(null);
          setRejectionReason('');
        },
      }
    );
  };

  const handleVerifyArtist = (artistId: string, verified: boolean) => {
    verifyArtistMutation.mutate({ artistId, verified });
  };

  const openSubscriptionDialog = (artist: Profile) => {
    setSelectedArtist(artist);
    const existing = subscriptions.find(s => s.artist_id === artist.id);
    if (existing) {
      setSubscriptionForm({
        plan: existing.plan,
        status: existing.status,
        upload_limit: existing.upload_limit,
        expires_at: existing.expires_at ? existing.expires_at.split('T')[0] : ''
      });
    } else {
      setSubscriptionForm({ plan: 'basic', status: 'active', upload_limit: 10, expires_at: '' });
    }
    setSubscriptionDialogOpen(true);
  };

  const handleSaveSubscription = () => {
    if (!selectedArtist || !profile) return;
    
    const existing = subscriptions.find(s => s.artist_id === selectedArtist.id);
    saveSubscriptionMutation.mutate(
      {
        artistId: selectedArtist.id,
        existingSubId: existing?.id,
        subData: {
          plan: subscriptionForm.plan as 'free' | 'basic' | 'premium' | 'pro',
          status: subscriptionForm.status as 'active' | 'expired' | 'cancelled' | 'pending',
          upload_limit: subscriptionForm.upload_limit,
          expires_at: subscriptionForm.expires_at ? new Date(subscriptionForm.expires_at).toISOString() : null,
          verified_by: profile.id,
          verified_at: new Date().toISOString()
        },
      },
      {
        onSuccess: () => {
          setSubscriptionDialogOpen(false);
          setSelectedArtist(null);
        },
      }
    );
  };

  const handleCreateArtist = async () => {
    if (!newArtistEmail || !newArtistUsername) {
      toast.error('Email and username are required');
      return;
    }
    setCreatingArtist(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-artist', {
        body: {
          email: newArtistEmail,
          username: newArtistUsername,
          display_name: newArtistDisplayName || newArtistUsername,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Artist "${newArtistDisplayName || newArtistUsername}" created with default password ABCabc123`);
      setCreateArtistDialogOpen(false);
      setNewArtistEmail('');
      setNewArtistUsername('');
      setNewArtistDisplayName('');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create artist');
    } finally {
      setCreatingArtist(false);
    }
  };

  const getArtistSubscription = (artistId: string) => subscriptions.find(s => s.artist_id === artistId);

  if (rolesLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Failed to load admin data</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/20"><Shield className="h-6 w-6 text-primary" /></div>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage content & users</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Radio className={`h-3 w-3 ${realtimeConnected ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground">{realtimeConnected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="glass-card p-3 sm:p-4 flex sm:block items-center gap-3">
          <Users className="h-4 w-4 text-blue-500 sm:mb-1" />
          <p className="text-xl font-bold">{data?.totalUsers || 0}</p>
          <p className="text-xs text-muted-foreground">Total Users</p>
        </div>
        <div className="glass-card p-3 sm:p-4 flex sm:block items-center gap-3">
          <Music className="h-4 w-4 text-primary sm:mb-1" />
          <p className="text-xl font-bold">{pendingSongs.length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="glass-card p-3 sm:p-4 flex sm:block items-center gap-3">
          <Users className="h-4 w-4 text-accent sm:mb-1" />
          <p className="text-xl font-bold">{artists.length}</p>
          <p className="text-xs text-muted-foreground">Artists</p>
        </div>
        <div className="glass-card p-3 sm:p-4 flex sm:block items-center gap-3">
          <CreditCard className="h-4 w-4 text-green-500 sm:mb-1" />
          <p className="text-xl font-bold">{subscriptions.filter(s => s.status === 'active').length}</p>
          <p className="text-xs text-muted-foreground">Active Subs</p>
        </div>
      </div>

      {/* User Type Breakdown */}
      <div className="glass-card p-3 sm:p-4 mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-2">Users by Type</p>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-sm font-medium">{data?.fanCount || 0}</span>
            <span className="text-xs text-muted-foreground">Fans</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-sm font-medium">{data?.artistCount || 0}</span>
            <span className="text-xs text-muted-foreground">Artists</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="text-sm font-medium">{data?.managerCount || 0}</span>
            <span className="text-xs text-muted-foreground">Managers</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Button onClick={() => setCreateArtistDialogOpen(true)} variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Create Artist
        </Button>
        <Button onClick={() => navigate('/upload')} variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload Song
        </Button>
      </div>
      
      <Tabs defaultValue="songs" className="w-full">
        <TabsList className="w-full mb-4 grid grid-cols-4">
          <TabsTrigger value="songs" className="text-xs sm:text-sm">Songs</TabsTrigger>
          <TabsTrigger value="artists" className="text-xs sm:text-sm">Artists</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs sm:text-sm">Subs</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="songs">
          {pendingSongs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No pending songs to review</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSongs.map((song) => {
                const artistSub = getArtistSubscription(song.artist_id);
                return (
                  <div key={song.id} className="glass-card p-4">
                    <div className="flex items-start gap-4">
                      <img src={song.cover_art_url || '/placeholder.svg'} alt={song.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{song.title}</h3>
                        <p className="text-sm text-muted-foreground">by {song.artist?.display_name || 'Unknown'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {song.artist?.is_verified && <Badge variant="secondary" className="text-xs"><BadgeCheck className="h-3 w-3 mr-1" />Verified</Badge>}
                          {artistSub?.status === 'active' ? (
                            <Badge variant="outline" className="text-xs text-green-500 border-green-500">
                              <CreditCard className="h-3 w-3 mr-1" />{artistSub.plan}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">No Sub</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(song.audio_url, '_blank')}>
                        <Eye className="h-4 w-4 mr-1" />Preview
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => handleApproveSong(song)}
                        disabled={!artistSub || artistSub.status !== 'active' || approveSongMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />Approve
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1" onClick={() => { setSelectedSong(song); setRejectDialogOpen(true); }}>
                        <XCircle className="h-4 w-4 mr-1" />Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="artists">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artists.map((artist) => (
              <div key={artist.id} className="glass-card p-4">
                <div className="flex items-center gap-4">
                  <img src={artist.avatar_url || '/placeholder.svg'} alt={artist.display_name || artist.username} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{artist.display_name || artist.username}</h3>
                      {artist.is_verified && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground">@{artist.username}</p>
                  </div>
                  <Button 
                    variant={artist.is_verified ? 'outline' : 'default'} 
                    size="sm" 
                    onClick={() => handleVerifyArtist(artist.id, !artist.is_verified)}
                    disabled={verifyArtistMutation.isPending}
                  >
                    {artist.is_verified ? 'Unverify' : 'Verify'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="subscriptions">
          <div className="space-y-4 md:space-y-6">
            {/* Pending Subscriptions First */}
            {subscriptions.filter(s => s.status === 'pending').length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">Pending Approval</h3>
                {subscriptions.filter(s => s.status === 'pending').map((sub) => {
                  const artist = artists.find(a => a.id === sub.artist_id);
                  return (
                    <div key={sub.id} className="glass-card p-4 mb-3 border border-yellow-500/30">
                      <div className="flex items-center gap-4">
                        <img src={artist?.avatar_url || '/placeholder.svg'} alt={artist?.display_name || artist?.username} className="w-12 h-12 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{artist?.display_name || artist?.username}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="capitalize bg-yellow-500/20 text-yellow-400">
                              <Clock className="h-3 w-3 mr-1" />
                              {sub.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground capitalize">{sub.plan}</span>
                            <span className="text-sm font-medium text-green-400">
                              MWK {SUBSCRIPTION_PRICING[sub.plan as keyof typeof SUBSCRIPTION_PRICING]?.price.toLocaleString() || '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {sub.payment_proof_url && (
                        <div className="mt-4">
                          <Label className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                            <Image className="h-4 w-4" /> Payment Proof
                          </Label>
                          <img 
                            src={sub.payment_proof_url} 
                            alt="Payment proof" 
                            className="w-full max-h-48 object-contain rounded-lg border border-border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(sub.payment_proof_url!, '_blank')}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-4">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={approveSubscriptionMutation.isPending}
                          onClick={() => profile && approveSubscriptionMutation.mutate({ subscriptionId: sub.id, profileId: profile.id })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />Approve
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="flex-1"
                          disabled={rejectSubscriptionMutation.isPending}
                          onClick={() => profile && rejectSubscriptionMutation.mutate({ subscriptionId: sub.id, profileId: profile.id })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* All Artists */}
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">All Artists</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {artists.map((artist) => {
                const sub = getArtistSubscription(artist.id);
                return (
                  <div key={artist.id} className="glass-card p-4">
                    <div className="flex items-center gap-4">
                      <img src={artist.avatar_url || '/placeholder.svg'} alt={artist.display_name || artist.username} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{artist.display_name || artist.username}</h3>
                        {sub ? (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={sub.status === 'active' ? 'default' : sub.status === 'pending' ? 'secondary' : 'destructive'} className="capitalize">
                              {sub.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground capitalize">{sub.plan}</span>
                            <span className="text-xs text-muted-foreground">
                              {sub.songs_uploaded}/{sub.upload_limit || '∞'} uploads
                            </span>
                            {sub.payment_proof_url && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2"
                                onClick={() => window.open(sub.payment_proof_url!, '_blank')}
                              >
                                <Image className="h-3 w-3 mr-1" />Proof
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No subscription</p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => openSubscriptionDialog(artist)}>
                        <CreditCard className="h-4 w-4 mr-1" />
                        {sub ? 'Edit' : 'Add'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : analyticsData ? (
            <div className="space-y-6">
              {/* Analytics Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Total Plays</span>
                  </div>
                  <p className="text-2xl font-bold">{analyticsData.totals.totalPlays.toLocaleString()}</p>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="h-4 w-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Downloads</span>
                  </div>
                  <p className="text-2xl font-bold">{analyticsData.totals.totalDownloads.toLocaleString()}</p>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Revenue</span>
                  </div>
                  <p className="text-2xl font-bold">MWK {analyticsData.totals.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="h-4 w-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Total Songs</span>
                  </div>
                  <p className="text-2xl font-bold">{analyticsData.totals.totalSongs.toLocaleString()}</p>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PlayTrendsChart />
                <TopSongsChart />
              </div>

              {/* Artist Analytics Table */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Artist Performance
                  </h3>
                  <p className="text-sm text-muted-foreground">Play counts, downloads, and revenue per artist</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Artist</TableHead>
                        <TableHead className="text-right">Songs</TableHead>
                        <TableHead className="text-right">Plays</TableHead>
                        <TableHead className="text-right">Downloads</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead>Plan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData.artists.map((item) => {
                        const maxPlays = analyticsData.artists[0]?.totalPlays || 1;
                        const playPercentage = maxPlays > 0 ? (item.totalPlays / maxPlays) * 100 : 0;
                        
                        return (
                          <TableRow key={item.artist.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img 
                                  src={item.artist.avatar_url || '/placeholder.svg'} 
                                  alt={item.artist.display_name || item.artist.username} 
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium truncate max-w-[120px] lg:max-w-[200px]">
                                    {item.artist.display_name || item.artist.username}
                                  </p>
                                  <p className="text-xs text-muted-foreground">@{item.artist.username}</p>
                                </div>
                                {item.artist.is_verified && (
                                  <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.totalSongs}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-medium">{item.totalPlays.toLocaleString()}</span>
                                <Progress value={playPercentage} className="h-1 w-16" />
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.totalDownloads.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <span className={item.revenue > 0 ? 'text-green-500 font-medium' : 'text-muted-foreground'}>
                                MWK {item.revenue.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.subscriptionPlan ? (
                                <Badge 
                                  variant={item.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                                  className="capitalize"
                                >
                                  {item.subscriptionPlan}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {analyticsData.artists.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No artist data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load analytics data
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Song</DialogTitle>
            <DialogDescription>Provide a reason for rejecting "{selectedSong?.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection" rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRejectSong} disabled={rejectSongMutation.isPending}>
                {rejectSongMutation.isPending ? 'Rejecting...' : 'Reject Song'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>Set subscription for {selectedArtist?.display_name || selectedArtist?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {subscriptions.find(s => s.artist_id === selectedArtist?.id)?.payment_proof_url && (
              <div className="space-y-2">
                <Label>Payment Proof</Label>
                <img 
                  src={subscriptions.find(s => s.artist_id === selectedArtist?.id)?.payment_proof_url!} 
                  alt="Payment proof" 
                  className="w-full max-h-48 object-contain rounded-lg border border-border cursor-pointer"
                  onClick={() => window.open(subscriptions.find(s => s.artist_id === selectedArtist?.id)?.payment_proof_url!, '_blank')}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={subscriptionForm.plan} onValueChange={(v) => {
                const pricing = SUBSCRIPTION_PRICING[v as keyof typeof SUBSCRIPTION_PRICING];
                setSubscriptionForm({ 
                  ...subscriptionForm, 
                  plan: v,
                  upload_limit: pricing.uploads
                });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    Free - MWK {SUBSCRIPTION_PRICING.free.price.toLocaleString()} ({SUBSCRIPTION_PRICING.free.uploads} uploads)
                  </SelectItem>
                  <SelectItem value="basic">
                    Basic - MWK {SUBSCRIPTION_PRICING.basic.price.toLocaleString()} ({SUBSCRIPTION_PRICING.basic.uploads} uploads)
                  </SelectItem>
                  <SelectItem value="premium">
                    Premium - MWK {SUBSCRIPTION_PRICING.premium.price.toLocaleString()} ({SUBSCRIPTION_PRICING.premium.uploads} uploads)
                  </SelectItem>
                  <SelectItem value="pro">
                    Pro - MWK {SUBSCRIPTION_PRICING.pro.price.toLocaleString()} (Unlimited)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selected: MWK {SUBSCRIPTION_PRICING[subscriptionForm.plan as keyof typeof SUBSCRIPTION_PRICING]?.price.toLocaleString() || 0}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={subscriptionForm.status} onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Upload Limit (0 = unlimited)</Label>
              <Input 
                type="number" 
                value={subscriptionForm.upload_limit} 
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, upload_limit: parseInt(e.target.value) || 0 })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Expires At (optional)</Label>
              <Input 
                type="date" 
                value={subscriptionForm.expires_at} 
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, expires_at: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSubscription} disabled={saveSubscriptionMutation.isPending}>
                {saveSubscriptionMutation.isPending ? 'Saving...' : 'Save Subscription'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Artist Dialog */}
      <Dialog open={createArtistDialogOpen} onOpenChange={setCreateArtistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Artist</DialogTitle>
            <DialogDescription>
              Create an artist account. Default password: ABCabc123
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newArtistEmail}
                onChange={(e) => setNewArtistEmail(e.target.value)}
                placeholder="artist@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={newArtistUsername}
                onChange={(e) => setNewArtistUsername(e.target.value)}
                placeholder="artist_username"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={newArtistDisplayName}
                onChange={(e) => setNewArtistDisplayName(e.target.value)}
                placeholder="Artist Display Name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateArtistDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateArtist} disabled={creatingArtist}>
                {creatingArtist ? 'Creating...' : 'Create Artist'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
