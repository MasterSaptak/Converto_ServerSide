-- ==============================================================================
-- CONVERTO PLATFORM — V11 GLOBAL PAYMENTS MODULE MIGRATION
-- ==============================================================================

-- 1. Configure Service Status
-- Ensure 'global_payments' service exists in services table
INSERT INTO public.services (code, name, description, slug, icon, route, requires_documents, requires_payment)
VALUES (
    'global_payments', 
    'Global Payments', 
    'Send money to businesses or individuals internationally', 
    'global-payments',
    'Globe',
    '/services/global-payments',
    false, 
    true
)
ON CONFLICT (code) DO NOTHING;

-- 2. Add default workflows for global_payments
DO $$ 
DECLARE
    v_service_id UUID;
BEGIN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'global_payments';
    
    IF v_service_id IS NOT NULL THEN
        INSERT INTO public.service_workflows (service_id, step_order, step_name, status_code, requires_documents, requires_payment, is_terminal)
        VALUES 
            (v_service_id, 1, 'Draft Request', 'draft', false, false, false),
            (v_service_id, 2, 'Quote Requested', 'quote_requested', false, false, false),
            (v_service_id, 3, 'Compliance Check', 'compliance_check', false, false, false),
            (v_service_id, 4, 'Quote Sent', 'quote_sent', false, false, false),
            (v_service_id, 5, 'Awaiting Payment', 'awaiting_payment', false, true, false),
            (v_service_id, 6, 'Transferring Funds', 'transferring_funds', false, false, false),
            (v_service_id, 7, 'Completed', 'completed', false, false, true),
            (v_service_id, 8, 'Rejected', 'rejected', false, false, true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
