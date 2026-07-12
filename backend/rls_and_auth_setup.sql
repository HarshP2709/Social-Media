-- ================================================================
-- PulseFeed – Auth Link + RLS Setup
-- Run this ENTIRE file in Supabase SQL Editor AFTER schema.sql
--
-- What this file does:
--   1. Alters public.users so its id is a FK → auth.users(id)
--   2. Creates a trigger: on signup → auto-insert into public.users
--   3. Enables RLS on all 6 tables
--   4. Creates proper security policies for every table
--   5. Grants correct permissions to anon / authenticated roles
-- ================================================================


-- ================================================================
-- STEP 1 — LINK public.users TO auth.users
-- ================================================================
-- The public.users.id must now reference auth.users.id so that
-- Supabase knows which app-user owns which auth account.
--
-- IMPORTANT: Because you already have seed rows whose IDs are NOT
-- in auth.users we drop the seed data first, alter the column, then
-- restore safe seed data with auth-managed IDs.
-- ================================================================

-- Remove existing seed data (safe to re-run)
TRUNCATE TABLE notifications, followers, likes, comments, posts, users
  RESTART IDENTITY CASCADE;

-- Drop the old default (uuid_generate_v4) — the ID will now come
-- from auth.users, so we must NOT auto-generate it here.
ALTER TABLE public.users
  ALTER COLUMN id DROP DEFAULT;

-- Add the foreign-key constraint that ties every profile row to an
-- auth account. ON DELETE CASCADE means deleting auth user also
-- deletes the profile row automatically.
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users (id)
  ON DELETE CASCADE;

-- password column is no longer needed because Supabase Auth handles
-- passwords. We keep it for backward-compat with the bcrypt backend
-- but mark it nullable so the trigger can insert without it.
ALTER TABLE public.users
  ALTER COLUMN password DROP NOT NULL,
  ALTER COLUMN password SET DEFAULT NULL;


-- ================================================================
-- STEP 2 — AUTO-CREATE PROFILE ON SIGN-UP (Auth Trigger)
-- ================================================================
-- When a user registers via Supabase Auth (or your /api/register
-- route uses supabase.auth.signUp), this trigger fires and creates
-- the matching public.users row automatically.
--
-- The trigger reads name / username from raw_user_meta_data that
-- your front-end / backend can pass during signUp.
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with owner privileges
SET search_path = public  -- prevents search-path injection
AS $$
DECLARE
  _name     TEXT;
  _username TEXT;
