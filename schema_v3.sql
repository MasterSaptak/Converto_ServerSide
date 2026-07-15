-- =====================================================
-- CONVERTO PLATFORM — SCHEMA V3 (Production)
-- =====================================================
-- Run this in Supabase SQL Editor.
-- Prerequisites: profiles table from setup.sql must already exist.
-- This script is IDEMPOTENT — safe to run multiple times.
-- =====================================================

-- =====================================================
-- 0. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. PROFILES — Add staff flag + email column
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Allow staff to read all profiles (for CRM)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view all profiles' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Staff can view all profiles"
    ON public.profiles FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE)
    );
  END IF;
END $$;

-- Allow staff to update all profiles (for CRM editing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Staff can update all profiles' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Staff can update all profiles"
    ON public.profiles FOR UPDATE
    USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE)
    );
  END IF;
END $$;

-- =====================================================
-- 2. SERVICE REGISTRY — Dynamic services
-- =====================================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  requires_quote BOOLEAN DEFAULT TRUE,
  supports_wallet BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Services are publicly readable' AND tablename = 'services'
  ) THEN
    CREATE POLICY "Services are publicly readable"
    ON public.services FOR SELECT
    USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage services' AND tablename = 'services'
  ) THEN
    CREATE POLICY "Staff can manage services"
    ON public.services FOR ALL
    USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE)
    );
  END IF;
END $$;

-- =====================================================
-- 3. DEPARTMENTS, ROLES, PERMISSIONS, STAFF
-- =====================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop old roles table if it exists (schema.sql had a simpler version)
DROP TABLE IF EXISTS public.roles CASCADE;

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id TEXT PRIMARY KEY,
  description TEXT,
  category TEXT
);

-- Drop old staff table if it exists (schema.sql had a simpler version)
DROP TABLE IF EXISTS public.staff CASCADE;

CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_permissions (
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, permission_id)
);

-- RLS for staff tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff tables readable by staff' AND tablename = 'staff') THEN
    CREATE POLICY "Staff tables readable by staff" ON public.staff FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Departments readable by staff' AND tablename = 'departments') THEN
    CREATE POLICY "Departments readable by staff" ON public.departments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Roles readable by staff' AND tablename = 'roles') THEN
    CREATE POLICY "Roles readable by staff" ON public.roles FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permissions readable by staff' AND tablename = 'permissions') THEN
    CREATE POLICY "Permissions readable by staff" ON public.permissions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff permissions readable by staff' AND tablename = 'staff_permissions') THEN
    CREATE POLICY "Staff permissions readable by staff" ON public.staff_permissions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- =====================================================
-- 4. SERVICE REQUESTS — Hybrid model
-- =====================================================
-- Drop the old enum type if it exists
DROP TYPE IF EXISTS request_status CASCADE;

-- Drop old service-specific tables
DROP TABLE IF EXISTS public.exchange_requests CASCADE;
DROP TABLE IF EXISTS public.buy_for_me_requests CASCADE;
DROP TABLE IF EXISTS public.ticket_requests CASCADE;

-- Drop old service_requests to rebuild
DROP TABLE IF EXISTS public.request_messages CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.service_requests CASCADE;

CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  status TEXT NOT NULL DEFAULT 'Submitted',
  priority TEXT DEFAULT 'Normal',
  amount DECIMAL(20, 2),
  currency TEXT,
  assigned_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  quote_id UUID,
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_service_requests_profile ON public.service_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_service ON public.service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_currency ON public.service_requests(currency);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON public.service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned ON public.service_requests(assigned_staff_id);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own requests"
ON public.service_requests FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "Users can create requests"
ON public.service_requests FOR INSERT
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Staff see all requests"
ON public.service_requests FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Staff can update all requests"
ON public.service_requests FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Staff can delete requests"
ON public.service_requests FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 5. QUOTE ENGINE
-- =====================================================
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  amount DECIMAL(20, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  margin DECIMAL(20, 2) DEFAULT 0,
  breakdown JSONB DEFAULT '{}',
  valid_until TIMESTAMPTZ,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK back-reference
ALTER TABLE public.service_requests
  ADD CONSTRAINT fk_service_requests_quote
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see quotes for own requests"
ON public.quotes FOR SELECT
USING (EXISTS (SELECT 1 FROM public.service_requests sr WHERE sr.id = request_id AND sr.profile_id = auth.uid()));

CREATE POLICY "Staff see all quotes"
ON public.quotes FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Staff can manage quotes"
ON public.quotes FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Users can update quotes for own requests"
ON public.quotes FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.service_requests sr WHERE sr.id = request_id AND sr.profile_id = auth.uid()));

