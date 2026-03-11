import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Music, Image, FileText, X, Loader2, ArrowLeft, AlertCircle, Files } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useGenres } from '@/hooks/useGenres';
import { Profile } from '@/types/database';
import BulkUploadForm from '@/components/upload/BulkUploadForm';

const MOODS = ['happy', 'chill', 'workout', 'gospel', 'party', 'sad', 'romantic', 'energetic'] as const;

export default function UploadPage() {
  const { profile } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genreId, setGenreId] = useState('');
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState('English');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [artists, setArtists] = useState<Profile[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);

  const { data: genres = [] } = useGenres();

  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      navigate('/');
      toast.error('Only admins can upload songs');
    }
  }, [isAdmin, rolesLoading, navigate]);

  useEffect(() => {
    const fetchArtists = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'artist')
        .order('display_name');
      setArtists((data as Profile[]) || []);
      setLoadingArtists(false);
    };
    if (isAdmin) fetchArtists();
  }, [isAdmin]);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('audio')) { toast.error('Please select an audio file'); return; }
      if (file.size > 50 * 1024 * 1024) { toast.error('File size must be less than 50MB'); return; }
      setAudioFile(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('image')) { toast.error('Please select an image file'); return; }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !audioFile || !title || !selectedArtistId) {
      toast.error('Please fill in all required fields including artist selection');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const audioExt = audioFile.name.split('.').pop();
      const audioPath = `${selectedArtistId}/${Date.now()}.${audioExt}`;
      const { error: audioError } = await supabase.storage.from('music').upload(audioPath, audioFile);
      if (audioError) throw audioError;
      setUploadProgress(50);

      const { data: audioUrlData } = supabase.storage.from('music').getPublicUrl(audioPath);
      const audioUrl = audioUrlData.publicUrl;

      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverPath = `${selectedArtistId}/${Date.now()}.${coverExt}`;
        const { error: coverError } = await supabase.storage.from('covers').upload(coverPath, coverFile);
        if (!coverError) {
          const { data: coverUrlData } = supabase.storage.from('covers').getPublicUrl(coverPath);
          coverUrl = coverUrlData.publicUrl;
        }
      }
      setUploadProgress(80);

      const { error: songError } = await supabase.from('songs').insert({
        artist_id: selectedArtistId,
        title,
        description: description || null,
        lyrics: lyrics || null,
        audio_url: audioUrl,
        cover_art_url: coverUrl,
        genre_id: genreId || null,
        mood: mood as any || null,
        language,
        is_published: true,
        is_approved: true,
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      });

      if (songError) throw songError;
      setUploadProgress(100);
      toast.success('Song uploaded and published successfully!');
      navigate('/admin');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload song. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (rolesLoading || loadingArtists) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="py-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Upload Songs (Admin)</h1>
      </div>

      {artists.length === 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Artists Available</AlertTitle>
          <AlertDescription>Create an artist first from the Admin Dashboard before uploading songs.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Music className="h-4 w-4" />Single Upload
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Files className="h-4 w-4" />Bulk Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Artist Selection */}
            <div className="space-y-2">
              <Label>Assign to Artist *</Label>
              <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
                <SelectTrigger className="h-12 bg-secondary border-border">
                  <SelectValue placeholder="Select an artist" />
                </SelectTrigger>
                <SelectContent>
                  {artists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.display_name || artist.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Audio Upload */}
            <div>
              <Label>Audio File *</Label>
              <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioChange} className="hidden" />
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => audioInputRef.current?.click()}
                className="w-full mt-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center gap-3"
              >
                {audioFile ? (
                  <>
                    <Music className="h-8 w-8 text-primary" />
                    <div className="text-center">
                      <p className="font-medium">{audioFile.name}</p>
                      <p className="text-sm text-muted-foreground">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setAudioFile(null); }}>
                      <X className="h-4 w-4 mr-1" />Remove
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium">Upload Audio</p>
                      <p className="text-sm text-muted-foreground">MP3, WAV up to 50MB</p>
                    </div>
                  </>
                )}
              </motion.button>
            </div>

            {/* Cover Art */}
            <div>
              <Label>Cover Art</Label>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              <div className="flex gap-4 mt-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => coverInputRef.current?.click()}
                  className="w-32 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 overflow-hidden"
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Image className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add Cover</span>
                    </>
                  )}
                </motion.button>
                {coverPreview && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setCoverFile(null); setCoverPreview(null); }}>
                    <X className="h-4 w-4 mr-1" />Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Song Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter song title" className="h-12 bg-secondary border-border" required />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell us about this song..." className="bg-secondary border-border" rows={3} />
            </div>

            {/* Genre & Mood */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select value={genreId} onValueChange={setGenreId}>
                  <SelectTrigger className="h-12 bg-secondary border-border"><SelectValue placeholder="Select genre" /></SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={genre.id} value={genre.id}>{genre.icon} {genre.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mood</Label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger className="h-12 bg-secondary border-border"><SelectValue placeholder="Select mood" /></SelectTrigger>
                  <SelectContent>
                    {MOODS.map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label>Language</Label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. English, Chichewa" className="h-12 bg-secondary border-border" />
            </div>

            {/* Lyrics */}
            <div className="space-y-2">
              <Label htmlFor="lyrics" className="flex items-center gap-2"><FileText className="h-4 w-4" />Lyrics</Label>
              <Textarea id="lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Paste lyrics here..." className="bg-secondary border-border font-mono text-sm" rows={6} />
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full gradient-primary" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={uploading || !audioFile || !title || !selectedArtistId || artists.length === 0}>
              {uploading ? (<><Loader2 className="h-5 w-5 animate-spin" />Uploading...</>) : (<><Upload className="h-5 w-5" />Upload Song</>)}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="bulk">
          {profile && (
            <BulkUploadForm artists={artists} genres={genres} profileId={profile.id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
