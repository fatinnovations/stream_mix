
-- Add parent_id column for threaded comments
ALTER TABLE public.comments
ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE DEFAULT NULL;

-- Add index for faster threaded comment queries
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
