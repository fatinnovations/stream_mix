import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Song } from '@/types/database';
import { toast } from 'sonner';

export interface PendingSong extends Song {
  artist: Profile;
}

export interface Subscription {
  id: string;
  artist_id: string;
  plan: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  upload_limit: number;
  songs_uploaded: number;
  verified_by: string | null;
  verified_at: string | null;
  payment_proof_url: string | null;
  admin_notes: string | null;
  artist?: Profile;
}

export function useAdminData() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const [songsRes, artistsRes, subsRes, totalUsersRes, fansRes, artistCountRes, managersRes] = await Promise.all([
        supabase
          .from('songs')
          .select(`*, artist:profiles!songs_artist_id_fkey(*)`)
          .eq('is_approved', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('user_type', 'artist')
          .order('created_at', { ascending: false }),
        supabase.from('artist_subscriptions').select('*'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'fan'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'artist'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'manager'),
      ]);

      return {
        pendingSongs: (songsRes.data || []) as PendingSong[],
        artists: (artistsRes.data || []) as Profile[],
        subscriptions: (subsRes.data || []) as Subscription[],
        totalUsers: totalUsersRes.count || 0,
        fanCount: fansRes.count || 0,
        artistCount: artistCountRes.count || 0,
        managerCount: managersRes.count || 0,
      };
    },
  });
}

export function useApproveSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      song,
      profileId,
      subscription,
    }: {
      song: PendingSong;
      profileId: string;
      subscription: Subscription;
    }) => {
      const { error } = await supabase
        .from('songs')
        .update({
          is_approved: true,
          is_published: true,
          approved_by: profileId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', song.id);

      if (error) throw error;

      // Increment songs_uploaded
      await supabase
        .from('artist_subscriptions')
        .update({ songs_uploaded: (subscription.songs_uploaded || 0) + 1 })
        .eq('id', subscription.id);

      return song;
    },
    onSuccess: (song) => {
      toast.success(`"${song.title}" has been approved`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      toast.error('Failed to approve song');
    },
  });
}

export function useRejectSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      songId,
      rejectionReason,
    }: {
      songId: string;
      rejectionReason: string;
    }) => {
      const { error } = await supabase
        .from('songs')
        .update({
          is_approved: false,
          is_published: false,
          rejection_reason: rejectionReason,
        })
        .eq('id', songId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Song has been rejected');
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      toast.error('Failed to reject song');
    },
  });
}

// Subscription plan pricing info
export const SUBSCRIPTION_PRICING = {
  free: { name: 'Free', price: 0, uploads: 3 },
  basic: { name: 'Basic', price: 5000, uploads: 10 },
  premium: { name: 'Premium', price: 10000, uploads: 30 },
  pro: { name: 'Pro', price: 20000, uploads: 0 }, // 0 = unlimited
} as const;

export function useVerifyArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      artistId,
      verified,
    }: {
      artistId: string;
      verified: boolean;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: verified })
        .eq('id', artistId);

      if (error) throw error;
      return verified;
    },
    onSuccess: (verified) => {
      toast.success(verified ? 'Artist verified' : 'Artist verification removed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) => {
      console.error('Verify artist error:', error);
      toast.error('Failed to update artist verification');
    },
  });
}

export function useSaveSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      artistId,
      existingSubId,
      subData,
    }: {
      artistId: string;
      existingSubId?: string;
      subData: {
        plan: 'free' | 'basic' | 'premium' | 'pro';
        status: 'active' | 'expired' | 'cancelled' | 'pending';
        upload_limit: number;
        expires_at: string | null;
        verified_by: string;
        verified_at: string;
      };
    }) => {
      if (existingSubId) {
        const { error } = await supabase
          .from('artist_subscriptions')
          .update({ artist_id: artistId, ...subData })
          .eq('id', existingSubId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('artist_subscriptions')
          .insert([{ artist_id: artistId, ...subData }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Subscription saved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      toast.error('Failed to save subscription');
    },
  });
}

export function useApproveSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      profileId,
    }: {
      subscriptionId: string;
      profileId: string;
    }) => {
      const { error } = await supabase
        .from('artist_subscriptions')
        .update({
          status: 'active',
          verified_by: profileId,
          verified_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      await supabase
        .from('payment_history')
        .update({
          status: 'approved',
          reviewed_by: profileId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('subscription_id', subscriptionId)
        .eq('status', 'pending');
    },
    onSuccess: () => {
      toast.success('Subscription approved!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      toast.error('Failed to approve');
    },
  });
}

export function useRejectSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      profileId,
    }: {
      subscriptionId: string;
      profileId: string;
    }) => {
      const { error } = await supabase
        .from('artist_subscriptions')
        .update({
          status: 'cancelled',
          verified_by: profileId,
          verified_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      await supabase
        .from('payment_history')
        .update({
          status: 'rejected',
          reviewed_by: profileId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('subscription_id', subscriptionId)
        .eq('status', 'pending');
    },
    onSuccess: () => {
      toast.success('Subscription rejected');
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      toast.error('Failed to reject');
    },
  });
}
