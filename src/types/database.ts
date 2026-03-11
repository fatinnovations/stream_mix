export type UserType = 'artist' | 'fan' | 'manager' | 'admin';
export type SongMood = 'happy' | 'chill' | 'workout' | 'gospel' | 'party' | 'sad' | 'romantic' | 'energetic';

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  user_type: UserType;
  location: string | null;
  country: string | null;
  website: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  created_at: string;
}

export interface Song {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_art_url: string | null;
  lyrics: string | null;
  duration: number | null;
  genre_id: string | null;
  mood: SongMood | null;
  language: string;
  is_published: boolean;
  is_promoted: boolean;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  promotion_score: number;
  play_count: number;
  download_count: number;
  release_date: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  artist?: Profile;
  genre?: Genre;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export interface Playlist {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: Profile;
  songs?: Song[];
  songs_count?: number;
}

export interface Like {
  id: string;
  user_id: string;
  song_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  song_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: Profile;
  replies?: Comment[];
}

export interface PlayHistory {
  id: string;
  user_id: string | null;
  song_id: string;
  played_at: string;
  duration_played: number | null;
  country: string | null;
  city: string | null;
}
