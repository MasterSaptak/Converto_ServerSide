-- ==============================================================================
-- CONVERTO PLATFORM — V8 SCALABLE TRANSFER CORRIDORS
-- Professional Remittance Architecture
-- ==============================================================================

-- 1. Create Transfer Methods (Lookup Table)
CREATE TABLE IF NOT EXISTS public.transfer_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,           -- 'banking', 'digital_wallets', 'international', 'other'
    icon TEXT,                        -- e.g., 'SiBinance', 'BsBank'
    country TEXT,                     -- 'India', 'Bangladesh', or 'Global'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rename exchange_pairs to transfer_corridors (If it exists)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exchange_pairs') THEN
      ALTER TABLE public.exchange_pairs RENAME TO transfer_corridors;
  END IF;
END $$;

-- Drop the old unique constraint involving payout_method
ALTER TABLE public.transfer_corridors DROP CONSTRAINT IF EXISTS exchange_pairs_from_currency_to_currency_payout_method_key;

-- 3. Add Country Columns
ALTER TABLE public.transfer_corridors ADD COLUMN IF NOT EXISTS from_country TEXT;
ALTER TABLE public.transfer_corridors ADD COLUMN IF NOT EXISTS to_country TEXT;

-- Seed default countries based on currency for existing records
UPDATE public.transfer_corridors SET from_country = 'India' WHERE from_currency = 'INR' AND from_country IS NULL;
UPDATE public.transfer_corridors SET to_country = 'India' WHERE to_currency = 'INR' AND to_country IS NULL;
UPDATE public.transfer_corridors SET from_country = 'Bangladesh' WHERE from_currency = 'BDT' AND from_country IS NULL;
UPDATE public.transfer_corridors SET to_country = 'Bangladesh' WHERE to_currency = 'BDT' AND to_country IS NULL;

-- 4. Deduplicate existing rows to ensure ONE row per from_country/to_country
-- We keep the first one found, delete others
DELETE FROM public.transfer_corridors a USING (
      SELECT MIN(ctid) as ctid, from_currency, to_currency
        FROM public.transfer_corridors 
        GROUP BY from_currency, to_currency HAVING COUNT(*) > 1
      ) b
      WHERE a.from_currency = b.from_currency 
      AND a.to_currency = b.to_currency 
      AND a.ctid <> b.ctid;

-- Now add the new unique constraint
ALTER TABLE public.transfer_corridors ADD CONSTRAINT transfer_corridors_from_to_country_key UNIQUE (from_country, to_country);

-- Drop payout_method column
ALTER TABLE public.transfer_corridors DROP COLUMN IF EXISTS payout_method;

-- 5. Create Junction Tables
CREATE TABLE IF NOT EXISTS public.corridor_send_methods (
    corridor_id UUID REFERENCES public.transfer_corridors(id) ON DELETE CASCADE,
    transfer_method_id UUID REFERENCES public.transfer_methods(id) ON DELETE CASCADE,
    PRIMARY KEY (corridor_id, transfer_method_id)
);

CREATE TABLE IF NOT EXISTS public.corridor_receive_methods (
    corridor_id UUID REFERENCES public.transfer_corridors(id) ON DELETE CASCADE,
    transfer_method_id UUID REFERENCES public.transfer_methods(id) ON DELETE CASCADE,
    PRIMARY KEY (corridor_id, transfer_method_id)
);

-- Seed Transfer Methods
INSERT INTO public.transfer_methods (name, category, icon, country) VALUES
('Bank Transfer', 'banking', 'BsBank', 'Global'),
('UPI', 'banking', 'SiPhonepe', 'India'),
('Binance', 'digital_wallets', 'SiBinance', 'Global'),
('USDT', 'digital_wallets', 'SiTether', 'Global'),
('Wise', 'international', 'SiWise', 'Global'),
('Remitly', 'international', 'Send', 'Global'),
('TapTap Send', 'international', 'Zap', 'Global'),
('PayPal', 'other', 'SiPaypal', 'Global'),
('Cash', 'other', 'Banknote', 'Global'),
('bKash', 'digital_wallets', 'Smartphone', 'Bangladesh'),
('Nagad', 'digital_wallets', 'Smartphone', 'Bangladesh'),
('Rocket', 'digital_wallets', 'Smartphone', 'Bangladesh'),
('Cash Pickup', 'other', 'Banknote', 'Global');

-- Link all existing corridors to all methods just as a starting point
DO $$
DECLARE
  corridor RECORD;
  tm RECORD;
BEGIN
  FOR corridor IN SELECT * FROM public.transfer_corridors LOOP
    FOR tm IN SELECT * FROM public.transfer_methods LOOP
      INSERT INTO public.corridor_send_methods (corridor_id, transfer_method_id) VALUES (corridor.id, tm.id) ON CONFLICT DO NOTHING;
      INSERT INTO public.corridor_receive_methods (corridor_id, transfer_method_id) VALUES (corridor.id, tm.id) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
