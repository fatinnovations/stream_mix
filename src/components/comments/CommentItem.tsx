import { useState, useRef, useCallback } from 'react';
import { Edit2, Trash2, X, Check, Reply, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Comment } from '@/types/database';
import MentionInput from './MentionInput';

interface CommentItemProps {
  comment: Comment;
  isOwner: boolean;
  currentProfileId?: string;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (content: string, parentId: string) => void;
  isEditPending?: boolean;
  isDeletePending?: boolean;
  isReplyPending?: boolean;
  depth?: number;
}

export default function CommentItem({
  comment,
  isOwner,
  currentProfileId,
  onEdit,
  onDelete,
  onReply,
  isEditPending,
  isDeletePending,
  isReplyPending,
  depth = 0,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(() => {
    if (!isOwner) return;
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
    }, 500);
  }, [isOwner]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!isOwner) return;
    e.preventDefault();
    setShowMenu(true);
  }, [isOwner]);

  const handleEdit = () => {
    setShowMenu(false);
    setIsEditing(true);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    onEdit(comment.id, editContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleDelete = () => {
    setShowMenu(false);
    onDelete(comment.id);
  };

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    onReply(replyContent, comment.id);
    setReplyContent('');
    setIsReplying(false);
  };

  // Render comment content with @mentions as clickable links
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <button
            key={i}
            onClick={(e) => e.stopPropagation()}
            className="text-primary font-medium hover:underline"
          >
            {part}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const maxDepth = 3;

  return (
    <div className={depth > 0 ? 'ml-6 pl-3 border-l-2 border-border' : ''}>
      <div
        className="flex gap-3 relative select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          {comment.user?.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={comment.user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">
                {comment.user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 h-8 text-sm bg-secondary border-border"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit} disabled={isEditPending}>
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-medium">{comment.user?.display_name || comment.user?.username}</span>
                {' '}
                <span className="text-muted-foreground">{renderContent(comment.content)}</span>
              </p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString()}
                </p>
                {comment.updated_at !== comment.created_at && (
                  <span className="text-xs text-muted-foreground italic">(edited)</span>
                )}
                {depth < maxDepth && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <Reply className="h-3 w-3" />
                    Reply
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Long-press option menu */}
        {showMenu && isOwner && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-0 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent w-full text-left transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeletePending}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive w-full text-left transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Reply input */}
      {isReplying && (
        <div className="ml-11 mt-2 flex gap-2 items-center">
          <CornerDownRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <MentionInput
            value={replyContent}
            onChange={setReplyContent}
            placeholder={`Reply to ${comment.user?.display_name || comment.user?.username}...`}
            className="h-8 text-sm bg-secondary border-border"
            onSubmit={handleSubmitReply}
          />
          <Button size="sm" className="h-8" onClick={handleSubmitReply} disabled={!replyContent.trim() || isReplyPending}>
            Reply
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setIsReplying(false); setReplyContent(''); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isOwner={currentProfileId === reply.user_id}
              currentProfileId={currentProfileId}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              isEditPending={isEditPending}
              isDeletePending={isDeletePending}
              isReplyPending={isReplyPending}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
