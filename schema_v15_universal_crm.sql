-- ==============================================================================
-- CONVERTO PLATFORM — V15 UNIVERSAL CRM FOUNDATION
-- ==============================================================================
-- This schema establishes a unified architecture for all Converto services.
-- ==============================================================================

-- 1. ENHANCE UNIVERSAL CRM CORE (service_requests)
-- Note: 'request_uid' already added in v14, adding SLA and AI fields properly.
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'medical', -- medical, exchange, visa, etc.
ADD COLUMN IF NOT EXISTS global_status TEXT DEFAULT 'Draft',
ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'On Track',
ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_remaining_minutes INTEGER,
ADD COLUMN IF NOT EXISTS completion_score INTEGER,
ADD COLUMN IF NOT EXISTS missing_requirements TEXT[],
ADD COLUMN IF NOT EXISTS priority_score INTEGER,
ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMPTZ;

-- Rename 'Healthy' health status to 'On Track' globally (safe to run if column already existed with old data)
UPDATE public.service_requests SET health_status = 'On Track' WHERE health_status = 'Healthy';

-- 2. UNIVERSAL RELATIONSHIP TABLES
-- These tables link only to service_requests and cover ALL services.

-- 2.1 Universal Timelines
CREATE TABLE IF NOT EXISTS public.service_timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    status_changed_to TEXT,
    note TEXT,
    created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Universal Messages
CREATE TABLE IF NOT EXISTS public.service_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    sender_id UUID, -- could be user or staff
    sender_type TEXT NOT NULL, -- 'customer' or 'staff'
    message_content TEXT NOT NULL,
    is_internal_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Universal Notes (Internal Staff Notes)
CREATE TABLE IF NOT EXISTS public.service_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    note_content TEXT NOT NULL,
    author_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Universal Tasks (Expanded from checklists)
CREATE TABLE IF NOT EXISTS public.service_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    task_title TEXT NOT NULL,
    task_description TEXT,
    assigned_to UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'Pending', -- Pending, In Progress, Completed
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Universal Payments
CREATE TABLE IF NOT EXISTS public.service_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_status TEXT DEFAULT 'Pending', -- Pending, Completed, Failed, Refunded
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Universal Activity Logs (Global Feed)
-- Ensure activity_feed exists first, then add service_type if needed.
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by UUID, -- can be user or staff
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_feed
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- 3. UNIVERSAL PARTNER ECOSYSTEM
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_name TEXT NOT NULL,
    partner_type TEXT NOT NULL, -- hospital, exchange_agent, university, visa_agency
    country TEXT,
    city TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.1 Partner Services (Linking requests to partners)
CREATE TABLE IF NOT EXISTS public.partner_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Active'
);

-- 4. MODULE-SPECIFIC TABLES (Lean business data)
-- Ensure medical_requests only holds business logic.
CREATE TABLE IF NOT EXISTS public.medical_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE,
    patient_id UUID, -- Links to auth.users or public.users
    recommended_hospital UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    recommended_department TEXT,
    condition_details TEXT,
    symptoms TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_notification_prefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- Links to auth.users or public.users
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REALTIME SUPPORT
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_timelines;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_tasks;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_payments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
