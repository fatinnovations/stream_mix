import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { SUBSCRIPTION_PRICING } from './useAdminData';

export interface ArtistAnalytics {
  artist: Profile;
  totalPlays: number;
  totalDownloads: number;
  totalSongs: number;
  revenue: number;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
}

export interface AdminAnalyticsData {
  artists: ArtistAnalytics[];
  totals: {
    totalPlays: number;
    totalDownloads: number;
    totalRevenue: number;
    totalSongs: number;
    totalArtists: number;
  };
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async (): Promise<AdminAnalyticsData> => {
      // Fetch all artists with their songs aggregated
      const { data: artists, error: artistsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'artist')
        .order('created_at', { ascending: false });

      if (artistsError) throw artistsError;

      // Fetch all songs with play_count and download_count
      const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select('artist_id, play_count, download_count')
        .eq('is_approved', true);

      if (songsError) throw songsError;

      // Fetch all subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('artist_subscriptions')
        .select('artist_id, plan, status');

      if (subsError) throw subsError;

      // Fetch approved payment history for revenue calculation
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_history')
        .select('artist_id, amount, status')
        .eq('status', 'approved');

      if (paymentsError) throw paymentsError;

      // Aggregate data per artist
      const artistAnalytics: ArtistAnalytics[] = (artists || []).map((artist) => {
        const artistSongs = (songs || []).filter((s) => s.artist_id === artist.id);
        const artistSub = (subscriptions || []).find((s) => s.artist_id === artist.id);
        const artistPayments = (payments || []).filter((p) => p.artist_id === artist.id);

        const totalPlays = artistSongs.reduce((acc, s) => acc + (s.play_count || 0), 0);
        const totalDownloads = artistSongs.reduce((acc, s) => acc + (s.download_count || 0), 0);
        
        // Calculate revenue from approved payments
        const revenue = artistPayments.reduce((acc, p) => {
          const amount = parseFloat(p.amount) || 0;
          return acc + amount;
        }, 0);

        return {
          artist,
          totalPlays,
          totalDownloads,
          totalSongs: artistSongs.length,
          revenue,
          subscriptionPlan: artistSub?.plan || null,
          subscriptionStatus: artistSub?.status || null,
        };
      });

      // Sort by total plays descending
      artistAnalytics.sort((a, b) => b.totalPlays - a.totalPlays);

      // Calculate totals
      const totals = artistAnalytics.reduce(
        (acc, a) => ({
          totalPlays: acc.totalPlays + a.totalPlays,
          totalDownloads: acc.totalDownloads + a.totalDownloads,
          totalRevenue: acc.totalRevenue + a.revenue,
          totalSongs: acc.totalSongs + a.totalSongs,
          totalArtists: acc.totalArtists + 1,
        }),
        { totalPlays: 0, totalDownloads: 0, totalRevenue: 0, totalSongs: 0, totalArtists: 0 }
      );

      return {
        artists: artistAnalytics,
        totals,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
