import { motion } from 'framer-motion';
import { ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArtistCard } from '@/components/artists/ArtistCard';
import { useAllArtists } from '@/hooks/useArtists';

export default function AllArtistsPage() {
  const navigate = useNavigate();
  const { data: artists = [], isLoading } = useAllArtists(200);

  return (
    <div className="pb-4">
      <header className="flex items-center gap-4 py-4 sticky top-0 z-30 bg-background/80 backdrop-blur-lg">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">All Artists</h1>
          </div>
          <p className="text-sm text-muted-foreground">{artists.length} artists</p>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : artists.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {artists.map((artist, index) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <ArtistCard artist={artist} variant="default" index={index} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No artists yet</p>
        </div>
      )}
    </div>
  );
}
