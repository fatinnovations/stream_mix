-- Fix RLS for likes/comments/play_history and add a secure play-tracking RPC

-- ===============
-- LIKES
-- ===============
DROP POLICY IF EXISTS "Users can manage their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can update their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;

CREATE POLICY "Users can insert their own likes"
ON public.likes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = likes.user_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own likes"
ON public.likes
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = likes.user_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own likes"
ON public.likes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = likes.user_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = likes.user_id
      AND p.user_id = auth.uid()
  )
);


-- ===============
-- COMMENTS
-- ===============
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

CREATE POLICY "Users can create comments"
ON public.comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = comments.user_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = comments.user_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = comments.user_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own comments"
ON public.comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = comments.user_id
      AND p.user_id = auth.uid()
  )
);


-- ===============
-- PLAY HISTORY
-- ===============
DROP POLICY IF EXISTS "Anyone can insert play history" ON public.play_history;
DROP POLICY IF EXISTS "Users can view their own play history" ON public.play_history;
DROP POLICY IF EXISTS "Admins can view all play history" ON public.play_history;
DROP POLICY IF EXISTS "Anyone can insert guest play history" ON public.play_history;
DROP POLICY IF EXISTS "Users can insert their own play history" ON public.play_history;

CREATE POLICY "Anyone can insert guest play history"
ON public.play_history
FOR INSERT
WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can insert their own play history"
ON public.play_history
FOR INSERT
WITH CHECK (
  user_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = play_history.user_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own play history"
ON public.play_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = play_history.user_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all play history"
ON public.play_history
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.user_type));


-- ===============
-- RPC: track_play (increments songs.play_count + inserts play_history)
-- ===============
CREATE OR REPLACE FUNCTION public.track_play(
  _song_id uuid,
  _profile_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment cached counter (used for trending, stats, etc.)
  UPDATE public.songs
  SET play_count = COALESCE(play_count, 0) + 1,
      updated_at = now()
  WHERE id = _song_id;

  -- Record a play event (profile_id can be NULL for guests)
  INSERT INTO public.play_history (song_id, user_id, played_at)
  VALUES (_song_id, _profile_id, now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_play(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.track_play(uuid, uuid) TO authenticated;