-- =====================================================
-- CONVERTO PLATFORM — SCHEMA V5 (Platform Architecture)
-- =====================================================
-- Incremental migration on top of schema_v3.sql
-- Transforms CONVERTO from ERP into a Platform
-- Safe to run multiple times (idempotent)
-- =====================================================

-- =====================================================
-- 1. SERVICES REGISTRY — Platform Upgrade
-- =====================================================
-- Add platform columns to existing services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS route TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS requires_documents BOOLEAN DEFAULT FALSE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN DEFAULT TRUE;

-- Backfill code from slug for existing rows
UPDATE public.services SET code = slug WHERE code IS NULL;

-- Backfill routes and colors for existing services
UPDATE public.services SET route = '/services/exchange', color = '#FF90E8', sort_order = 1, requires_documents = FALSE WHERE slug = 'exchange' AND route IS NULL;
UPDATE public.services SET route = '/services/buy-for-me', color = '#FFC900', sort_order = 2, requires_documents = FALSE WHERE slug = 'buy_for_me' AND route IS NULL;
UPDATE public.services SET route = '/services/tickets', color = '#00E5FF', sort_order = 3, requires_documents = TRUE WHERE slug = 'ticket' AND route IS NULL;
UPDATE public.services SET route = '/services/education', color = '#94A3B8', sort_order = 4, requires_documents = TRUE WHERE slug = 'education' AND route IS NULL;
UPDATE public.services SET route = '/services/global-payments', color = '#00FF66', sort_order = 5, requires_documents = FALSE WHERE slug = 'global_payments' AND route IS NULL;

-- =====================================================
-- 2. SERVICE REQUESTS — Pricing Engine Upgrade
-- =====================================================
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS subtotal DECIMAL(20, 2);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS service_fee DECIMAL(20, 2) DEFAULT 0;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS exchange_fee DECIMAL(20, 2) DEFAULT 0;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS discount DECIMAL(20, 2) DEFAULT 0;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS tax DECIMAL(20, 2) DEFAULT 0;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS gateway_fee DECIMAL(20, 2) DEFAULT 0;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS total DECIMAL(20, 2);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS organization_id UUID;

