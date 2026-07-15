-- =====================================================
-- CONVERTO PLATFORM — SCHEMA V4 (Profile Expansion)
-- =====================================================
-- Run this in Supabase SQL Editor to support the 
-- new "My Account" Operations page.
-- =====================================================

-- 1. Update Profiles Table
-- Safely add missing columns to existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Address Fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_postal_code TEXT;

-- 2. Create User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  time_format TEXT DEFAULT '24h',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  dashboard_density TEXT DEFAULT 'comfortable',
  notification_settings JSONB DEFAULT '{"email": true, "push": true, "sms": false, "system_alerts": true, "promotions": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own preferences' AND tablename = 'user_preferences') THEN
    CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT
    USING (profile_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own preferences' AND tablename = 'user_preferences') THEN
    CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR ALL
    USING (profile_id = auth.uid());
  END IF;
END $$;

-- Auto-update updated_at for preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Create Staff Profile View
-- This prevents the frontend from needing complex joins everywhere.
DROP VIEW IF EXISTS public.staff_profile_view;
CREATE VIEW public.staff_profile_view AS
SELECT 
  p.id AS profile_id,
  p.full_name,
  p.username,
  p.email,
  p.phone,
  p.avatar_url,
  p.country,
  p.timezone,
  p.preferred_currency,
  p.address_street,
  p.address_city,
  p.address_state,
  p.address_postal_code,
  p.is_staff,
  p.created_at AS joined_date,
  s.id AS staff_record_id,
  s.is_active AS staff_status,
  s.created_at AS staff_since,
  r.name AS role_name,
  d.name AS department_name
FROM public.profiles p
LEFT JOIN public.staff s ON p.id = s.id
LEFT JOIN public.roles r ON s.role_id = r.id
LEFT JOIN public.departments d ON s.department_id = d.id
WHERE p.is_staff = TRUE;

-- 4. Create Staff Statistics View
-- Useful for profile dashboard cards
DROP VIEW IF EXISTS public.staff_statistics_view;
CREATE VIEW public.staff_statistics_view AS
SELECT 
  s.id AS staff_id,
  COUNT(sr.id) AS assigned_requests,
  COUNT(sr.id) FILTER (WHERE sr.status = 'Completed') AS completed_requests,
  COUNT(sr.id) FILTER (WHERE sr.status = 'Pending' OR sr.status = 'Processing') AS pending_requests,
  -- Calculate average response time safely (requires updated_at and created_at)
  COALESCE(AVG(EXTRACT(EPOCH FROM (sr.updated_at - sr.created_at)) / 3600), 0) AS avg_response_time_hours
FROM public.staff s
LEFT JOIN public.service_requests sr ON s.id = sr.assigned_staff_id
GROUP BY s.id;

-- 5. Setup Storage for Avatars
-- Note: This requires the storage schema which Supabase provides. 
-- We'll insert a bucket if not exists:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public viewing of avatars
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar images are publicly accessible.' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Avatar images are publicly accessible."
      ON storage.objects FOR SELECT
      USING ( bucket_id = 'avatars' );
  END IF;
END $$;

-- Policy to allow authenticated users to upload their own avatars
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can upload an avatar.' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Anyone can upload an avatar."
      ON storage.objects FOR INSERT
      WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatar.' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Users can update their own avatar."
      ON storage.objects FOR UPDATE
      USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
  END IF;
END $$;
