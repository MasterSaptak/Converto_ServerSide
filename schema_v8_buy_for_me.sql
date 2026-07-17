-- ==============================================================================
-- CONVERTO PLATFORM — V8 BUY FOR ME MODULE MIGRATION
-- ==============================================================================

-- 1. Configure Service Status
-- Ensure 'buy_for_me' service exists in services table
INSERT INTO public.services (code, name, description, slug, icon, route, requires_documents, requires_payment)
VALUES (
    'buy_for_me', 
    'Buy For Me', 
    'Paste a product link and we buy it for you globally', 
    'buy-for-me',
    'ShoppingBag',
    '/services/buy-for-me',
    false, 
    true
)
ON CONFLICT (code) DO NOTHING;

-- 2. Add default workflows for buy_for_me
DO $$ 
DECLARE
    v_service_id UUID;
BEGIN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'buy_for_me';
    
    IF v_service_id IS NOT NULL THEN
        INSERT INTO public.service_workflows (service_id, step_order, step_name, status_code, requires_documents, requires_payment, is_terminal)
        VALUES 
            (v_service_id, 1, 'Draft Request', 'draft', false, false, false),
            (v_service_id, 2, 'Quote Requested', 'quote_requested', false, false, false),
            (v_service_id, 3, 'Quote Sent', 'quote_sent', false, false, false),
            (v_service_id, 4, 'Awaiting Payment', 'awaiting_payment', false, true, false),
            (v_service_id, 5, 'Purchasing Item', 'purchasing', false, false, false),
            (v_service_id, 6, 'Shipped to Customer', 'shipped', false, false, false),
            (v_service_id, 7, 'Delivered', 'completed', false, false, true),
            (v_service_id, 8, 'Rejected', 'rejected', false, false, true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
