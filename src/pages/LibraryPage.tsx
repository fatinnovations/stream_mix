import { motion } from 'framer-motion';
import { Heart, Clock, ListMusic, Music } from 'lucide-react';
import CreatePlaylistModal from '@/components/playlists/CreatePlaylistModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { SongCard } from '@/components/songs/SongCard';
import { useNavigate } from 'react-router-dom';
import { useLikedSongs, useUserPlaylists, usePlayHistory } from '@/hooks/useLibrary';
import { useState } from 'react';

export default function LibraryPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'liked' | 'playlists' | 'history'>('liked');

  const { data: likedSongs = [], isLoading: loadingLiked } = useLikedSongs(profile?.id);
  const { data: playlists = [], isLoading: loadingPlaylists } = useUserPlaylists(profile?.id);
  const { data: history = [], isLoading: loadingHistory } = usePlayHistory(profile?.id, 50);

  const loading =
    (activeTab === 'liked' && loadingLiked) ||
    (activeTab === 'playlists' && loadingPlaylists) ||
    (activeTab === 'history' && loadingHistory);

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-6">Your Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        <Button
          variant={activeTab === 'liked' ? 'gradient' : 'secondary'}
          size="sm"
          className="flex-shrink-0 rounded-full gap-2"
          onClick={() => setActiveTab('liked')}
        >
          <Heart className="h-4 w-4" />
          Liked Songs
        </Button>
        <Button
          variant={activeTab === 'playlists' ? 'gradient' : 'secondary'}
          size="sm"
          className="flex-shrink-0 rounded-full gap-2"
          onClick={() => setActiveTab('playlists')}
        >
          <ListMusic className="h-4 w-4" />
          Playlists
        </Button>
        <Button
          variant={activeTab === 'history' ? 'gradient' : 'secondary'}
          size="sm"
          className="flex-shrink-0 rounded-full gap-2"
          onClick={() => setActiveTab('history')}
        >
          <Clock className="h-4 w-4" />
          History
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {activeTab === 'liked' && (
            <div className="space-y-2">
              {likedSongs.length > 0 ? (
                likedSongs.map((song, index) => (
                  <SongCard key={song.id} song={song} variant="compact" index={index} songs={likedSongs} />
                ))
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No liked songs yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/discover')}>
                    Discover Music
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'playlists' && (
            <div className="space-y-3">
              {/* Create Playlist Button */}
              <CreatePlaylistModal
                onPlaylistCreated={(id) => navigate(`/playlist/${id}`)}
                trigger={
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
                      <Music className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="font-medium">Create New Playlist</span>
                  </motion.button>
                }
              />

              {playlists.map((playlist, index) => (
                <motion.button
                  key={playlist.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  className="w-full p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-4 text-left"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    {playlist.cover_image_url ? (
                      <img
                        src={playlist.cover_image_url}
                        alt={playlist.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                        <Music className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{playlist.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {playlist.is_public ? 'Public' : 'Private'}
                    </p>
                  </div>
                </motion.button>
              ))}

              {playlists.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                  No playlists yet. Create one!
                </p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {history.length > 0 ? (
                history.map((song, index) => (
                  <SongCard key={`${song.id}-${index}`} song={song} variant="compact" index={index} songs={history} />
                ))
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No listening history yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/discover')}>
                    Start Listening
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
