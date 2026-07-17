-- ==============================================================================
-- CONVERTO PLATFORM — V10 EDUCATION MODULE MIGRATION
-- ==============================================================================

-- 1. Configure Service Status
-- Ensure 'education' service exists in services table
INSERT INTO public.services (code, name, description, slug, icon, route, requires_documents, requires_payment)
VALUES (
    'education', 
    'Education Payments', 
    'Pay university tuitions and fees globally securely', 
    'education',
    'GraduationCap',
    '/services/education',
    true, 
    true
)
ON CONFLICT (code) DO NOTHING;

-- 2. Add default workflows for education
DO $$ 
DECLARE
    v_service_id UUID;
BEGIN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'education';
    
    IF v_service_id IS NOT NULL THEN
        INSERT INTO public.service_workflows (service_id, step_order, step_name, status_code, requires_documents, requires_payment, is_terminal)
        VALUES 
            (v_service_id, 1, 'Draft Request', 'draft', false, false, false),
            (v_service_id, 2, 'Quote Requested', 'quote_requested', true, false, false),
            (v_service_id, 3, 'Verifying Institution', 'verifying_institution', true, false, false),
            (v_service_id, 4, 'Quote Sent', 'quote_sent', false, false, false),
            (v_service_id, 5, 'Awaiting Payment', 'awaiting_payment', false, true, false),
            (v_service_id, 6, 'Processing Payment', 'processing_payment', false, false, false),
            (v_service_id, 7, 'Completed', 'completed', false, false, true),
            (v_service_id, 8, 'Rejected', 'rejected', false, false, true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
