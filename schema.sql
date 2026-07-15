-- Converto Admin ERP Schema
-- This file defines the extensions to the existing Converto database.

-- 1. Profiles (Ensure staff flag exists)
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE;

-- 2. Staff & Roles
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  balance DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, currency_code)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(20, 2) NOT NULL,
  type TEXT NOT NULL, -- 'credit', 'debit'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  reference_type TEXT, -- 'exchange', 'buy_for_me', 'ticket', 'manual'
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  staff_id UUID REFERENCES staff(id)
);

-- 4. Service Requests (Base Table for polymorphism or common fields)
CREATE TYPE request_status AS ENUM (
  'Draft', 'Submitted', 'Quote Sent', 'Waiting Payment', 
  'Payment Confirmed', 'Assigned', 'Accepted', 'Processing', 
  'Waiting Customer', 'Waiting Vendor', 'Purchased', 'Booked', 
  'Completed', 'Cancelled', 'Rejected', 'Refund Requested', 
  'Refunded', 'Expired'
);

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'exchange', 'buy_for_me', 'ticket'
  status request_status DEFAULT 'Submitted',
  priority TEXT DEFAULT 'Normal', -- 'Low', 'Normal', 'High', 'Urgent'
  assigned_staff_id UUID REFERENCES staff(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Specific Requests
CREATE TABLE IF NOT EXISTS exchange_requests (
  id UUID PRIMARY KEY REFERENCES service_requests(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  from_amount DECIMAL(20, 2) NOT NULL,
  estimated_to_amount DECIMAL(20, 2),
  exchange_rate DECIMAL(20, 6)
);

CREATE TABLE IF NOT EXISTS buy_for_me_requests (
  id UUID PRIMARY KEY REFERENCES service_requests(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_url TEXT,
  product_details TEXT,
  quantity INTEGER DEFAULT 1,
  estimated_price DECIMAL(20, 2)
);

CREATE TABLE IF NOT EXISTS ticket_requests (
  id UUID PRIMARY KEY REFERENCES service_requests(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  venue TEXT,
  ticket_type TEXT,
  quantity INTEGER DEFAULT 1
);

-- 6. Quotes & Payments
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  amount DECIMAL(20, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  valid_until TIMESTAMPTZ,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES staff(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  amount DECIMAL(20, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Communication & Logs
CREATE TABLE IF NOT EXISTS request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id),
  action TEXT NOT NULL,
  details TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Basic example - Staff can see all, Users see their own)
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff see all" ON service_requests FOR SELECT USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid()));
CREATE POLICY "Users see own" ON service_requests FOR SELECT USING (profile_id = auth.uid());
