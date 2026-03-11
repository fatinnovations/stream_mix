import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, Heart, Share2, MessageCircle, MoreVertical, Clock, ListPlus, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Music, Download, Loader2 } from 'lucide-react';
import AddToPlaylistModal from '@/components/playlists/AddToPlaylistModal';
import CommentItem from '@/components/comments/CommentItem';
import MentionInput from '@/components/comments/MentionInput';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { toast } from 'sonner';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { useSong, useSongLikesCount, useIsLiked, useSongComments, useToggleLike, useAddComment, useRealtimeComments, useEditComment, useDeleteComment } from '@/hooks/useSongDetails';
import { useDownloadSong } from '@/hooks/useDownloadSong';
import { useState } from 'react';

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay, queue, shuffle, repeatMode, playNext, playPrevious, toggleShuffle, toggleRepeat, setQueue } = usePlayer();
  const { checkAuth } = useLoginPrompt();

  const [newComment, setNewComment] = useState('');
  const { downloadSong, downloading } = useDownloadSong();

  const { data: song, isLoading } = useSong(id);
  const { data: likesCount = 0 } = useSongLikesCount(id);
  const { data: isLiked = false } = useIsLiked(id, profile?.id);
  const { data: comments = [] } = useSongComments(id);
  useRealtimeComments(id);

  const toggleLikeMutation = useToggleLike(id ?? '', profile?.id ?? '');
  const addCommentMutation = useAddComment(id ?? '', profile?.id ?? '');
  const editCommentMutation = useEditComment(id ?? '');
  const deleteCommentMutation = useDeleteComment(id ?? '');

  const handleLike = async () => {
    if (!checkAuth('like songs')) return;
    if (!profile || !id) return;
    try {
      await toggleLikeMutation.mutateAsync(isLiked);
    } catch {
      toast.error('Unable to update likes');
    }
  };

  const handleComment = async () => {
    if (!checkAuth('comment on songs')) return;
    if (!profile || !id) return;
    if (!newComment.trim()) return;
    try {
      await addCommentMutation.mutateAsync({ content: newComment });
      setNewComment('');
      toast.success('Comment added!');
    } catch {
      toast.error('Unable to add comment');
    }
  };

  const handleReply = async (content: string, parentId: string) => {
    if (!checkAuth('reply to comments')) return;
    if (!profile || !id) return;
    try {
      await addCommentMutation.mutateAsync({ content, parentId });
      toast.success('Reply added!');
    } catch {
      toast.error('Unable to add reply');
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      await editCommentMutation.mutateAsync({ commentId, content });
      toast.success('Comment updated!');
    } catch {
      toast.error('Unable to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
      toast.success('Comment deleted');
    } catch {
      toast.error('Unable to delete comment');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: song?.title,
        text: `Check out ${song?.title} by ${song?.artist?.display_name}`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handlePlay = () => {
    if (!song) return;
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    if (queue.length === 0) {
      setQueue([song], 0);
      return;
    }
    playSong(song);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Count all comments including nested replies
  const countAllComments = (items: typeof comments): number => {
    return items.reduce((acc, c) => acc + 1 + (c.replies ? countAllComments(c.replies) : 0), 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Song not found</p>
      </div>
    );
  }

  const isCurrentSong = currentSong?.id === song.id;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Now Playing</h1>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Cover Art */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="aspect-square rounded-2xl overflow-hidden mb-6 mx-4 shadow-2xl"
      >
        {song.cover_art_url ? (
          <img
            src={song.cover_art_url}
            alt={song.title}
            className={`w-full h-full object-cover ${isCurrentSong && isPlaying ? 'animate-spin-slow' : ''}`}
            style={{ animationDuration: '20s' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
            <Music className="h-24 w-24 text-muted-foreground" />
          </div>
        )}
      </motion.div>

      {/* Song Info */}
      <div className="px-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold truncate">{song.title}</h2>
            <button
              onClick={() => navigate(`/artist/${song.artist?.id}`)}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {song.artist?.display_name || song.artist?.username}
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            disabled={toggleLikeMutation.isPending}
            className={isLiked ? 'text-red-500' : 'text-muted-foreground'}
          >
            <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(song.duration)}
          </span>
          <span>{song.play_count?.toLocaleString()} plays</span>
          <span>{likesCount} likes</span>
          <span>{song.download_count?.toLocaleString() || 0} downloads</span>
        </div>

        {/* Genre & Mood */}
        <div className="flex gap-2 mt-3">
          {song.genre && (
            <span className="px-3 py-1 rounded-full bg-secondary text-sm">
              {song.genre.icon} {song.genre.name}
            </span>
          )}
          {song.mood && (
            <span className="px-3 py-1 rounded-full bg-secondary text-sm capitalize">
              {song.mood}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => { if (!checkAuth('use playback controls')) return; toggleShuffle(); }} className={shuffle ? 'text-primary' : 'text-muted-foreground'}>
            <Shuffle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (!checkAuth('use playback controls')) return; playPrevious(); }}>
            <SkipBack className="h-6 w-6" />
          </Button>
          <Button variant="gradient" size="icon-lg" className="h-16 w-16" onClick={handlePlay}>
            {isCurrentSong && isPlaying ? <Pause className="h-8 w-8 fill-white" /> : <Play className="h-8 w-8 fill-white ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (!checkAuth('use playback controls')) return; playNext(); }}>
            <SkipForward className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (!checkAuth('use playback controls')) return; toggleRepeat(); }} className={repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground'}>
            {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!checkAuth('download songs')) return;
              downloadSong(song);
            }}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Download className="h-6 w-6" />
            )}
          </Button>
          <AddToPlaylistModal
            songId={song.id}
            trigger={<Button variant="ghost" size="icon"><ListPlus className="h-6 w-6" /></Button>}
          />
        </div>
      </div>

      {/* Description */}
      {song.description && (
        <div className="px-4 mb-6">
          <h3 className="font-bold mb-2">About</h3>
          <p className="text-sm text-muted-foreground">{song.description}</p>
        </div>
      )}

      {/* Lyrics */}
      {song.lyrics && (
        <div className="px-4 mb-6">
          <h3 className="font-bold mb-2">Lyrics</h3>
          <div className="p-4 rounded-xl bg-secondary">
            <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
              {song.lyrics}
            </pre>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="px-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({countAllComments(comments)})
        </h3>

        {/* Add Comment */}
        <div className="flex gap-2 mb-4">
          <MentionInput
            value={newComment}
            onChange={setNewComment}
            placeholder="Add a comment... Use @ to mention"
            className="h-10 bg-secondary border-border"
            onSubmit={handleComment}
          />
          <Button onClick={handleComment} disabled={!newComment.trim() || addCommentMutation.isPending}>
            Post
          </Button>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isOwner={profile?.id === comment.user_id}
              currentProfileId={profile?.id}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              onReply={handleReply}
              isEditPending={editCommentMutation.isPending}
              isDeletePending={deleteCommentMutation.isPending}
              isReplyPending={addCommentMutation.isPending}
            />
          ))}
          {comments.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No comments yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
