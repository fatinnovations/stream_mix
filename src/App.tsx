import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { LoginPromptProvider } from "@/contexts/LoginPromptContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { queryClient } from "@/lib/queryClient";

import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import DiscoverPage from "./pages/DiscoverPage";
import LibraryPage from "./pages/LibraryPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import UploadPage from "./pages/UploadPage";
import SongDetailPage from "./pages/SongDetailPage";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import GenrePage from "./pages/GenrePage";
import MoodPage from "./pages/MoodPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SongAnalyticsPage from "./pages/SongAnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import PlaylistDetailPage from "./pages/PlaylistDetailPage";
import NowPlayingPage from "./pages/NowPlayingPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ManagerDashboardPage from "./pages/ManagerDashboardPage";
import ArtistOnboardingPage from "./pages/ArtistOnboardingPage";
import ArtistSubscriptionPage from "./pages/ArtistSubscriptionPage";
import PaymentHistoryPage from "./pages/PaymentHistoryPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import PrivacySecurityPage from "./pages/PrivacySecurityPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TrendingSongsPage from "./pages/TrendingSongsPage";
import NewReleasesPage from "./pages/NewReleasesPage";
import AllArtistsPage from "./pages/AllArtistsPage";
import LikedSongsPage from "./pages/LikedSongsPage";
import PlayHistoryPage from "./pages/PlayHistoryPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PlayerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LoginPromptProvider>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/trending" element={<TrendingSongsPage />} />
                  <Route path="/new-releases" element={<NewReleasesPage />} />
                  <Route path="/artists" element={<AllArtistsPage />} />
                  <Route path="/liked-songs" element={<ProtectedRoute bannerMessage="Sign in to view liked songs"><LikedSongsPage /></ProtectedRoute>} />
                  <Route path="/play-history" element={<ProtectedRoute bannerMessage="Sign in to view play history"><PlayHistoryPage /></ProtectedRoute>} />
                  <Route path="/library" element={<ProtectedRoute bannerMessage="Sign in to access your library"><LibraryPage /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute bannerMessage="Sign in to view your profile"><ProfilePage /></ProtectedRoute>} />
                  <Route path="/edit-profile" element={<ProtectedRoute bannerMessage="Sign in to edit your profile"><EditProfilePage /></ProtectedRoute>} />
                  <Route path="/upload" element={<ProtectedRoute bannerMessage="Sign in to upload music"><UploadPage /></ProtectedRoute>} />
                  <Route path="/song/:id" element={<SongDetailPage />} />
                  <Route path="/artist/:id" element={<ArtistProfilePage />} />
                  <Route path="/genre/:slug" element={<GenrePage />} />
                  <Route path="/mood/:mood" element={<MoodPage />} />
                  <Route path="/analytics" element={<ProtectedRoute bannerMessage="Sign in to view analytics"><AnalyticsPage /></ProtectedRoute>} />
                  <Route path="/analytics/song/:id" element={<ProtectedRoute bannerMessage="Sign in to view song analytics"><SongAnalyticsPage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute bannerMessage="Sign in to access settings"><SettingsPage /></ProtectedRoute>} />
                  <Route path="/playlist/:id" element={<ProtectedRoute bannerMessage="Sign in to view this playlist"><PlaylistDetailPage /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute bannerMessage="Sign in to access admin dashboard"><AdminDashboardPage /></ProtectedRoute>} />
                  <Route path="/manager" element={<ProtectedRoute bannerMessage="Sign in to access manager dashboard"><ManagerDashboardPage /></ProtectedRoute>} />
                  <Route path="/subscription" element={<ProtectedRoute bannerMessage="Sign in to manage your subscription"><ArtistSubscriptionPage /></ProtectedRoute>} />
                  <Route path="/payments" element={<ProtectedRoute bannerMessage="Sign in to view payment history"><PaymentHistoryPage /></ProtectedRoute>} />
                  <Route path="/onboarding" element={<ProtectedRoute bannerMessage="Sign in to continue onboarding"><ArtistOnboardingPage /></ProtectedRoute>} />
                  <Route path="/change-password" element={<ProtectedRoute bannerMessage="Sign in to change your password"><ChangePasswordPage /></ProtectedRoute>} />
                  <Route path="/privacy-security" element={<ProtectedRoute bannerMessage="Sign in to manage privacy & security"><PrivacySecurityPage /></ProtectedRoute>} />
                  <Route path="/help" element={<HelpCenterPage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                </Route>
                <Route path="/now-playing" element={<NowPlayingPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </LoginPromptProvider>
          </BrowserRouter>
        </TooltipProvider>
      </PlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