-- =====================================================
-- 6. PAYMENTS SYSTEM
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  amount DECIMAL(20, 2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  method_id UUID REFERENCES public.payment_methods(id),
  gateway_reference TEXT,
  gateway_response JSONB DEFAULT '{}',
  status TEXT DEFAULT 'initiated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount DECIMAL(20, 2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  processed_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment methods readable" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "Users see own payments" ON public.payments FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Staff see all payments" ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff manage payments" ON public.payments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 7. WALLET & LEDGER (Advanced)
-- =====================================================
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL,
  available_balance DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
  locked_balance DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
  reserved_balance DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_id, currency_code)
);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_account_id UUID NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE CASCADE,
  amount DECIMAL(20, 2) NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.wallet_transactions(id) ON DELETE CASCADE,
  description TEXT,
  available_balance_after DECIMAL(20, 2) NOT NULL,
  locked_balance_after DECIMAL(20, 2) NOT NULL DEFAULT 0,
  reserved_balance_after DECIMAL(20, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own wallet" ON public.wallets FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users see own wallet accounts" ON public.wallet_accounts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = wallet_id AND w.profile_id = auth.uid()));
CREATE POLICY "Users see own wallet transactions" ON public.wallet_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.wallet_accounts wa
    JOIN public.wallets w ON w.id = wa.wallet_id
    WHERE wa.id = wallet_account_id AND w.profile_id = auth.uid()
  ));
CREATE POLICY "Staff see all wallets" ON public.wallets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff see all wallet accounts" ON public.wallet_accounts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff see all wallet transactions" ON public.wallet_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff manage wallet transactions" ON public.wallet_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 8. EXCHANGE RATES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  market_rate DECIMAL(20, 6) NOT NULL,
  buy_rate DECIMAL(20, 6) NOT NULL,
  sell_rate DECIMAL(20, 6) NOT NULL,
  margin DECIMAL(20, 4) DEFAULT 0,
  provider TEXT DEFAULT 'manual',
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_currency, target_currency)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exchange rates publicly readable" ON public.exchange_rates FOR SELECT USING (true);
CREATE POLICY "Staff manage exchange rates" ON public.exchange_rates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 9. CONVERSATIONS & MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL DEFAULT 'support',
  context_id UUID,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open',
  subject TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations" ON public.conversations FOR SELECT
  USING (profile_id = auth.uid());
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Staff see all conversations" ON public.conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff manage conversations" ON public.conversations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Users see messages in own conversations" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.profile_id = auth.uid()) AND is_internal = FALSE);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.profile_id = auth.uid()));
CREATE POLICY "Staff see all messages" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff can send messages" ON public.messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 10. NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'system',
  priority TEXT DEFAULT 'normal',
  channel TEXT[] DEFAULT ARRAY['in_app'],
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  icon TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT
  USING (profile_id = auth.uid() OR profile_id IS NULL);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
  USING (profile_id = auth.uid());
CREATE POLICY "Staff see all notifications" ON public.notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff can create notifications" ON public.notifications FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 11. CAMPAIGNS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'promo',
  title TEXT NOT NULL,
  description TEXT,
  content JSONB DEFAULT '{}',
  icon TEXT,
  color TEXT,
  href TEXT,
  tag TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active campaigns are publicly readable" ON public.campaigns FOR SELECT
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));
CREATE POLICY "Staff see all campaigns" ON public.campaigns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff manage campaigns" ON public.campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 12. SETTINGS (Global)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by authenticated" ON public.settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff manage settings" ON public.settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 13. ACTIVITY LOGS (User actions)
-- =====================================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own activity" ON public.activity_logs FOR SELECT
  USING (profile_id = auth.uid());
CREATE POLICY "Staff see all activity" ON public.activity_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Authenticated can insert activity" ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 14. AUDIT LOGS (Staff admin actions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_staff ON public.audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff see audit logs" ON public.audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff can create audit logs" ON public.audit_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 15. AI-READY TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  input JSONB,
  output JSONB,
  model TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  suggestion_type TEXT NOT NULL,
  suggestion JSONB NOT NULL,
  confidence DECIMAL(5, 4),
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES public.ai_suggestions(id),
  action_type TEXT NOT NULL,
  input JSONB,
  result JSONB,
  status TEXT DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff see AI tables" ON public.ai_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff see AI suggestions" ON public.ai_suggestions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
