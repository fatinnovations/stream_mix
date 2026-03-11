import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Clock, Mic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SongCard } from '@/components/songs/SongCard';
import { ArtistCard } from '@/components/artists/ArtistCard';
import { useNavigate } from 'react-router-dom';
import { useTrendingSongs, useSearchSongs } from '@/hooks/useSongs';
import { useTopArtists, useSearchArtists } from '@/hooks/useArtists';
import { useGenres } from '@/hooks/useGenres';
import { SingToSearch } from '@/components/search/SingToSearch';

export default function DiscoverPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'songs' | 'artists' | 'genres'>('songs');
  const [recentSearches] = useState(['Afrobeats', 'Gospel', 'Hip Hop']);
  const [showSingSearch, setShowSingSearch] = useState(false);
  const navigate = useNavigate();

  // Debounce search query
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const isSearching = debouncedQuery.length >= 2;

  // Trending data (when not searching)
  const { data: trendingSongs = [], isLoading: loadingTrending } = useTrendingSongs(100);
  const { data: trendingArtists = [], isLoading: loadingTrendingArtists } = useTopArtists(100);
  const { data: genres = [] } = useGenres();

  // Search data (when searching)
  const { data: searchSongs = [], isLoading: loadingSearchSongs } = useSearchSongs(debouncedQuery, isSearching);
  const { data: searchArtists = [], isLoading: loadingSearchArtists } = useSearchArtists(debouncedQuery, isSearching);

  // Combine loading states
  const loading = isSearching
    ? loadingSearchSongs || loadingSearchArtists
    : loadingTrending || loadingTrendingArtists;

  // Current data based on search state
  const songs = isSearching ? searchSongs : trendingSongs;
  const artists = isSearching ? searchArtists : trendingArtists;

  // Filter genres for search
  const filteredGenres = useMemo(() => {
    if (!debouncedQuery) return genres;
    return genres.filter(g => g.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
  }, [genres, debouncedQuery]);

  return (
    <div className="py-4">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Discover</h1>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search songs, artists, genres..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 bg-secondary border-border rounded-xl"
            />
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0"
            onClick={() => setShowSingSearch(true)}
          >
            <Mic className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sing to Search Modal */}
      <AnimatePresence>
        {showSingSearch && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background p-4 overflow-auto"
          >
            <SingToSearch onClose={() => setShowSingSearch(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Searches */}
      {!query && (
        <section className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Clock className="h-4 w-4" />
            <span>Recent searches</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {recentSearches.map((search) => (
              <Button
                key={search}
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => setQuery(search)}
              >
                {search}
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* Browse Genres */}
      {!query && (
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-4">Browse Genres</h2>
          <div className="grid grid-cols-2 gap-3">
            {genres.map((genre, index) => (
              <motion.button
                key={genre.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/genre/${genre.slug}`)}
                className="p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
              >
                <span className="text-2xl">{genre.icon}</span>
                <p className="font-medium mt-2">{genre.name}</p>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Search Results or Trending */}
      {(query || songs.length > 0) && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {(['songs', 'artists', 'genres'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'secondary'}
                size="sm"
                className="rounded-full capitalize"
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>

          {/* Results */}
          <section>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Searching...
              </div>
            ) : (
              <>
                {activeTab === 'songs' && (
                  <div className="space-y-2">
                    {songs.length > 0 ? (
                      songs.map((song, index) => (
                        <SongCard key={song.id} song={song} variant="compact" index={index} />
                      ))
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No songs found</p>
                    )}
                  </div>
                )}

                {activeTab === 'artists' && (
                  <div className="space-y-3">
                    {artists.length > 0 ? (
                      artists.map((artist, index) => (
                        <ArtistCard key={artist.id} artist={artist} index={index} />
                      ))
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No artists found</p>
                    )}
                  </div>
                )}

                {activeTab === 'genres' && (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredGenres.map((genre, index) => (
                      <motion.button
                        key={genre.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => navigate(`/genre/${genre.slug}`)}
                        className="p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                      >
                        <span className="text-2xl">{genre.icon}</span>
                        <p className="font-medium mt-2">{genre.name}</p>
                      </motion.button>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
