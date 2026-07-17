-- ==============================================================================
-- CONVERTO PLATFORM — V9 TICKET BOOKING MODULE MIGRATION
-- ==============================================================================

-- 1. Configure Service Status
-- Ensure 'ticket_booking' service exists in services table
INSERT INTO public.services (code, name, description, slug, icon, route, requires_documents, requires_payment)
VALUES (
    'ticket_booking', 
    'Ticket Booking', 
    'Book flights, hotels, and events globally', 
    'tickets',
    'Ticket',
    '/services/tickets',
    true, 
    true
)
ON CONFLICT (code) DO NOTHING;

-- 2. Add default workflows for ticket_booking
DO $$ 
DECLARE
    v_service_id UUID;
BEGIN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ticket_booking';
    
    IF v_service_id IS NOT NULL THEN
        INSERT INTO public.service_workflows (service_id, step_order, step_name, status_code, requires_documents, requires_payment, is_terminal)
        VALUES 
            (v_service_id, 1, 'Draft Request', 'draft', false, false, false),
            (v_service_id, 2, 'Quote Requested', 'quote_requested', false, false, false),
            (v_service_id, 3, 'Quote Sent', 'quote_sent', false, false, false),
            (v_service_id, 4, 'Awaiting Payment', 'awaiting_payment', false, true, false),
            (v_service_id, 5, 'Issuing Tickets', 'issuing', true, false, false),
            (v_service_id, 6, 'Completed', 'completed', false, false, true),
            (v_service_id, 7, 'Rejected', 'rejected', false, false, true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
