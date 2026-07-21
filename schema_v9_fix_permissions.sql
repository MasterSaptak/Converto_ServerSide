-- ==============================================================================
-- CONVERTO PLATFORM — V9 FIX PERMISSIONS
-- Run this in your Supabase SQL Editor to make the methods visible!
-- ==============================================================================

-- Grant SELECT permissions to the public (anon) and logged-in (authenticated) users
-- so the frontend can read the available transfer methods.
GRANT SELECT ON public.transfer_methods TO anon, authenticated;
GRANT SELECT ON public.corridor_send_methods TO anon, authenticated;
GRANT SELECT ON public.corridor_receive_methods TO anon, authenticated;

-- Ensure RLS isn't blocking reads by making read explicitly open
ALTER TABLE public.transfer_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_send_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_receive_methods ENABLE ROW LEVEL SECURITY;

-- Add policies to allow anyone to read these tables
DROP POLICY IF EXISTS "Allow public read transfer_methods" ON public.transfer_methods;
CREATE POLICY "Allow public read transfer_methods" ON public.transfer_methods FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read corridor_send_methods" ON public.corridor_send_methods;
CREATE POLICY "Allow public read corridor_send_methods" ON public.corridor_send_methods FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read corridor_receive_methods" ON public.corridor_receive_methods;
CREATE POLICY "Allow public read corridor_receive_methods" ON public.corridor_receive_methods FOR SELECT USING (true);
