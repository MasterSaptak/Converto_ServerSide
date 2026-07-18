-- ==============================================================================
-- CONVERTO PLATFORM — V7 AUTHENTICATION & SECURITY MIGRATION
-- ==============================================================================

-- 1. Create a trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'phone_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Basic Row Level Security (RLS) Policies
-- Note: Requires RLS to be enabled on the tables

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile, and staff to view all profiles
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Staff can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_staff = true));

-- Enable RLS on Service Requests
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own requests, and staff to view all requests
CREATE POLICY "Users can view own requests" 
  ON public.service_requests FOR SELECT 
  USING (auth.uid() = profile_id);

CREATE POLICY "Staff can view all requests" 
  ON public.service_requests FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_staff = true));
  
CREATE POLICY "Users can insert own requests"
  ON public.service_requests FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Staff can update any request"
  ON public.service_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_staff = true));

-- Default super admin (Change email to your actual email)
-- UPDATE public.profiles SET is_staff = true WHERE email = 'admin@example.com';