-- =====================================================
-- 3. ORDER STATUS HISTORY — Workflow Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  remarks TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created ON public.order_status_history(created_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users see own order history' AND tablename = 'order_status_history') THEN
    CREATE POLICY "Users see own order history" ON public.order_status_history FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.service_requests sr WHERE sr.id = order_id AND sr.profile_id = auth.uid()
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff see all order history' AND tablename = 'order_status_history') THEN
    CREATE POLICY "Staff see all order history" ON public.order_status_history FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can insert order history' AND tablename = 'order_status_history') THEN
    CREATE POLICY "Staff can insert order history" ON public.order_status_history FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- =====================================================
-- 4. ORDER EVENTS — Timeline System
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  actor UUID,
  actor_type TEXT DEFAULT 'system',  -- 'customer', 'staff', 'system', 'ai'
  metadata JSONB DEFAULT '{}',
  is_customer_visible BOOLEAN DEFAULT TRUE,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_created ON public.order_events(created_at DESC);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users see visible order events' AND tablename = 'order_events') THEN
    CREATE POLICY "Users see visible order events" ON public.order_events FOR SELECT
    USING (
      is_customer_visible = TRUE AND
      EXISTS (SELECT 1 FROM public.service_requests sr WHERE sr.id = order_id AND sr.profile_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff see all order events' AND tablename = 'order_events') THEN
    CREATE POLICY "Staff see all order events" ON public.order_events FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can insert order events' AND tablename = 'order_events') THEN
    CREATE POLICY "Authenticated can insert order events" ON public.order_events FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =====================================================
-- 5. ORDER ASSIGNMENTS — Multi-Staff
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'assigned',  -- 'relationship_manager', 'finance', 'compliance', 'support', 'supervisor'
  is_primary BOOLEAN DEFAULT FALSE,
  organization_id UUID,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, staff_id, role)
);

CREATE INDEX IF NOT EXISTS idx_order_assignments_order ON public.order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_staff ON public.order_assignments(staff_id);

ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users see own order assignments' AND tablename = 'order_assignments') THEN
    CREATE POLICY "Users see own order assignments" ON public.order_assignments FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.service_requests sr WHERE sr.id = order_id AND sr.profile_id = auth.uid()
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff see all assignments' AND tablename = 'order_assignments') THEN
    CREATE POLICY "Staff see all assignments" ON public.order_assignments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage assignments' AND tablename = 'order_assignments') THEN
    CREATE POLICY "Staff can manage assignments" ON public.order_assignments FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- =====================================================
-- 6. DOCUMENTS ENGINE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT FALSE,
  allowed_extensions TEXT[] DEFAULT ARRAY['pdf', 'jpg', 'jpeg', 'png'],
  max_size_mb INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 0,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Document types publicly readable' AND tablename = 'document_types') THEN
    CREATE POLICY "Document types publicly readable" ON public.document_types FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage document types' AND tablename = 'document_types') THEN
    CREATE POLICY "Staff manage document types" ON public.document_types FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type_id UUID REFERENCES public.document_types(id) ON DELETE SET NULL,
  type TEXT NOT NULL,   -- 'passport', 'invoice', 'bank_slip', 'offer_letter', 'receipt', 'id_card', 'other'
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_order ON public.documents(order_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users see own documents' AND tablename = 'documents') THEN
    CREATE POLICY "Users see own documents" ON public.documents FOR SELECT
    USING (customer_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload documents' AND tablename = 'documents') THEN
    CREATE POLICY "Users can upload documents" ON public.documents FOR INSERT
    WITH CHECK (customer_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff see all documents' AND tablename = 'documents') THEN
    CREATE POLICY "Staff see all documents" ON public.documents FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage documents' AND tablename = 'documents') THEN
    CREATE POLICY "Staff can manage documents" ON public.documents FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- =====================================================
-- 7. SERVICE WORKFLOWS — Dynamic Step Definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_key TEXT NOT NULL,      -- machine-readable key, e.g. 'awaiting_payment'
  step_order INTEGER NOT NULL,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  is_initial BOOLEAN DEFAULT FALSE,
  is_final BOOLEAN DEFAULT FALSE,
  can_customer_view BOOLEAN DEFAULT TRUE,
  requires_staff BOOLEAN DEFAULT FALSE,
  requires_documents BOOLEAN DEFAULT FALSE,
  allowed_next_steps TEXT[] DEFAULT '{}',  -- array of step_keys this can transition to
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_service_workflows_service ON public.service_workflows(service_id);

ALTER TABLE public.service_workflows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workflows publicly readable' AND tablename = 'service_workflows') THEN
    CREATE POLICY "Workflows publicly readable" ON public.service_workflows FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage workflows' AND tablename = 'service_workflows') THEN
    CREATE POLICY "Staff manage workflows" ON public.service_workflows FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- =====================================================
-- 8. PRICING ENGINE — Dynamic Rules
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT,                     -- NULL = applies to all currencies
  fee_type TEXT NOT NULL DEFAULT 'percentage',  -- 'percentage', 'fixed', 'tiered'
  percentage DECIMAL(10, 4) DEFAULT 0,
  fixed_fee DECIMAL(20, 2) DEFAULT 0,
  minimum DECIMAL(20, 2) DEFAULT 0,
  maximum DECIMAL(20, 2),            -- NULL = no maximum
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB DEFAULT '{}',     -- flexible rule conditions
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_service ON public.pricing_rules(service_id);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Pricing rules readable by auth' AND tablename = 'pricing_rules') THEN
    CREATE POLICY "Pricing rules readable by auth" ON public.pricing_rules FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage pricing rules' AND tablename = 'pricing_rules') THEN
    CREATE POLICY "Staff manage pricing rules" ON public.pricing_rules FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- =====================================================
-- 9. SERVICE FIELDS — Dynamic Forms
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',  -- 'text', 'number', 'select', 'date', 'file', 'textarea', 'currency', 'url', 'email', 'phone'
  required BOOLEAN DEFAULT FALSE,
  placeholder TEXT,
  help_text TEXT,
  default_value TEXT,
  validation JSONB DEFAULT '{}',     -- { min, max, pattern, options (for select), etc. }
  options JSONB DEFAULT '[]',        -- for select/radio: [{ value, label }]
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  group_name TEXT,                   -- group fields visually
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_service_fields_service ON public.service_fields(service_id);

ALTER TABLE public.service_fields ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service fields publicly readable' AND tablename = 'service_fields') THEN
    CREATE POLICY "Service fields publicly readable" ON public.service_fields FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage service fields' AND tablename = 'service_fields') THEN
    CREATE POLICY "Staff manage service fields" ON public.service_fields FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- =====================================================
-- 10. FEATURE FLAGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'general',   -- 'general', 'module', 'experimental', 'beta'
  metadata JSONB DEFAULT '{}',
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Feature flags readable by auth' AND tablename = 'feature_flags') THEN
    CREATE POLICY "Feature flags readable by auth" ON public.feature_flags FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage feature flags' AND tablename = 'feature_flags') THEN
    CREATE POLICY "Staff manage feature flags" ON public.feature_flags FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- =====================================================
-- 11. DASHBOARD WIDGETS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  component TEXT NOT NULL,        -- component name to render
  description TEXT,
  position INTEGER DEFAULT 0,
  size TEXT DEFAULT 'medium',     -- 'small', 'medium', 'large', 'full'
  visible_to_roles TEXT[] DEFAULT '{}',  -- empty = visible to all staff
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff see dashboard widgets' AND tablename = 'dashboard_widgets') THEN
    CREATE POLICY "Staff see dashboard widgets" ON public.dashboard_widgets FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage dashboard widgets' AND tablename = 'dashboard_widgets') THEN
    CREATE POLICY "Staff manage dashboard widgets" ON public.dashboard_widgets FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- =====================================================
-- 12. UPGRADE EXISTING TABLES
-- =====================================================

-- Notifications: add delivery status tracking
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Audit logs: add browser fingerprint
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS browser TEXT;

-- Multi-tenant readiness on key existing tables
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.exchange_rates ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Payments: add gateway and transaction_id to base table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- =====================================================
-- 13. AUTO-LOG STATUS CHANGES — Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, organization_id)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.organization_id);

    INSERT INTO public.order_events (order_id, event, actor, actor_type, metadata, organization_id)
    VALUES (
      NEW.id,
      'Status changed from ' || COALESCE(OLD.status, 'none') || ' to ' || NEW.status,
      auth.uid(),
      CASE WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE) THEN 'staff' ELSE 'customer' END,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
      NEW.organization_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_change ON public.service_requests;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- =====================================================
-- 14. AUTO-LOG ORDER CREATION — Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_order_creation()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, organization_id)
  VALUES (NEW.id, NULL, NEW.status, auth.uid(), NEW.organization_id);

  INSERT INTO public.order_events (order_id, event, actor, actor_type, metadata, organization_id)
  VALUES (
    NEW.id,
    'Order created',
    auth.uid(),
    'customer',
    jsonb_build_object('service_id', NEW.service_id, 'status', NEW.status),
    NEW.organization_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_created ON public.service_requests;
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_order_creation();

-- =====================================================
-- 15. ENABLE REALTIME ON NEW TABLES
-- =====================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 16. SEED DATA — Service Workflows
-- =====================================================

-- Exchange Workflow
INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, 'Draft', 'draft', 1, '#6B7280', 'FileEdit', TRUE, FALSE, FALSE, ARRAY['awaiting_payment']
FROM public.services s WHERE s.slug = 'exchange'
ON CONFLICT (service_id, step_key) DO NOTHING;

INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, 'Awaiting Payment', 'awaiting_payment', 2, '#F59E0B', 'CreditCard', FALSE, FALSE, FALSE, ARRAY['payment_verified', 'cancelled']
FROM public.services s WHERE s.slug = 'exchange'
ON CONFLICT (service_id, step_key) DO NOTHING;

INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, 'Payment Verified', 'payment_verified', 3, '#10B981', 'CheckCircle', FALSE, FALSE, TRUE, ARRAY['assigned']
FROM public.services s WHERE s.slug = 'exchange'
ON CONFLICT (service_id, step_key) DO NOTHING;

INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, 'Assigned', 'assigned', 4, '#3B82F6', 'UserPlus', FALSE, FALSE, TRUE, ARRAY['processing']
FROM public.services s WHERE s.slug = 'exchange'
ON CONFLICT (service_id, step_key) DO NOTHING;

INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, 'Processing', 'processing', 5, '#8B5CF6', 'Loader', FALSE, FALSE, TRUE, ARRAY['rate_locked']
FROM public.services s WHERE s.slug = 'exchange'
ON CONFLICT (service_id, step_key) DO NOTHING;

INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, 'Rate Locked', 'rate_locked', 6, '#EC4899', 'Lock', FALSE, FALSE, TRUE, ARRAY['funds_sent']
FROM public.services s WHERE s.slug = 'exchange'
ON CONFLICT (service_id, step_key) DO NOTHING;

INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, 'Funds Sent', 'funds_sent', 7, '#06B6D4', 'Send', FALSE, FALSE, TRUE, ARRAY['completed']
FROM public.services s WHERE s.slug = 'exchange'
ON CONFLICT (service_id, step_key) DO NOTHING;

INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, 'Completed', 'completed', 8, '#22C55E', 'CheckCheck', FALSE, TRUE, FALSE, ARRAY['archived']
FROM public.services s WHERE s.slug = 'exchange'
ON CONFLICT (service_id, step_key) DO NOTHING;

INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, 'Cancelled', 'cancelled', 9, '#EF4444', 'XCircle', FALSE, TRUE, FALSE, '{}'
FROM public.services s WHERE s.slug = 'exchange'
ON CONFLICT (service_id, step_key) DO NOTHING;

-- Buy For Me Workflow
INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, v.step_name, v.step_key, v.step_order, v.color, v.icon, v.is_initial, v.is_final, v.requires_staff, v.allowed_next_steps
FROM public.services s,
(VALUES
  ('Draft', 'draft', 1, '#6B7280', 'FileEdit', TRUE, FALSE, FALSE, ARRAY['waiting_quotation']),
  ('Waiting Quotation', 'waiting_quotation', 2, '#F59E0B', 'Clock', FALSE, FALSE, TRUE, ARRAY['customer_approved', 'cancelled']),
  ('Customer Approved', 'customer_approved', 3, '#10B981', 'ThumbsUp', FALSE, FALSE, FALSE, ARRAY['awaiting_payment']),
  ('Awaiting Payment', 'awaiting_payment', 4, '#F59E0B', 'CreditCard', FALSE, FALSE, FALSE, ARRAY['payment_verified', 'cancelled']),
  ('Payment Verified', 'payment_verified', 5, '#10B981', 'CheckCircle', FALSE, FALSE, TRUE, ARRAY['purchased']),
  ('Purchased', 'purchased', 6, '#3B82F6', 'ShoppingCart', FALSE, FALSE, TRUE, ARRAY['international_shipping']),
  ('International Shipping', 'international_shipping', 7, '#8B5CF6', 'Plane', FALSE, FALSE, TRUE, ARRAY['domestic_shipping']),
  ('Domestic Shipping', 'domestic_shipping', 8, '#EC4899', 'Truck', FALSE, FALSE, TRUE, ARRAY['delivered']),
  ('Delivered', 'delivered', 9, '#22C55E', 'PackageCheck', FALSE, TRUE, FALSE, ARRAY['archived']),
  ('Cancelled', 'cancelled', 10, '#EF4444', 'XCircle', FALSE, TRUE, FALSE, '{}')
) AS v(step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
WHERE s.slug = 'buy_for_me'
ON CONFLICT (service_id, step_key) DO NOTHING;

-- Ticket Booking Workflow
INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, v.step_name, v.step_key, v.step_order, v.color, v.icon, v.is_initial, v.is_final, v.requires_staff, v.allowed_next_steps
FROM public.services s,
(VALUES
  ('Draft', 'draft', 1, '#6B7280', 'FileEdit', TRUE, FALSE, FALSE, ARRAY['document_verification']),
  ('Document Verification', 'document_verification', 2, '#F59E0B', 'FileSearch', FALSE, FALSE, TRUE, ARRAY['awaiting_payment', 'cancelled']),
  ('Awaiting Payment', 'awaiting_payment', 3, '#F59E0B', 'CreditCard', FALSE, FALSE, FALSE, ARRAY['payment_verified', 'cancelled']),
  ('Payment Verified', 'payment_verified', 4, '#10B981', 'CheckCircle', FALSE, FALSE, TRUE, ARRAY['booking']),
  ('Booking', 'booking', 5, '#3B82F6', 'Calendar', FALSE, FALSE, TRUE, ARRAY['ticket_issued']),
  ('Ticket Issued', 'ticket_issued', 6, '#8B5CF6', 'Ticket', FALSE, FALSE, TRUE, ARRAY['completed']),
  ('Completed', 'completed', 7, '#22C55E', 'CheckCheck', FALSE, TRUE, FALSE, ARRAY['archived']),
  ('Cancelled', 'cancelled', 8, '#EF4444', 'XCircle', FALSE, TRUE, FALSE, '{}')
) AS v(step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
WHERE s.slug = 'ticket'
ON CONFLICT (service_id, step_key) DO NOTHING;

-- Education Payments Workflow
INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, v.step_name, v.step_key, v.step_order, v.color, v.icon, v.is_initial, v.is_final, v.requires_staff, v.allowed_next_steps
FROM public.services s,
(VALUES
  ('Draft', 'draft', 1, '#6B7280', 'FileEdit', TRUE, FALSE, FALSE, ARRAY['document_verification']),
  ('Document Verification', 'document_verification', 2, '#F59E0B', 'FileSearch', FALSE, FALSE, TRUE, ARRAY['awaiting_payment', 'cancelled']),
  ('Awaiting Payment', 'awaiting_payment', 3, '#F59E0B', 'CreditCard', FALSE, FALSE, FALSE, ARRAY['payment_verified', 'cancelled']),
  ('Payment Verified', 'payment_verified', 4, '#10B981', 'CheckCircle', FALSE, FALSE, TRUE, ARRAY['payment_sent']),
  ('Payment Sent', 'payment_sent', 5, '#3B82F6', 'Send', FALSE, FALSE, TRUE, ARRAY['receipt_generated']),
  ('Receipt Generated', 'receipt_generated', 6, '#8B5CF6', 'Receipt', FALSE, FALSE, TRUE, ARRAY['completed']),
  ('Completed', 'completed', 7, '#22C55E', 'CheckCheck', FALSE, TRUE, FALSE, ARRAY['archived']),
  ('Cancelled', 'cancelled', 8, '#EF4444', 'XCircle', FALSE, TRUE, FALSE, '{}')
) AS v(step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
WHERE s.slug = 'education'
ON CONFLICT (service_id, step_key) DO NOTHING;

-- Global Payments Workflow
INSERT INTO public.service_workflows (service_id, step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
SELECT s.id, v.step_name, v.step_key, v.step_order, v.color, v.icon, v.is_initial, v.is_final, v.requires_staff, v.allowed_next_steps
FROM public.services s,
(VALUES
  ('Draft', 'draft', 1, '#6B7280', 'FileEdit', TRUE, FALSE, FALSE, ARRAY['compliance_check']),
  ('Compliance Check', 'compliance_check', 2, '#F59E0B', 'Shield', FALSE, FALSE, TRUE, ARRAY['approved', 'rejected']),
  ('Approved', 'approved', 3, '#10B981', 'CheckCircle', FALSE, FALSE, TRUE, ARRAY['awaiting_payment']),
  ('Awaiting Payment', 'awaiting_payment', 4, '#F59E0B', 'CreditCard', FALSE, FALSE, FALSE, ARRAY['payment_verified', 'cancelled']),
  ('Payment Verified', 'payment_verified', 5, '#10B981', 'CheckCircle', FALSE, FALSE, TRUE, ARRAY['executing']),
  ('Executing', 'executing', 6, '#3B82F6', 'Zap', FALSE, FALSE, TRUE, ARRAY['receipt_generated']),
  ('Receipt Generated', 'receipt_generated', 7, '#8B5CF6', 'Receipt', FALSE, FALSE, TRUE, ARRAY['completed']),
  ('Completed', 'completed', 8, '#22C55E', 'CheckCheck', FALSE, TRUE, FALSE, ARRAY['archived']),
  ('Rejected', 'rejected', 9, '#EF4444', 'XCircle', FALSE, TRUE, FALSE, '{}'),
  ('Cancelled', 'cancelled', 10, '#EF4444', 'XCircle', FALSE, TRUE, FALSE, '{}')
) AS v(step_name, step_key, step_order, color, icon, is_initial, is_final, requires_staff, allowed_next_steps)
WHERE s.slug = 'global_payments'
ON CONFLICT (service_id, step_key) DO NOTHING;

-- =====================================================
-- 17. SEED DATA — Document Types
-- =====================================================
INSERT INTO public.document_types (service_id, name, description, required, allowed_extensions, max_size_mb, sort_order)
SELECT s.id, v.name, v.description, v.required, v.allowed_extensions, v.max_size_mb, v.sort_order
FROM public.services s,
(VALUES
  ('exchange', 'Payment Proof', 'Screenshot or receipt of your payment', TRUE, ARRAY['pdf','jpg','jpeg','png'], 10, 1),
  ('exchange', 'ID Document', 'Government-issued photo ID', FALSE, ARRAY['pdf','jpg','jpeg','png'], 10, 2),
  ('buy_for_me', 'Product Screenshot', 'Screenshot of the product you want', FALSE, ARRAY['jpg','jpeg','png','webp'], 10, 1),
  ('buy_for_me', 'Payment Proof', 'Screenshot or receipt of your payment', TRUE, ARRAY['pdf','jpg','jpeg','png'], 10, 2),
  ('ticket', 'Passport', 'Passport bio page for booking', TRUE, ARRAY['pdf','jpg','jpeg','png'], 10, 1),
  ('ticket', 'Visa Copy', 'Valid visa if required for destination', FALSE, ARRAY['pdf','jpg','jpeg','png'], 10, 2),
  ('ticket', 'Payment Proof', 'Screenshot or receipt of your payment', TRUE, ARRAY['pdf','jpg','jpeg','png'], 10, 3),
  ('education', 'University Offer Letter', 'Admission or offer letter from the institution', TRUE, ARRAY['pdf'], 20, 1),
  ('education', 'Invoice / Fee Schedule', 'Tuition invoice or fee breakdown', TRUE, ARRAY['pdf','jpg','jpeg','png'], 20, 2),
  ('education', 'Student ID', 'Valid student identification', FALSE, ARRAY['pdf','jpg','jpeg','png'], 10, 3),
  ('education', 'Payment Proof', 'Screenshot or receipt of your payment', TRUE, ARRAY['pdf','jpg','jpeg','png'], 10, 4),
  ('global_payments', 'Invoice', 'Invoice or payment instruction document', FALSE, ARRAY['pdf','jpg','jpeg','png'], 20, 1),
  ('global_payments', 'ID Document', 'Government-issued photo ID', FALSE, ARRAY['pdf','jpg','jpeg','png'], 10, 2),
  ('global_payments', 'Payment Proof', 'Screenshot or receipt of your payment', TRUE, ARRAY['pdf','jpg','jpeg','png'], 10, 3)
) AS v(service_slug, name, description, required, allowed_extensions, max_size_mb, sort_order)
WHERE s.slug = v.service_slug
ON CONFLICT DO NOTHING;

-- =====================================================
-- 18. SEED DATA — Pricing Rules
-- =====================================================
INSERT INTO public.pricing_rules (service_id, name, fee_type, percentage, fixed_fee, minimum, is_active)
SELECT s.id, v.name, v.fee_type, v.percentage, v.fixed_fee, v.minimum, TRUE
FROM public.services s,
(VALUES
  ('exchange', 'Exchange Service Fee', 'percentage', 2.5, 0, 0),
  ('buy_for_me', 'Buy For Me Service Fee', 'percentage', 5.0, 0, 0),
  ('buy_for_me', 'Processing Fee', 'fixed', 0, 5.00, 0),
  ('ticket', 'Booking Fee', 'fixed', 0, 10.00, 0),
  ('education', 'Transfer Fee', 'percentage', 1.5, 0, 0),
  ('education', 'Processing Fee', 'fixed', 0, 15.00, 0),
  ('global_payments', 'Transfer Fee', 'percentage', 2.0, 0, 0),
  ('global_payments', 'Compliance Fee', 'fixed', 0, 5.00, 0)
) AS v(service_slug, name, fee_type, percentage, fixed_fee, minimum)
WHERE s.slug = v.service_slug
ON CONFLICT DO NOTHING;

-- =====================================================
-- 19. SEED DATA — Feature Flags
-- =====================================================
INSERT INTO public.feature_flags (key, name, description, enabled, category) VALUES
  ('module.exchange', 'Currency Exchange', 'Enable Currency Exchange module', TRUE, 'module'),
  ('module.buy_for_me', 'Buy For Me', 'Enable Buy For Me module', TRUE, 'module'),
  ('module.ticket', 'Ticket Booking', 'Enable Ticket Booking module', TRUE, 'module'),
  ('module.education', 'Education Payments', 'Enable Education Payments module', TRUE, 'module'),
  ('module.global_payments', 'Global Payments', 'Enable Global Payments module', TRUE, 'module'),
  ('module.support', 'Live Support', 'Enable Live Support module', TRUE, 'module'),
  ('feature.wallet', 'Wallet System', 'Enable Wallet for customers', TRUE, 'general'),
  ('feature.live_rates', 'Live Exchange Rates', 'Show live exchange rates', TRUE, 'general'),
  ('feature.dynamic_forms', 'Dynamic Forms', 'Use database-driven forms for services', FALSE, 'experimental'),
  ('feature.automation', 'Automation Engine', 'Enable workflow automation rules', FALSE, 'experimental'),
  ('feature.multi_tenant', 'Multi-Tenant', 'Enable multi-organization support', FALSE, 'experimental'),
  ('feature.reports', 'Reports Module', 'Enable reports and analytics', FALSE, 'beta'),
  ('feature.ai_suggestions', 'AI Suggestions', 'Enable AI-powered suggestions', FALSE, 'beta')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 20. SEED DATA — Dashboard Widgets
-- =====================================================
INSERT INTO public.dashboard_widgets (title, component, description, position, size, visible_to_roles, is_active) VALUES
  ('Total Revenue', 'RevenueWidget', 'Shows total revenue and growth', 1, 'small', ARRAY['owner', 'admin', 'finance'], TRUE),
  ('Today''s Orders', 'TodaysOrdersWidget', 'Count of orders created today', 2, 'small', '{}', TRUE),
  ('Profit Margin', 'ProfitWidget', 'Shows profit margin and fees collected', 3, 'small', ARRAY['owner', 'admin', 'finance'], TRUE),
  ('Growth', 'GrowthWidget', 'Month-over-month growth chart', 4, 'small', ARRAY['owner', 'admin'], TRUE),
  ('Recent Orders', 'RecentOrdersWidget', 'Latest orders table', 5, 'large', '{}', TRUE),
  ('Open Tickets', 'OpenTicketsWidget', 'Open support tickets count', 6, 'small', ARRAY['support', 'admin'], TRUE),
  ('Pending Payments', 'PendingPaymentsWidget', 'Payments awaiting verification', 7, 'medium', ARRAY['finance', 'admin'], TRUE),
  ('System Activity', 'SystemActivityWidget', 'Live system activity feed', 8, 'medium', '{}', TRUE),
  ('Exchange Rates', 'ExchangeRatesWidget', 'Current exchange rates overview', 9, 'medium', ARRAY['owner', 'admin', 'finance'], TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 21. SEED DATA — Service Fields (Dynamic Forms)
-- =====================================================

-- Exchange Fields
INSERT INTO public.service_fields (service_id, field_key, label, type, required, placeholder, position, group_name)
SELECT s.id, v.field_key, v.label, v.type, v.required, v.placeholder, v.position, v.group_name
FROM public.services s,
(VALUES
  ('send_currency', 'Send Currency', 'currency', TRUE, 'Select currency to send', 1, 'Transfer Details'),
  ('receive_currency', 'Receive Currency', 'currency', TRUE, 'Select currency to receive', 2, 'Transfer Details'),
  ('amount', 'Amount', 'number', TRUE, 'Enter amount', 3, 'Transfer Details'),
  ('recipient_name', 'Recipient Name', 'text', FALSE, 'Full name of recipient', 4, 'Recipient'),
  ('recipient_account', 'Recipient Account', 'text', FALSE, 'Account number or details', 5, 'Recipient'),
  ('notes', 'Notes', 'textarea', FALSE, 'Any additional instructions', 6, NULL)
) AS v(field_key, label, type, required, placeholder, position, group_name)
WHERE s.slug = 'exchange'
ON CONFLICT (service_id, field_key) DO NOTHING;

-- Buy For Me Fields
INSERT INTO public.service_fields (service_id, field_key, label, type, required, placeholder, position, group_name)
SELECT s.id, v.field_key, v.label, v.type, v.required, v.placeholder, v.position, v.group_name
FROM public.services s,
(VALUES
  ('store', 'Store / Website', 'select', TRUE, 'Select the store', 1, 'Product Details'),
  ('product_url', 'Product URL', 'url', TRUE, 'Paste the product link', 2, 'Product Details'),
  ('product_name', 'Product Name', 'text', TRUE, 'Name of the product', 3, 'Product Details'),
  ('quantity', 'Quantity', 'number', TRUE, '1', 4, 'Product Details'),
  ('product_details', 'Additional Details', 'textarea', FALSE, 'Size, color, specifications...', 5, 'Product Details'),
  ('shipping_address', 'Shipping Address', 'textarea', TRUE, 'Your delivery address', 6, 'Delivery'),
  ('notes', 'Notes', 'textarea', FALSE, 'Any special instructions', 7, NULL)
) AS v(field_key, label, type, required, placeholder, position, group_name)
WHERE s.slug = 'buy_for_me'
ON CONFLICT (service_id, field_key) DO NOTHING;

-- Ticket Fields
INSERT INTO public.service_fields (service_id, field_key, label, type, required, placeholder, position, group_name)
SELECT s.id, v.field_key, v.label, v.type, v.required, v.placeholder, v.position, v.group_name
FROM public.services s,
(VALUES
  ('ticket_type', 'Ticket Type', 'select', TRUE, 'Select ticket type', 1, 'Trip Details'),
  ('origin', 'Origin', 'text', TRUE, 'Departure city', 2, 'Trip Details'),
  ('destination', 'Destination', 'text', TRUE, 'Arrival city', 3, 'Trip Details'),
  ('travel_date', 'Travel Date', 'date', TRUE, 'Select date', 4, 'Trip Details'),
  ('return_date', 'Return Date', 'date', FALSE, 'Select return date (if round trip)', 5, 'Trip Details'),
  ('passengers', 'Number of Passengers', 'number', TRUE, '1', 6, 'Passengers'),
  ('passenger_names', 'Passenger Names', 'textarea', TRUE, 'Full names as on passport', 7, 'Passengers'),
  ('notes', 'Notes', 'textarea', FALSE, 'Class preference, special requirements...', 8, NULL)
) AS v(field_key, label, type, required, placeholder, position, group_name)
WHERE s.slug = 'ticket'
ON CONFLICT (service_id, field_key) DO NOTHING;

-- Education Fields
INSERT INTO public.service_fields (service_id, field_key, label, type, required, placeholder, position, group_name)
SELECT s.id, v.field_key, v.label, v.type, v.required, v.placeholder, v.position, v.group_name
FROM public.services s,
(VALUES
  ('institution', 'University / Institution', 'text', TRUE, 'Name of the institution', 1, 'Institution'),
  ('country', 'Country', 'text', TRUE, 'Country of the institution', 2, 'Institution'),
  ('student_name', 'Student Name', 'text', TRUE, 'Full name of the student', 3, 'Student'),
  ('student_id', 'Student ID', 'text', FALSE, 'Student ID or application number', 4, 'Student'),
  ('program', 'Program / Course', 'text', FALSE, 'Program name', 5, 'Student'),
  ('semester', 'Semester / Term', 'text', FALSE, 'Current semester', 6, 'Student'),
  ('amount', 'Amount', 'number', TRUE, 'Payment amount', 7, 'Payment'),
  ('currency', 'Currency', 'currency', TRUE, 'Payment currency', 8, 'Payment'),
  ('purpose', 'Purpose', 'select', TRUE, 'Select purpose', 9, 'Payment'),
  ('notes', 'Notes', 'textarea', FALSE, 'Any additional details', 10, NULL)
) AS v(field_key, label, type, required, placeholder, position, group_name)
WHERE s.slug = 'education'
ON CONFLICT (service_id, field_key) DO NOTHING;

-- Global Payments Fields
INSERT INTO public.service_fields (service_id, field_key, label, type, required, placeholder, position, group_name)
SELECT s.id, v.field_key, v.label, v.type, v.required, v.placeholder, v.position, v.group_name
FROM public.services s,
(VALUES
  ('payment_type', 'Payment Type', 'select', TRUE, 'Select type', 1, 'Payment'),
  ('recipient_name', 'Recipient Name', 'text', TRUE, 'Full name or company', 2, 'Recipient'),
  ('recipient_country', 'Recipient Country', 'text', TRUE, 'Country', 3, 'Recipient'),
  ('recipient_bank', 'Recipient Bank', 'text', FALSE, 'Bank name', 4, 'Recipient'),
  ('recipient_account', 'Account / IBAN', 'text', FALSE, 'Account number or IBAN', 5, 'Recipient'),
  ('swift_code', 'SWIFT/BIC Code', 'text', FALSE, 'Bank SWIFT code', 6, 'Recipient'),
  ('amount', 'Amount', 'number', TRUE, 'Payment amount', 7, 'Amount'),
  ('currency', 'Currency', 'currency', TRUE, 'Payment currency', 8, 'Amount'),
  ('purpose', 'Purpose of Payment', 'text', TRUE, 'Why you are sending this payment', 9, 'Details'),
  ('notes', 'Notes', 'textarea', FALSE, 'Any additional instructions', 10, NULL)
) AS v(field_key, label, type, required, placeholder, position, group_name)
WHERE s.slug = 'global_payments'
ON CONFLICT (service_id, field_key) DO NOTHING;

-- =====================================================
-- 22. ADD NEW PERMISSIONS
-- =====================================================
INSERT INTO public.permissions (id, description, category) VALUES
  ('orders.view', 'View all orders', 'orders'),
  ('orders.manage', 'Create, update, and manage orders', 'orders'),
  ('orders.assign', 'Assign staff to orders', 'orders'),
  ('orders.delete', 'Delete orders', 'orders'),
  ('documents.view', 'View all documents', 'documents'),
  ('documents.manage', 'Upload and manage documents', 'documents'),
  ('documents.verify', 'Verify customer documents', 'documents'),
  ('workflows.view', 'View workflow configurations', 'workflows'),
  ('workflows.manage', 'Create and edit workflows', 'workflows'),
  ('pricing.view', 'View pricing rules', 'pricing'),
  ('pricing.manage', 'Create and edit pricing rules', 'pricing'),
  ('features.view', 'View feature flags', 'features'),
  ('features.manage', 'Toggle feature flags', 'features'),
  ('reports.view', 'View reports and analytics', 'reports'),
  ('reports.export', 'Export reports', 'reports'),
  ('dashboard.customize', 'Customize dashboard widgets', 'dashboard')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- DONE — CONVERTO Platform v5 Migration Complete
-- =====================================================
