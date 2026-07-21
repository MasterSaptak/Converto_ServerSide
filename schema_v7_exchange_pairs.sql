-- ==============================================================================
-- CONVERTO PLATFORM — V7 EXCHANGE PAIRS MIGRATION
-- Professional Remittance Architecture
-- ==============================================================================

-- 1. Drop old exchange_rates table (data will be re-seeded)
DROP TABLE IF EXISTS public.exchange_rates CASCADE;

-- 2. Exchange Pairs — The single source of truth for corridors
CREATE TABLE IF NOT EXISTS public.exchange_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Corridor Definition
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    payout_method TEXT NOT NULL DEFAULT 'bank_transfer', -- bank_transfer, cash_pickup, mobile_wallet, upi
    
    -- Rates
    market_rate NUMERIC(16, 6) NOT NULL DEFAULT 0,       -- Live reference rate (never used for billing)
    custom_rate NUMERIC(16, 6) NOT NULL DEFAULT 0,       -- The actual Converto rate (used for billing)
    
    -- Fee Rules
    fee_type TEXT NOT NULL DEFAULT 'flat',                -- 'flat', 'percentage', 'hybrid'
    fee_flat NUMERIC(12, 2) NOT NULL DEFAULT 0,           -- Flat fee amount (in from_currency)
    fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,      -- Percentage fee (e.g., 1.50 = 1.5%)
    
    -- Limits
    minimum_amount NUMERIC(14, 2) DEFAULT 100,            -- Minimum send amount (in from_currency)
    maximum_amount NUMERIC(14, 2) DEFAULT 1000000,        -- Maximum send amount (in from_currency)
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Admin tracking
    updated_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,                                           -- Internal admin notes (e.g., "border rate from Akhaura contact")
    
    -- Each corridor is unique per payout method
    UNIQUE(from_currency, to_currency, payout_method)
);

-- 3. Exchange Rate History — Audit trail for who changed what and when
CREATE TABLE IF NOT EXISTS public.exchange_rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID NOT NULL REFERENCES public.exchange_pairs(id) ON DELETE CASCADE,
    
    old_market_rate NUMERIC(16, 6),
    new_market_rate NUMERIC(16, 6),
    old_custom_rate NUMERIC(16, 6),
    new_custom_rate NUMERIC(16, 6),
    old_fee_flat NUMERIC(12, 2),
    new_fee_flat NUMERIC(12, 2),
    old_fee_percentage NUMERIC(5, 2),
    new_fee_percentage NUMERIC(5, 2),
    
    changed_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    change_reason TEXT                                     -- Optional reason for the change
);

-- 4. Seed initial corridors (BDT, INR, USD, EUR, CNY, GBP)
-- These are common South Asian remittance corridors
INSERT INTO public.exchange_pairs 
    (from_currency, to_currency, payout_method, market_rate, custom_rate, fee_type, fee_flat, fee_percentage, minimum_amount, maximum_amount, notes)
VALUES
    -- BDT corridors
    ('BDT', 'INR', 'bank_transfer',    0.7720, 0.7480, 'flat', 100, 0, 500, 500000, 'BD → India bank transfer'),
    ('BDT', 'INR', 'upi',             0.7720, 0.7450, 'flat', 50,  0, 500, 200000, 'BD → India UPI'),
    ('BDT', 'USD', 'bank_transfer',    0.0091, 0.0088, 'flat', 150, 0, 1000, 500000, 'BD → US bank transfer'),
    ('BDT', 'EUR', 'bank_transfer',    0.0084, 0.0081, 'flat', 150, 0, 1000, 500000, 'BD → EU bank transfer'),

    -- INR corridors
    ('INR', 'BDT', 'bank_transfer',    1.2950, 1.3200, 'flat', 50,  0, 500, 500000, 'India → BD bank transfer'),
    ('INR', 'BDT', 'mobile_wallet',    1.2950, 1.3100, 'flat', 30,  0, 500, 100000, 'India → BD mobile wallet'),
    ('INR', 'USD', 'bank_transfer',    0.0120, 0.0116, 'flat', 100, 0, 1000, 500000, 'India → US bank transfer'),

    -- USD corridors
    ('USD', 'BDT', 'bank_transfer',    109.50, 107.80, 'flat', 5,   0, 10,  50000, 'US → BD bank transfer'),
    ('USD', 'INR', 'bank_transfer',    83.15,  81.50,  'flat', 5,   0, 10,  50000, 'US → India bank transfer'),
    ('USD', 'EUR', 'bank_transfer',    0.9200, 0.9050, 'flat', 5,   0, 10,  50000, 'US → EU bank transfer'),

    -- EUR corridors
    ('EUR', 'BDT', 'bank_transfer',    119.00, 117.20, 'flat', 5,   0, 10,  50000, 'EU → BD bank transfer'),
    ('EUR', 'INR', 'bank_transfer',    90.40,  88.80,  'flat', 5,   0, 10,  50000, 'EU → India bank transfer')

ON CONFLICT (from_currency, to_currency, payout_method) DO UPDATE
SET 
    market_rate = EXCLUDED.market_rate,
    custom_rate = EXCLUDED.custom_rate,
    fee_type = EXCLUDED.fee_type,
    fee_flat = EXCLUDED.fee_flat,
    fee_percentage = EXCLUDED.fee_percentage,
    minimum_amount = EXCLUDED.minimum_amount,
    maximum_amount = EXCLUDED.maximum_amount,
    notes = EXCLUDED.notes;

-- 5. RLS Policies
ALTER TABLE public.exchange_pairs ENABLE ROW LEVEL SECURITY;

-- Everyone can read active pairs (needed for user calculator)
CREATE POLICY "Anyone can read active exchange pairs"
    ON public.exchange_pairs FOR SELECT
    USING (is_active = true);

-- Only staff can modify
CREATE POLICY "Staff can manage exchange pairs"
    ON public.exchange_pairs FOR ALL
    USING (EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid()));

ALTER TABLE public.exchange_rate_history ENABLE ROW LEVEL SECURITY;

-- Only staff can read/write history
CREATE POLICY "Staff can manage rate history"
    ON public.exchange_rate_history FOR ALL
    USING (EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid()));
