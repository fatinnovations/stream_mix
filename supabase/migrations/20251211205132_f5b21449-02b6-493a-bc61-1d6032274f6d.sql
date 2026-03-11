-- Add foreign key constraints to properly link the tables
-- user_roles.user_id should reference auth.users(id) directly
-- profiles.user_id already references auth.users(id)

-- First, drop existing foreign key if any on user_roles
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Add proper foreign key constraint to user_roles referencing auth.users
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint on profiles.user_id if not exists
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_key;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

-- Drop existing foreign key if any on profiles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Add proper foreign key constraint to profiles referencing auth.users
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;