CREATE POLICY "Staff see AI actions" ON public.ai_actions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- =====================================================
-- 16. ENABLE SUPABASE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;

-- =====================================================
-- 17. SEED DATA
-- =====================================================

-- Services
INSERT INTO public.services (name, slug, icon, description, requires_quote, supports_wallet) VALUES
  ('Currency Exchange', 'exchange', 'ArrowLeftRight', 'Exchange currencies at competitive rates', TRUE, TRUE),
  ('Buy For Me', 'buy_for_me', 'ShoppingBag', 'We purchase products on your behalf from international stores', TRUE, TRUE),
  ('Ticket Booking', 'ticket', 'Ticket', 'Book event tickets, flights, and travel arrangements', TRUE, TRUE),
  ('Education Payments', 'education', 'GraduationCap', 'Pay tuition and education fees internationally', TRUE, TRUE),
  ('Global Payments', 'global_payments', 'Globe', 'Send payments to anyone, anywhere in the world', TRUE, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Departments
INSERT INTO public.departments (name, description) VALUES
  ('Operations', 'Core operations and request management'),
  ('Finance', 'Financial operations, wallets, and payments'),
  ('Support', 'Customer support and communication'),
  ('Management', 'Platform administration and oversight')
ON CONFLICT (name) DO NOTHING;

-- Permissions
INSERT INTO public.permissions (id, description, category) VALUES
  ('requests.view', 'View service requests', 'requests'),
  ('requests.manage', 'Create, update, and assign requests', 'requests'),
  ('requests.delete', 'Delete service requests', 'requests'),
  ('quotes.view', 'View quotes', 'quotes'),
  ('quotes.manage', 'Create and update quotes', 'quotes'),
  ('customers.view', 'View customer profiles', 'customers'),
  ('customers.edit', 'Edit customer profiles', 'customers'),
  ('wallet.view', 'View wallet balances and transactions', 'wallet'),
  ('wallet.manage', 'Credit, debit, and manage wallets', 'wallet'),
  ('finance.view', 'View financial reports', 'finance'),
  ('finance.manage', 'Manage payments and refunds', 'finance'),
  ('messaging.view', 'View conversations', 'messaging'),
  ('messaging.send', 'Send messages and notifications', 'messaging'),
  ('campaigns.view', 'View campaigns', 'campaigns'),
  ('campaigns.manage', 'Create and manage campaigns', 'campaigns'),
  ('staff.view', 'View staff members', 'staff'),
  ('staff.manage', 'Manage staff and roles', 'staff'),
  ('settings.view', 'View platform settings', 'settings'),
  ('settings.manage', 'Update platform settings', 'settings'),
  ('audit.view', 'View audit logs', 'audit'),
  ('system.view', 'View system health', 'system'),
  ('exchange_rates.view', 'View exchange rates', 'exchange'),
  ('exchange_rates.manage', 'Manage exchange rates', 'exchange')
ON CONFLICT (id) DO NOTHING;

-- Default Settings
INSERT INTO public.settings (key, value, description, category) VALUES
  ('exchange_margin', '"2.5"', 'Default exchange rate margin percentage', 'exchange'),
  ('default_currency', '"USD"', 'Default platform currency', 'general'),
  ('support_email', '"support@converto.com"', 'Support contact email', 'general'),
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode', 'system'),
  ('quote_validity_hours', '24', 'Default hours a quote remains valid', 'quotes'),
  ('max_exchange_amount', '50000', 'Maximum single exchange amount', 'exchange'),
  ('notification_email_enabled', 'true', 'Enable email notifications', 'notifications'),
  ('platform_name', '"CONVERTO"', 'Platform display name', 'general'),
  ('commission_rate', '"1.5"', 'Default commission rate percentage', 'finance')
ON CONFLICT (key) DO NOTHING;

-- Payment Methods
INSERT INTO public.payment_methods (name, slug, is_active) VALUES
  ('Wallet', 'wallet', TRUE),
  ('Bank Transfer', 'bank_transfer', TRUE),
  ('Card Payment', 'card', FALSE)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 18. HELPER FUNCTION: Auto-create wallet on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.wallets (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- =====================================================
-- 19. HELPER FUNCTION: Update updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_wallet_accounts_updated_at ON public.wallet_accounts;
CREATE TRIGGER update_wallet_accounts_updated_at
  BEFORE UPDATE ON public.wallet_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
