import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, CheckCircle, Users, Music, MapPin, Instagram, Twitter, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { SongCard } from '@/components/songs/SongCard';
import { toast } from 'sonner';
import { useArtistById, useArtistSongs, useArtistFollowersCount, useIsFollowing, useToggleFollow } from '@/hooks/useArtistProfile';

export default function ArtistProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: currentUser } = useAuth();
  const { setQueue } = usePlayer();

  const { data: artist, isLoading } = useArtistById(id);
  const { data: songs = [] } = useArtistSongs(id);
  const { data: followersCount = 0 } = useArtistFollowersCount(id);
  const { data: isFollowing = false } = useIsFollowing(id, currentUser?.id);

  const toggleFollowMutation = useToggleFollow(id ?? '', currentUser?.id ?? '');

  const handleFollow = async () => {
    if (!currentUser) {
      toast.error('Please sign in to follow artists');
      return;
    }

    try {
      const newState = await toggleFollowMutation.mutateAsync(isFollowing);
      toast.success(newState ? 'Following!' : 'Unfollowed');
    } catch {
      toast.error('Unable to update follow status');
    }
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-br from-primary/30 to-accent/30 relative">
          {artist.cover_image_url && (
            <img
              src={artist.cover_image_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 bg-background/50 backdrop-blur-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-16 left-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-background shadow-xl">
              {artist.avatar_url ? (
                <img
                  src={artist.avatar_url}
                  alt={artist.display_name || artist.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {(artist.display_name || artist.username).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {artist.is_verified && (
              <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1">
                <CheckCircle className="h-6 w-6 text-primary fill-primary" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-20 px-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{artist.display_name || artist.username}</h1>
            <p className="text-muted-foreground">@{artist.username}</p>
          </div>
          <Button
            variant={isFollowing ? 'secondary' : 'gradient'}
            onClick={handleFollow}
            disabled={currentUser?.id === artist.id || toggleFollowMutation.isPending}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        </div>

        {/* Location */}
        {(artist.location || artist.country) && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {artist.location}{artist.location && artist.country && ', '}{artist.country}
          </p>
        )}

        {/* Bio */}
        {artist.bio && (
          <p className="text-sm text-foreground/80 mt-3">{artist.bio}</p>
        )}

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold">{songs.length}</p>
            <p className="text-xs text-muted-foreground">Songs</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{followersCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">
              {songs.reduce((acc, s) => acc + (s.play_count || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Plays</p>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-3 mt-4">
          {artist.instagram_url && (
            <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm">
                <Instagram className="h-4 w-4" />
              </Button>
            </a>
          )}
          {artist.twitter_url && (
            <a href={artist.twitter_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm">
                <Twitter className="h-4 w-4" />
              </Button>
            </a>
          )}
          {artist.website && (
            <a href={artist.website} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm">
                <Globe className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Songs */}
      <section className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Songs</h2>
          {songs.length > 0 && (
            <Button variant="gradient" size="sm" onClick={handlePlayAll}>
              <Play className="h-4 w-4 fill-white" />
              Play All
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {songs.length > 0 ? (
            songs.map((song, index) => (
              <SongCard key={song.id} song={song} variant="compact" index={index} showArtist={false} />
            ))
          ) : (
            <div className="text-center py-8 bg-secondary rounded-xl">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No songs yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