BEGIN
  -- Read optional metadata sent at signup time.
  -- Falls back to email-prefix if not supplied.
  _name     := COALESCE(
                 NEW.raw_user_meta_data ->> 'name',
                 split_part(NEW.email, '@', 1)
               );
  _username := COALESCE(
                 NEW.raw_user_meta_data ->> 'username',
                 regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')
               );

  -- Make username unique by appending a 4-char suffix if taken
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = _username) LOOP
    _username := _username || floor(random() * 9000 + 1000)::TEXT;
  END LOOP;

  INSERT INTO public.users (id, name, username, email)
  VALUES (
    NEW.id,
    _name,
    _username,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (fires after every INSERT in auth schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ================================================================
-- STEP 3 — ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ================================================================

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- STEP 4 — DROP OLD POLICIES (clean slate before re-creating)
-- ================================================================

-- users
DROP POLICY IF EXISTS "users_select_all"          ON public.users;
DROP POLICY IF EXISTS "users_insert_own"          ON public.users;
DROP POLICY IF EXISTS "users_update_own"          ON public.users;
DROP POLICY IF EXISTS "users_delete_own"          ON public.users;

-- posts
DROP POLICY IF EXISTS "posts_select_all"          ON public.posts;
DROP POLICY IF EXISTS "posts_insert_own"          ON public.posts;
DROP POLICY IF EXISTS "posts_update_own"          ON public.posts;
DROP POLICY IF EXISTS "posts_delete_own"          ON public.posts;

-- comments
DROP POLICY IF EXISTS "comments_select_all"       ON public.comments;
DROP POLICY IF EXISTS "comments_insert_own"       ON public.comments;
DROP POLICY IF EXISTS "comments_update_own"       ON public.comments;
DROP POLICY IF EXISTS "comments_delete_own"       ON public.comments;

-- likes
DROP POLICY IF EXISTS "likes_select_all"          ON public.likes;
DROP POLICY IF EXISTS "likes_insert_own"          ON public.likes;
DROP POLICY IF EXISTS "likes_delete_own"          ON public.likes;

-- followers
DROP POLICY IF EXISTS "followers_select_all"      ON public.followers;
DROP POLICY IF EXISTS "followers_insert_own"      ON public.followers;
DROP POLICY IF EXISTS "followers_delete_own"      ON public.followers;

-- notifications
DROP POLICY IF EXISTS "notifications_select_own"  ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own"  ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_any"  ON public.notifications;


-- ================================================================
-- STEP 5 — CREATE RLS POLICIES
-- ================================================================

-- ── users ────────────────────────────────────────────────────────
-- Anyone (even logged-out) can read public profiles
CREATE POLICY "users_select_all"
  ON public.users FOR SELECT
  USING (true);

-- A user can only insert their OWN row (same id as auth.uid())
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- A user can only update their own row
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- A user can delete only their own row
CREATE POLICY "users_delete_own"
  ON public.users FOR DELETE
  USING (id = auth.uid());


-- ── posts ────────────────────────────────────────────────────────
-- Anyone can read all posts
CREATE POLICY "posts_select_all"
  ON public.posts FOR SELECT
  USING (true);

-- Logged-in users can create posts (user_id must match caller)
CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Only the post owner can edit
CREATE POLICY "posts_update_own"
  ON public.posts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only the post owner can delete
CREATE POLICY "posts_delete_own"
  ON public.posts FOR DELETE
  USING (user_id = auth.uid());


-- ── comments ─────────────────────────────────────────────────────
CREATE POLICY "comments_select_all"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_update_own"
  ON public.comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_delete_own"
  ON public.comments FOR DELETE
  USING (user_id = auth.uid());


-- ── likes ─────────────────────────────────────────────────────────
CREATE POLICY "likes_select_all"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "likes_insert_own"
  ON public.likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Only the liker can remove their own like
CREATE POLICY "likes_delete_own"
  ON public.likes FOR DELETE
  USING (user_id = auth.uid());


-- ── followers ─────────────────────────────────────────────────────
CREATE POLICY "followers_select_all"
  ON public.followers FOR SELECT
  USING (true);

CREATE POLICY "followers_insert_own"
  ON public.followers FOR INSERT
  WITH CHECK (follower_id = auth.uid());

-- Only the follower can remove the follow record they created
CREATE POLICY "followers_delete_own"
  ON public.followers FOR DELETE
  USING (follower_id = auth.uid());


-- ── notifications ─────────────────────────────────────────────────
-- Users see only their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (receiver_id = auth.uid());

-- Any authenticated user can insert a notification (they are the sender)
CREATE POLICY "notifications_insert_any"
  ON public.notifications FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Users can mark only their own notifications as read
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());


-- ================================================================
-- STEP 6 — GRANT PERMISSIONS TO SUPABASE ROLES
-- ================================================================
-- 'anon'          = unauthenticated requests (using anon key)
-- 'authenticated' = logged-in users (JWT verified)
-- The service_role key used by your Node.js backend BYPASSES RLS
-- entirely, so it doesn't need explicit grants.
-- ================================================================

-- anon role can read public data
GRANT SELECT ON public.users         TO anon;
GRANT SELECT ON public.posts         TO anon;
GRANT SELECT ON public.comments      TO anon;
GRANT SELECT ON public.likes         TO anon;
GRANT SELECT ON public.followers     TO anon;

-- authenticated role has full access (RLS policies restrict what
-- rows they can actually touch)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followers     TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.notifications TO authenticated;


-- ================================================================
-- STEP 7 — STORAGE BUCKET FOR UPLOADS (optional but recommended)
-- If you want to use Supabase Storage instead of local disk:
-- ================================================================

-- Create buckets (run separately if you get a "already exists" error)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('posts',   'posts',   true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies — anyone can view, only owner can upload
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    -- Enforce folder = user's own ID
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "posts_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');

CREATE POLICY "posts_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "posts_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );


-- ================================================================
-- STEP 8 — HELPER FUNCTION: get my full profile (used by backend)
-- ================================================================
-- This function is callable via Supabase RPC from the frontend or
-- backend and always returns the caller's own profile + counts.
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT row_to_json(t) INTO result
  FROM (
    SELECT
      u.*,
      (SELECT COUNT(*) FROM public.posts      WHERE user_id   = u.id) AS posts_count,
      (SELECT COUNT(*) FROM public.followers  WHERE following_id = u.id) AS followers_count,
      (SELECT COUNT(*) FROM public.followers  WHERE follower_id  = u.id) AS following_count,
      (SELECT COUNT(*) FROM public.notifications WHERE receiver_id = u.id AND is_read = FALSE) AS unread_notifications
    FROM public.users u
    WHERE u.id = auth.uid()
  ) t;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;


-- ================================================================
-- VERIFICATION
-- ================================================================
DO $$
DECLARE
  tbl TEXT;
  rls_enabled BOOLEAN;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','posts','comments','likes','followers','notifications']
  LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = tbl AND relnamespace = 'public'::regnamespace;

    IF rls_enabled THEN
      RAISE NOTICE '✅  RLS enabled on public.%', tbl;
    ELSE
      RAISE WARNING '❌  RLS NOT enabled on public.%', tbl;
    END IF;
  END LOOP;
END;
$$;

SELECT
  'Auth trigger: '  || CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN '✅ installed' ELSE '❌ MISSING' END  AS trigger_status,
  'FK constraint: ' || CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_fkey'
  ) THEN '✅ installed' ELSE '❌ MISSING' END  AS fk_status;
