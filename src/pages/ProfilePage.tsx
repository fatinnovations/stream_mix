import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Edit2, LogOut, Music, Users, Heart, CheckCircle, Instagram, Twitter, Globe, MapPin, Shield, Clock, XCircle, CheckCircle2, CreditCard, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { SongCard } from '@/components/songs/SongCard';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ProfileCompletionPrompt } from '@/components/profile/ProfileCompletionPrompt';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useMyArtistSongs, useProfileStats } from '@/hooks/useProfileStats';
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

export default function ProfilePage() {
  const { profile, signOut, user, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const { isAdmin, isManager, loading: rolesLoading } = useUserRoles();
  const { data: songs = [], isLoading: loadingSongs } = useMyArtistSongs(
    profile?.user_type === 'artist' ? profile?.id : undefined
  );
  const { data: stats = { songs: 0, followers: 0, following: 0, likes: 0 } } = useProfileStats(profile?.id);

  const handleSignOut = async () => {
    setShowLogoutDialog(false);
    await signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  if (authLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  if (!profile) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center gap-3 px-4">
        <h1 className="text-lg font-semibold">Setting up your profile…</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          We couldn't load your profile yet. Tap retry — if this is your first login, we'll create it automatically.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            onClick={async () => {
              await refreshProfile();
            }}
          >
            Retry
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header Actions */}
      <div className="flex justify-end gap-2 py-4 flex-wrap">
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
            <Shield className="h-4 w-4 mr-2" />
            Admin
          </Button>
        )}
        {isManager && (
          <Button variant="outline" size="sm" onClick={() => navigate('/manager')}>
            <Briefcase className="h-4 w-4 mr-2" />
            Manager
          </Button>
        )}
        {profile?.user_type === 'artist' && (
          <Button variant="outline" size="sm" onClick={() => navigate('/subscription')}>
            <CreditCard className="h-4 w-4 mr-2" />
            Subscription
          </Button>
        )}

        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <Settings className="h-5 w-5" />
        </Button>

        <Button variant="outline" size="sm" onClick={() => setShowLogoutDialog(true)}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

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

      {/* Profile Completion Prompt */}
      <ProfileCompletionPrompt profile={profile} />

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        {/* Avatar */}
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {profile.is_verified && (
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
              <CheckCircle className="h-6 w-6 text-primary fill-primary" />
            </div>
          )}
        </div>

        {/* Name & Username */}
        <h1 className="text-xl font-bold flex items-center justify-center gap-2">
          {profile.display_name || profile.username}
        </h1>
        <p className="text-muted-foreground">@{profile.username}</p>

        {/* Location */}
        {(profile.location || profile.country) && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <MapPin className="h-3 w-3" />
            {profile.location}{profile.location && profile.country && ', '}{profile.country}
          </p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-foreground/80 mt-3 max-w-sm mx-auto">
            {profile.bio}
          </p>
        )}

        {/* Social Links */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {profile.instagram_url && (
            <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm">
                <Instagram className="h-4 w-4" />
              </Button>
            </a>
          )}
          {profile.twitter_url && (
            <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm">
                <Twitter className="h-4 w-4" />
              </Button>
            </a>
          )}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm">
                <Globe className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>

        {/* Edit Profile Button */}
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/edit-profile')}
        >
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        <div className="text-center p-3 rounded-xl bg-secondary">
          <Music className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{stats.songs}</p>
          <p className="text-xs text-muted-foreground">Songs</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary">
          <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{stats.followers}</p>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary">
          <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{stats.following}</p>
          <p className="text-xs text-muted-foreground">Following</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary">
          <Heart className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{stats.likes}</p>
          <p className="text-xs text-muted-foreground">Likes</p>
        </div>
      </div>

      {/* My Songs (for artists) */}
      {profile.user_type === 'artist' && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">My Songs</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/upload')}>
              Upload
            </Button>
          </div>
          {loadingSongs ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : songs.length > 0 ? (
            <div className="space-y-3">
              {songs.map((song, index) => (
                <div key={song.id} className="relative">
                  <SongCard song={song} variant="compact" index={index} showArtist={false} />
                  {/* Approval Status Badge */}
                  <div className="absolute top-2 right-2">
                    {song.is_approved ? (
                      <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : song.rejection_reason ? (
                      <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  {/* Show rejection reason if rejected */}
                  {song.rejection_reason && (
                    <p className="text-xs text-red-400 mt-1 pl-2">
                      Reason: {song.rejection_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-secondary rounded-xl">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No songs uploaded yet</p>
              <Button variant="gradient" onClick={() => navigate('/upload')}>
                Upload Your First Song
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
