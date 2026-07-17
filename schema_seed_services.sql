-- =====================================================
-- 0. ENSURE COLUMNS EXIST (From schema_v5_platform)
-- =====================================================
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS route TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS requires_documents BOOLEAN DEFAULT FALSE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN DEFAULT TRUE;

-- Update existing records if they have null codes (so the UNIQUE constraint works)
UPDATE public.services SET code = slug WHERE code IS NULL;

-- =====================================================
-- SEED CORE SERVICES 
-- This script safely inserts the 6 default Converto services.
-- It ensures that if they already exist by SLUG, they are updated
-- with the correct codes, routes and colors.
-- =====================================================

-- 1. Insert Exchange Service
INSERT INTO public.services (code, name, description, slug, route, color, sort_order, requires_documents, requires_payment, is_active)
VALUES (
  'exchange', 
  'Money Exchange', 
  'Convert currencies at competitive rates', 
  'exchange', 
  '/services/exchange', 
  '#FF90E8', 
  1, 
  false, 
  true, 
  true
) ON CONFLICT (slug) DO UPDATE 
  SET code = EXCLUDED.code, route = EXCLUDED.route, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

-- 2. Insert Buy For Me Service
INSERT INTO public.services (code, name, description, slug, route, color, sort_order, requires_documents, requires_payment, is_active)
VALUES (
  'buy_for_me', 
  'Buy For Me', 
  'We purchase items on your behalf worldwide', 
  'buy_for_me', 
  '/services/buy-for-me', 
  '#FFC900', 
  2, 
  false, 
  true, 
  true
) ON CONFLICT (slug) DO UPDATE 
  SET code = EXCLUDED.code, route = EXCLUDED.route, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

-- 3. Insert Ticket Booking Service
INSERT INTO public.services (code, name, description, slug, route, color, sort_order, requires_documents, requires_payment, is_active)
VALUES (
  'ticket_booking', 
  'Ticket Booking', 
  'Book flights, trains, and bus tickets', 
  'tickets', 
  '/services/tickets', 
  '#00E5FF', 
  3, 
  true, 
  true, 
  true
) ON CONFLICT (slug) DO UPDATE 
  SET code = EXCLUDED.code, route = EXCLUDED.route, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

-- 4. Insert Education Service
INSERT INTO public.services (code, name, description, slug, route, color, sort_order, requires_documents, requires_payment, is_active)
VALUES (
  'education', 
  'Educational Payment', 
  'Pay tuition and university fees globally', 
  'education', 
  '/services/education', 
  '#94A3B8', 
  4, 
  true, 
  true, 
  true
) ON CONFLICT (slug) DO UPDATE 
  SET code = EXCLUDED.code, route = EXCLUDED.route, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

-- 5. Insert Global Payments Service
INSERT INTO public.services (code, name, description, slug, route, color, sort_order, requires_documents, requires_payment, is_active)
VALUES (
  'payments', 
  'Money Transfer', 
  'Send money across borders instantly', 
  'global_payments', 
  '/services/global-payments', 
  '#00FF66', 
  5, 
  false, 
  true, 
  true
) ON CONFLICT (slug) DO UPDATE 
  SET code = EXCLUDED.code, route = EXCLUDED.route, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

-- 6. Insert Order Tracking (Internal Utility)
INSERT INTO public.services (code, name, description, slug, route, color, sort_order, requires_documents, requires_payment, is_active)
VALUES (
  'track', 
  'Order Tracking', 
  'Real-time status updates on all orders', 
  'track', 
  '/track', 
  '#FF5C00', 
  6, 
  false, 
  false, 
  true
) ON CONFLICT (slug) DO UPDATE 
  SET code = EXCLUDED.code, route = EXCLUDED.route, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;
