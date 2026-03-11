import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Song, Comment } from '@/types/database';
import { STALE_TIME } from '@/lib/queryClient';

const SONG_SELECT = `*, artist:profiles!songs_artist_id_fkey(*), genre:genres(*)`;

export function useSong(songId: string | undefined) {
  return useQuery({
    queryKey: ['song', songId],
    queryFn: async () => {
      if (!songId) return null;
      const { data, error } = await supabase
        .from('songs')
        .select(SONG_SELECT)
        .eq('id', songId)
        .single();
      if (error) throw error;
      return data as Song;
    },
    enabled: !!songId,
    staleTime: STALE_TIME.MEDIUM,
  });
}

export function useSongLikesCount(songId: string | undefined) {
  return useQuery({
    queryKey: ['song', songId, 'likes-count'],
    queryFn: async () => {
      if (!songId) return 0;
      const { count, error } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('song_id', songId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!songId,
    staleTime: STALE_TIME.SHORT,
  });
}

export function useIsLiked(songId: string | undefined, profileId: string | undefined) {
  return useQuery({
    queryKey: ['song', songId, 'is-liked', profileId],
    queryFn: async () => {
      if (!songId || !profileId) return false;
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('song_id', songId)
        .eq('user_id', profileId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!songId && !!profileId,
    staleTime: STALE_TIME.SHORT,
  });
}

export function useSongComments(songId: string | undefined) {
  return useQuery({
    queryKey: ['song', songId, 'comments'],
    queryFn: async () => {
      if (!songId) return [];
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          song_id,
          user_id,
          parent_id,
          user:profiles!comments_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('song_id', songId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Build threaded structure: top-level comments with nested replies
      const allComments = (data ?? []) as Comment[];
      const commentMap = new Map<string, Comment>();
      const topLevel: Comment[] = [];

      allComments.forEach((c) => {
        commentMap.set(c.id, { ...c, replies: [] });
      });

      allComments.forEach((c) => {
        const comment = commentMap.get(c.id)!;
        if (c.parent_id && commentMap.has(c.parent_id)) {
          commentMap.get(c.parent_id)!.replies!.push(comment);
        } else {
          topLevel.push(comment);
        }
      });

      return topLevel;
    },
    enabled: !!songId,
    staleTime: STALE_TIME.SHORT,
    refetchOnMount: true,
  });
}

export function useToggleLike(songId: string, profileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isCurrentlyLiked: boolean) => {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('song_id', songId)
          .eq('user_id', profileId);
        if (error) throw error;
        return false;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ song_id: songId, user_id: profileId });
        if (error) throw error;
        return true;
      }
    },
    // Optimistic updates for instant UI feedback
    onMutate: async (isCurrentlyLiked) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['song', songId, 'is-liked', profileId] });
      await queryClient.cancelQueries({ queryKey: ['song', songId, 'likes-count'] });

      // Snapshot previous values
      const previousIsLiked = queryClient.getQueryData(['song', songId, 'is-liked', profileId]);
      const previousCount = queryClient.getQueryData<number>(['song', songId, 'likes-count']);

      // Optimistically update
      queryClient.setQueryData(['song', songId, 'is-liked', profileId], !isCurrentlyLiked);
      queryClient.setQueryData(['song', songId, 'likes-count'], (old: number = 0) => 
        isCurrentlyLiked ? Math.max(0, old - 1) : old + 1
      );

      return { previousIsLiked, previousCount };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(['song', songId, 'is-liked', profileId], context.previousIsLiked);
        queryClient.setQueryData(['song', songId, 'likes-count'], context.previousCount);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['song', songId, 'likes-count'] });
      queryClient.invalidateQueries({ queryKey: ['song', songId, 'is-liked', profileId] });
      queryClient.invalidateQueries({ queryKey: ['library', 'liked', profileId] });
    },
  });
}

export function useAddComment(songId: string, profileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({ 
          song_id: songId, 
          user_id: profileId, 
          content: content.trim(),
          parent_id: parentId ?? null,
        })
        .select(`
          id,
          content,
          created_at,
          updated_at,
          song_id,
          user_id,
          parent_id,
          user:profiles!comments_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();
      if (error) throw error;
      return data as Comment;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['song', songId, 'comments'] });
    },
  });
}

export function useEditComment(songId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from('comments')
        .update({ content: content.trim() })
        .eq('id', commentId);
      if (error) throw error;
    },
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey: ['song', songId, 'comments'] });
      const previous = queryClient.getQueryData<Comment[]>(['song', songId, 'comments']);
      queryClient.setQueryData<Comment[]>(['song', songId, 'comments'], (old = []) =>
        old.map((c) => (c.id === commentId ? { ...c, content: content.trim(), updated_at: new Date().toISOString() } : c))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['song', songId, 'comments'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['song', songId, 'comments'] });
    },
  });
}

export function useDeleteComment(songId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['song', songId, 'comments'] });
      const previous = queryClient.getQueryData<Comment[]>(['song', songId, 'comments']);
      queryClient.setQueryData<Comment[]>(['song', songId, 'comments'], (old = []) =>
        old.filter((c) => c.id !== commentId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['song', songId, 'comments'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['song', songId, 'comments'] });
    },
  });
}

// Search profiles for @mention suggestions
export function useMentionSearch(query: string) {
  return useQuery({
    queryKey: ['mention-search', query],
    queryFn: async () => {
      if (!query || query.length < 1) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: query.length >= 1,
    staleTime: STALE_TIME.SHORT,
  });
}

// Realtime subscription for comments
export function useRealtimeComments(songId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!songId) return;

    const channel = supabase
      .channel(`comments-${songId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `song_id=eq.${songId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['song', songId, 'comments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [songId, queryClient]);
}

// Prefetch song data for better UX
export function usePrefetchSong() {
  const queryClient = useQueryClient();
  
  return (songId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['song', songId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('songs')
          .select(SONG_SELECT)
          .eq('id', songId)
          .single();
        if (error) throw error;
        return data as Song;
      },
      staleTime: STALE_TIME.MEDIUM,
    });
  };
}
