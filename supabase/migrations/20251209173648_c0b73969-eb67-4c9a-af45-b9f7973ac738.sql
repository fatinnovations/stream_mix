-- Create enums for user types and song moods
CREATE TYPE public.user_type AS ENUM ('artist', 'fan', 'manager', 'admin');
CREATE TYPE public.song_mood AS ENUM ('happy', 'chill', 'workout', 'gospel', 'party', 'sad', 'romantic', 'energetic');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  user_type user_type NOT NULL DEFAULT 'fan',
  location TEXT,
  country TEXT,
  website TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  facebook_url TEXT,
  tiktok_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create genres table
CREATE TABLE public.genres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create artist_genres junction table
CREATE TABLE public.artist_genres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  genre_id UUID REFERENCES public.genres(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(profile_id, genre_id)
);

-- Create songs table
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  cover_art_url TEXT,
  lyrics TEXT,
  duration INTEGER, -- in seconds
  genre_id UUID REFERENCES public.genres(id),
  mood song_mood,
  language TEXT DEFAULT 'English',
  is_published BOOLEAN DEFAULT true,
  is_promoted BOOLEAN DEFAULT false,
  promotion_score INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create song_tags table
CREATE TABLE public.song_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  UNIQUE(song_id, tag)
);

-- Create playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist_songs junction table
CREATE TABLE public.playlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, song_id)
);

-- Create likes table
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id)
);

-- Create follows table
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create play_history table for analytics
CREATE TABLE public.play_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_played INTEGER, -- in seconds
  country TEXT,
  city TEXT
);

-- Create user_roles table for admin management
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_type NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Genres policies (public read)
CREATE POLICY "Genres are viewable by everyone" ON public.genres FOR SELECT USING (true);

-- Artist genres policies
CREATE POLICY "Artist genres are viewable by everyone" ON public.artist_genres FOR SELECT USING (true);
CREATE POLICY "Artists can manage their genres" ON public.artist_genres FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Songs policies
CREATE POLICY "Published songs are viewable by everyone" ON public.songs FOR SELECT USING (is_published = true);
CREATE POLICY "Artists can manage their own songs" ON public.songs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = artist_id AND user_id = auth.uid())
);

-- Song tags policies
CREATE POLICY "Song tags are viewable by everyone" ON public.song_tags FOR SELECT USING (true);
CREATE POLICY "Artists can manage their song tags" ON public.song_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.songs s JOIN public.profiles p ON s.artist_id = p.id WHERE s.id = song_id AND p.user_id = auth.uid())
);

-- Playlists policies
CREATE POLICY "Public playlists are viewable by everyone" ON public.playlists FOR SELECT USING (is_public = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = owner_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage their own playlists" ON public.playlists FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = owner_id AND user_id = auth.uid())
);

-- Playlist songs policies
CREATE POLICY "Playlist songs are viewable if playlist is accessible" ON public.playlist_songs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND (is_public = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = owner_id AND user_id = auth.uid())))
);
CREATE POLICY "Users can manage their playlist songs" ON public.playlist_songs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.playlists pl JOIN public.profiles p ON pl.owner_id = p.id WHERE pl.id = playlist_id AND p.user_id = auth.uid())
);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON public.likes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND profiles.user_id = auth.uid())
);

-- Follows policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.follows FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = follower_id AND profiles.user_id = auth.uid())
);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND profiles.user_id = auth.uid())
);

-- Play history policies
CREATE POLICY "Users can view their own play history" ON public.play_history FOR SELECT USING (
  user_id IS NULL OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Anyone can insert play history" ON public.play_history FOR INSERT WITH CHECK (true);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'fan')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public) VALUES ('music', 'music', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);

-- Storage policies for music bucket
CREATE POLICY "Anyone can view music files" ON storage.objects FOR SELECT USING (bucket_id = 'music');
CREATE POLICY "Authenticated users can upload music" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'music' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own music files" ON storage.objects FOR UPDATE USING (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own music files" ON storage.objects FOR DELETE USING (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for covers bucket
CREATE POLICY "Anyone can view covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Authenticated users can upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own covers" ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own covers" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert default genres
INSERT INTO public.genres (name, slug, icon) VALUES
  ('Afrobeats', 'afrobeats', '🎵'),
  ('Hip Hop', 'hip-hop', '🎤'),
  ('R&B', 'rnb', '💜'),
  ('Gospel', 'gospel', '🙏'),
  ('Dancehall', 'dancehall', '💃'),
  ('Reggae', 'reggae', '🌴'),
  ('Pop', 'pop', '⭐'),
  ('Amapiano', 'amapiano', '🎹'),
  ('Traditional', 'traditional', '🥁'),
  ('Jazz', 'jazz', '🎷'),
  ('Rock', 'rock', '🎸'),
  ('Electronic', 'electronic', '🎧');