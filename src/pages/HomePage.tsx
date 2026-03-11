import { motion } from 'framer-motion';
import { Bell, Search, Clock, TrendingUp, Users, Sparkles, Heart, Smile, CloudSun, Dumbbell, Music, LogIn, User, Settings, LogOut, ShieldCheck, Briefcase } from 'lucide-react';
import streamixLogo from '@/assets/streamix-logo.jfif';
import { useAuth } from '@/contexts/AuthContext';
import { SongCard } from '@/components/songs/SongCard';
import { ArtistCard } from '@/components/artists/ArtistCard';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useTrendingSongs, useNewReleases } from '@/hooks/useSongs';
import { useTopArtists } from '@/hooks/useArtists';
import { useGenres } from '@/hooks/useGenres';
import { useRecentlyPlayed } from '@/hooks/useLibrary';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function HomePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // React Query hooks
  const { data: trendingSongs = [], isLoading: loadingTrending } = useTrendingSongs(50);
  const { data: newReleases = [], isLoading: loadingReleases } = useNewReleases(50);
  const { data: topArtists = [], isLoading: loadingArtists } = useTopArtists(100);
  const { data: genres = [] } = useGenres();
  const { data: recentlyPlayed = [] } = useRecentlyPlayed(profile?.id, 20);

  const loading = loadingTrending || loadingReleases || loadingArtists;

  const { isAdmin, isManager } = useUserRoles();

  const handleSignOut = async () => {
    setShowLogoutDialog(false);
    await signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const renderHeader = () => (
    <header className="flex items-center justify-between py-4 px-1 sticky top-0 z-30 bg-background/80 backdrop-blur-lg">
      <div className="flex items-center gap-3">
        <img src={streamixLogo} alt="Streamix" className="w-9 h-9 rounded-lg object-cover" />
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="text-xl font-bold">
            {profile?.display_name || profile?.username || 'Welcome'}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/discover')}>
          <Search className="h-5 w-5" />
        </Button>
        {user ? (
          <>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || profile?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.display_name || profile?.username}</p>
                    <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                {isManager && (
                  <DropdownMenuItem onClick={() => navigate('/manager')} className="cursor-pointer">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Manager Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button size="sm" onClick={() => navigate('/auth')} className="gap-1.5">
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        )}
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="pb-4">
        {renderHeader()}
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      {renderHeader()}

      {/* Genre Pills */}
      <section className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button variant="gradient" size="sm" className="flex-shrink-0 rounded-full">
            All
          </Button>
          {genres.map((genre) => (
            <Button
              key={genre.id}
              variant="secondary"
              size="sm"
              className="flex-shrink-0 rounded-full"
              onClick={() => navigate(`/genre/${genre.slug}`)}
            >
              {genre.name}
            </Button>
          ))}
        </div>
      </section>

      {/* Recently Played - Only for logged-in users */}
      {profile && recentlyPlayed.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Recently Played</h2>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {recentlyPlayed.map((song, index) => (
              <SongCard key={song.id} song={song} variant="horizontal" index={index} songs={recentlyPlayed} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Songs */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Trending Now</h2>
          </div>
          <Link to="/trending" className="text-sm text-primary">See all</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {trendingSongs.length > 0 ? (
            trendingSongs.map((song, index) => (
              <SongCard key={song.id} song={song} variant="horizontal" index={index} songs={trendingSongs} />
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No trending songs yet</p>
          )}
        </div>
      </section>

      {/* Top Artists */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Top Artists</h2>
          </div>
          <Link to="/artists" className="text-sm text-primary">See all</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {topArtists.length > 0 ? (
            topArtists.map((artist, index) => (
              <ArtistCard key={artist.id} artist={artist} variant="compact" index={index} />
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No artists yet</p>
          )}
        </div>
      </section>

      {/* New Releases */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">New Releases</h2>
          </div>
          <Link to="/new-releases" className="text-sm text-primary">See all</Link>
        </div>
        <div className="space-y-2">
          {newReleases.length > 0 ? (
            newReleases.slice(0, 5).map((song, index) => (
              <SongCard key={song.id} song={song} variant="compact" index={index} songs={newReleases.slice(0, 5)} />
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No new releases yet</p>
          )}
        </div>
      </section>

      {/* Mood Playlists */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Mood Playlists</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { mood: 'happy', icon: Smile, label: 'Happy Vibes', color: 'from-yellow-500 to-orange-500' },
            { mood: 'chill', icon: CloudSun, label: 'Chill Mode', color: 'from-blue-500 to-cyan-500' },
            { mood: 'workout', icon: Dumbbell, label: 'Workout', color: 'from-red-500 to-pink-500' },
            { mood: 'gospel', icon: Heart, label: 'Gospel', color: 'from-purple-500 to-indigo-500' },
          ].map((item) => (
            <motion.button
              key={item.mood}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/mood/${item.mood}`)}
              className={`p-4 rounded-xl bg-gradient-to-br ${item.color} text-white text-left`}
            >
              <item.icon className="h-6 w-6 mb-2" />
              <p className="font-semibold">{item.label}</p>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}
