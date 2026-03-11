import { CheckCircle } from 'lucide-react';
import { Profile } from '@/types/database';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface ArtistCardProps {
  artist: Profile;
  variant?: 'default' | 'compact';
  index?: number;
  followersCount?: number;
}

export function ArtistCard({ artist, variant = 'default', index, followersCount }: ArtistCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/artist/${artist.id}`);
  };

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index ? index * 0.05 : 0 }}
        onClick={handleClick}
        className="flex-shrink-0 w-24 text-center cursor-pointer group"
      >
        <div className="relative mx-auto w-20 h-20 mb-2">
          <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
            {artist.avatar_url ? (
              <img 
                src={artist.avatar_url} 
                alt={artist.display_name || artist.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {(artist.display_name || artist.username).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {artist.is_verified && (
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
              <CheckCircle className="h-5 w-5 text-primary fill-primary" />
            </div>
          )}
        </div>
        <p className="text-sm font-medium truncate">
          {artist.display_name || artist.username}
        </p>
        {followersCount !== undefined && (
          <p className="text-xs text-muted-foreground">
            {followersCount.toLocaleString()} followers
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index ? index * 0.05 : 0 }}
      onClick={handleClick}
      className="glass-card p-4 cursor-pointer card-hover"
    >
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden">
            {artist.avatar_url ? (
              <img 
                src={artist.avatar_url} 
                alt={artist.display_name || artist.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {(artist.display_name || artist.username).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {artist.is_verified && (
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
              <CheckCircle className="h-5 w-5 text-primary fill-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate flex items-center gap-1">
            {artist.display_name || artist.username}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {artist.location && `${artist.location}`}
            {artist.location && artist.country && ', '}
            {artist.country}
          </p>
          {followersCount !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              {followersCount.toLocaleString()} followers
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
