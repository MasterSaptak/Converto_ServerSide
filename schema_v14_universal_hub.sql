-- ==============================================================================
-- CONVERTO PLATFORM — V14 UNIVERSAL REQUEST HUB
-- ==============================================================================

-- 1. ENHANCE SERVICE_REQUESTS TABLE (The Universal Hub)
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS request_uid TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'Healthy', -- Healthy, Waiting Patient, Waiting Hospital, Delayed
ADD COLUMN IF NOT EXISTS sla_target_hours INTEGER,
ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER,
ADD COLUMN IF NOT EXISTS document_score INTEGER,
ADD COLUMN IF NOT EXISTS missing_documents TEXT[],
ADD COLUMN IF NOT EXISTS recommended_hospital UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recommended_department UUID REFERENCES public.hospital_departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recommended_doctor UUID REFERENCES public.doctors(id) ON DELETE SET NULL;

-- 2. LINK MEDICAL_REQUESTS TO UNIVERSAL HUB
ALTER TABLE public.medical_requests
ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE UNIQUE;

-- We could drop request_uid from medical_requests, but for backwards compatibility in this mock, we'll keep it or let the app logic handle it. 
-- Ideally, request_uid generation moves to service_requests.

-- Sequence for Universal Case Number Generation (REQ-2026-000001)
CREATE SEQUENCE IF NOT EXISTS universal_request_seq START 1;

CREATE OR REPLACE FUNCTION generate_universal_uid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_uid IS NULL THEN
    NEW.request_uid := 'REQ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('universal_request_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_universal_uid ON public.service_requests;
CREATE TRIGGER trigger_generate_universal_uid
  BEFORE INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION generate_universal_uid();


-- 3. UNIVERSAL ATTACHMENTS (service_documents)
CREATE TABLE IF NOT EXISTS public.service_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    uploader_id UUID,
    
    category TEXT NOT NULL, -- Passport, Invoice, Medical Report, Visa, Insurance, Consent Form, Photo, Receipt, Other
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    
    verification_status TEXT DEFAULT 'Pending', -- Pending, Verified, Rejected
    verified_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INTERNAL CHECKLISTS
CREATE TABLE IF NOT EXISTS public.service_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACTIVITY FEED (Global Slack-like Feed)
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE,
    actor_id UUID, -- Can be staff or profile
    actor_type TEXT, -- 'system', 'staff', 'customer'
    action_type TEXT NOT NULL, -- 'document_uploaded', 'status_changed', 'visa_approved', 'hospital_confirmed'
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Realtime support
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_documents;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_checklists;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
