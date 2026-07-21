-- ==============================================================================
-- CONVERTO PLATFORM — V13 MEDICAL MODULE MIGRATION
-- ==============================================================================

-- 1. HOSPITALS DIRECTORY
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT,
    city TEXT,
    address TEXT,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hospital_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.hospital_departments(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    specialization TEXT,
    qualifications TEXT,
    languages TEXT[],
    experience_years INTEGER,
    photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MEDICAL REQUESTS (Prepared for future Universal Service Engine)
CREATE TABLE IF NOT EXISTS public.medical_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Universal Engine Prep Fields
    request_uid TEXT UNIQUE, -- e.g., MED-2026-000154
    service_type TEXT DEFAULT 'medical',
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    case_owner_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Draft',
    priority TEXT DEFAULT 'Routine', -- Routine, Priority, Urgent, Emergency
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,

    -- Contact Information
    contact_name TEXT,
    contact_mobile TEXT,
    contact_whatsapp TEXT,
    contact_email TEXT,
    preferred_contact_method TEXT,
    preferred_contact_time TEXT,

    -- Medical Information
    medical_problem TEXT,
    symptoms TEXT,
    existing_diagnosis TEXT,
    previous_diagnosis TEXT,
    department_required TEXT,
    existing_conditions TEXT[],
    previous_surgery TEXT,
    current_medicines TEXT,
    allergies TEXT,
    blood_group TEXT,
    height TEXT,
    weight TEXT,

    -- Hospital Preference
    preferred_hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    preferred_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    assigned_hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    assigned_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    preferred_consultation TEXT,
    preferred_language TEXT,

    -- Travel Information
    expected_travel_date DATE,
    expected_return_date DATE,
    visa_status TEXT,
    arrival_airport TEXT,
    arrival_city TEXT,
    needs_pickup BOOLEAN DEFAULT FALSE,
    needs_hotel BOOLEAN DEFAULT FALSE,
    needs_translator BOOLEAN DEFAULT FALSE,
    needs_local_transport BOOLEAN DEFAULT FALSE,
    accommodation_preference TEXT,

    -- Additional Info
    special_requests TEXT,

    -- Payments (Future Reservation)
    consultation_fee DECIMAL(20, 2) DEFAULT 0,
    hospital_fee DECIMAL(20, 2) DEFAULT 0,
    service_charge DECIMAL(20, 2) DEFAULT 0,
    visa_fee DECIMAL(20, 2) DEFAULT 0,
    hotel_fee DECIMAL(20, 2) DEFAULT 0,
    transport_fee DECIMAL(20, 2) DEFAULT 0,
    discount DECIMAL(20, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    payment_status TEXT DEFAULT 'Unpaid'
);

-- 3. MEDICAL PATIENTS (Supports Multiple Patients per Booking)
CREATE TABLE IF NOT EXISTS public.medical_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT TRUE,
    
    full_name TEXT NOT NULL,
    gender TEXT,
    date_of_birth DATE,
    nationality TEXT,
    marital_status TEXT,
    
    passport_number TEXT,
    national_id TEXT,
    driving_license TEXT,
    other_id TEXT,
    
    current_address TEXT,
    permanent_address TEXT,
    city TEXT,
    district TEXT,
    state_region TEXT,
    country TEXT,
    postal_code TEXT,
    
    emergency_contact_name TEXT,
    emergency_contact_relation TEXT,
    emergency_contact_phone TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEDICAL ATTENDANTS
CREATE TABLE IF NOT EXISTS public.medical_attendants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT,
    gender TEXT,
    age INTEGER,
    passport_number TEXT,
    national_id TEXT,
    mobile_number TEXT,
    whatsapp_number TEXT,
    email TEXT,
    nationality TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MEDICAL DOCUMENTS
CREATE TABLE IF NOT EXISTS public.medical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.medical_patients(id) ON DELETE SET NULL,
    uploader_id UUID, -- Can be customer or staff
    
    category TEXT NOT NULL, -- Identity, Medical, Travel, Insurance, Other
    sub_category TEXT,      -- Prescription, MRI, CT, X-Ray, Diagnosis, Referral Letter
    
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    
    verification_status TEXT DEFAULT 'Pending', -- Pending, Verified, Rejected
    verified_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    remarks TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MEDICAL TIMELINES (Append-Only Audit Trail)
CREATE TABLE IF NOT EXISTS public.medical_timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
    
    old_status TEXT,
    new_status TEXT NOT NULL,
    event_description TEXT,
    
    actor_id UUID,
    actor_type TEXT DEFAULT 'system', -- 'customer', 'staff', 'system'
    is_customer_visible BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MEDICAL STAFF ASSIGNMENTS (CRM Style)
CREATE TABLE IF NOT EXISTS public.medical_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Support Staff', -- 'Case Owner', 'Support Staff'
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES public.staff(id),
    UNIQUE(request_id, staff_id, role)
);

-- 8. MEDICAL NOTES (Internal)
CREATE TABLE IF NOT EXISTS public.medical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. MEDICAL MESSAGES (Communication Log)
CREATE TABLE IF NOT EXISTS public.medical_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- 'WhatsApp', 'Call', 'Email', 'Meeting'
    direction TEXT NOT NULL, -- 'Inbound', 'Outbound'
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. MEDICAL TASKS (Follow-Ups)
CREATE TABLE IF NOT EXISTS public.medical_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed', 'Cancelled'
    priority TEXT DEFAULT 'Routine',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Realtime Configuration
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_requests;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_timelines;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_documents;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sequence for Case Number Generation (MED-2026-000001)
CREATE SEQUENCE IF NOT EXISTS medical_request_seq START 1;

-- Function to generate the UID
CREATE OR REPLACE FUNCTION generate_medical_uid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_uid IS NULL THEN
    NEW.request_uid := 'MED-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('medical_request_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_medical_uid ON public.medical_requests;
CREATE TRIGGER trigger_generate_medical_uid
  BEFORE INSERT ON public.medical_requests
  FOR EACH ROW EXECUTE FUNCTION generate_medical_uid();

-- Add Medical Service to Registry
INSERT INTO public.services (code, name, description, slug, icon, route, requires_documents, requires_payment, color, sort_order)
VALUES (
    'medical', 
    'Medical Appointment Booking', 
    'Book appointments with hospitals and specialists', 
    'medical',
    'HeartPulse',
    '/services/medical',
    true, 
    false,
    '#8B5CF6',
    6
)
ON CONFLICT (code) DO NOTHING;
