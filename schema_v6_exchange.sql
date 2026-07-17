-- ==============================================================================
-- CONVERTO PLATFORM — V6 EXCHANGE MODULE MIGRATION
-- ==============================================================================

-- 1. Exchange Rates Table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC(16, 6) NOT NULL, -- The base market rate
    margin_percentage NUMERIC(5, 2) DEFAULT 0.00, -- e.g., 2.50 for 2.5% markup
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    UNIQUE(from_currency, to_currency)
);

-- Insert dummy data for demo
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, margin_percentage)
VALUES 
  ('USD', 'EUR', 0.92, 1.5),
  ('EUR', 'USD', 1.08, 1.5),
  ('GBP', 'USD', 1.25, 2.0),
  ('USD', 'GBP', 0.80, 2.0)
ON CONFLICT (from_currency, to_currency) DO UPDATE 
SET rate = EXCLUDED.rate, margin_percentage = EXCLUDED.margin_percentage;

-- 2. Configure Service Status
-- Ensure 'exchange' service exists in services table
INSERT INTO public.services (code, name, description, slug, icon, route, requires_documents, requires_payment)
VALUES (
    'exchange', 
    'Currency Exchange', 
    'Convert and transfer money globally', 
    'exchange',
    'ArrowRightLeft',
    '/services/exchange',
    true, 
    true
)
ON CONFLICT (code) DO NOTHING;

-- Add default workflows for exchange
DO $$ 
DECLARE
    v_service_id UUID;
BEGIN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'exchange';
    
    IF v_service_id IS NOT NULL THEN
        INSERT INTO public.service_workflows (service_id, step_order, step_name, status_code, requires_documents, requires_payment, is_terminal)
        VALUES 
            (v_service_id, 1, 'Draft Request', 'draft', false, false, false),
            (v_service_id, 2, 'KYC Verification', 'verifying', true, false, false),
            (v_service_id, 3, 'Awaiting Payment', 'awaiting_payment', false, true, false),
            (v_service_id, 4, 'Processing Transfer', 'processing', false, false, false),
            (v_service_id, 5, 'Completed', 'completed', false, false, true),
            (v_service_id, 6, 'Rejected', 'rejected', false, false, true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
