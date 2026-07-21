-- ============================================================
-- CONVERTO UNIVERSAL WORKFLOW ENGINE v2
-- Phase 1: Database Foundation Migration
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PIPELINE STAGES (Dynamic, Configurable)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  stage_type      TEXT NOT NULL CHECK (stage_type IN ('start', 'processing', 'waiting', 'payment', 'delivery', 'terminal')),
  display_order   INTEGER NOT NULL DEFAULT 0,
  color           TEXT,
  icon            TEXT,
  is_terminal     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default stages
INSERT INTO pipeline_stages (code, name, stage_type, display_order, color, icon, is_terminal, is_active) VALUES
  ('submitted',        'Submitted',        'start',      1,  '#6366F1', 'InboxIcon',        FALSE, TRUE),
  ('review',           'Review',           'processing', 2,  '#F59E0B', 'SearchIcon',       FALSE, TRUE),
  ('quotation',        'Quotation',        'processing', 3,  '#8B5CF6', 'FileTextIcon',     FALSE, TRUE),
  ('waiting_customer', 'Waiting Customer', 'waiting',    4,  '#EC4899', 'UserCheckIcon',    FALSE, TRUE),
  ('payment',          'Payment',          'payment',    5,  '#EF4444', 'CreditCardIcon',   FALSE, TRUE),
  ('processing',       'Processing',       'processing', 6,  '#3B82F6', 'SettingsIcon',     FALSE, TRUE),
  ('delivery',         'Delivery',         'delivery',   7,  '#10B981', 'TruckIcon',        FALSE, TRUE),
  ('completed',        'Completed',        'terminal',   8,  '#6B7280', 'CheckCircleIcon',  TRUE,  TRUE)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 2. PIPELINE STATUSES (Detailed states within a stage)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_statuses (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID,
  stage_id                 UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  code                     TEXT NOT NULL,
  name                     TEXT NOT NULL,
  color                    TEXT,
  customer_visible         BOOLEAN NOT NULL DEFAULT TRUE,
  requires_customer_action BOOLEAN NOT NULL DEFAULT FALSE,
  display_order            INTEGER NOT NULL DEFAULT 0,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stage_id, code)
);

-- Seed statuses per stage
DO $$
DECLARE
  s_submitted        UUID := (SELECT id FROM pipeline_stages WHERE code = 'submitted');
  s_review           UUID := (SELECT id FROM pipeline_stages WHERE code = 'review');
  s_quotation        UUID := (SELECT id FROM pipeline_stages WHERE code = 'quotation');
  s_waiting_customer UUID := (SELECT id FROM pipeline_stages WHERE code = 'waiting_customer');
  s_payment          UUID := (SELECT id FROM pipeline_stages WHERE code = 'payment');
  s_processing       UUID := (SELECT id FROM pipeline_stages WHERE code = 'processing');
  s_delivery         UUID := (SELECT id FROM pipeline_stages WHERE code = 'delivery');
  s_completed        UUID := (SELECT id FROM pipeline_stages WHERE code = 'completed');
BEGIN

  -- Submitted
  INSERT INTO pipeline_statuses (stage_id, code, name, color, customer_visible, requires_customer_action, display_order) VALUES
    (s_submitted, 'submitted', 'Submitted', '#6366F1', TRUE,  FALSE, 1),
    (s_submitted, 'assigned',  'Assigned',  '#818CF8', FALSE, FALSE, 2)
  ON CONFLICT (stage_id, code) DO NOTHING;

  -- Review
  INSERT INTO pipeline_statuses (stage_id, code, name, color, customer_visible, requires_customer_action, display_order) VALUES
    (s_review, 'reviewing_request', 'Reviewing Request', '#F59E0B', TRUE,  FALSE, 1),
    (s_review, 'need_information',  'Need Information',  '#F97316', TRUE,  TRUE,  2),
    (s_review, 'need_documents',    'Need Documents',    '#EF4444', TRUE,  TRUE,  3),
    (s_review, 'rejected',          'Rejected',          '#DC2626', TRUE,  FALSE, 4)
  ON CONFLICT (stage_id, code) DO NOTHING;

  -- Quotation
  INSERT INTO pipeline_statuses (stage_id, code, name, color, customer_visible, requires_customer_action, display_order) VALUES
    (s_quotation, 'preparing_quote', 'Preparing Quote', '#8B5CF6', FALSE, FALSE, 1),
    (s_quotation, 'quote_ready',     'Quote Ready',     '#7C3AED', FALSE, FALSE, 2),
    (s_quotation, 'quote_sent',      'Quote Sent',      '#6D28D9', TRUE,  TRUE,  3)
  ON CONFLICT (stage_id, code) DO NOTHING;

  -- Waiting Customer
  INSERT INTO pipeline_statuses (stage_id, code, name, color, customer_visible, requires_customer_action, display_order) VALUES
    (s_waiting_customer, 'reviewing_quote',    'Reviewing Quote',    '#EC4899', TRUE, FALSE, 1),
    (s_waiting_customer, 'requested_changes',  'Requested Changes',  '#DB2777', TRUE, FALSE, 2),
    (s_waiting_customer, 'approved_quote',     'Approved Quote',     '#BE185D', TRUE, FALSE, 3)
  ON CONFLICT (stage_id, code) DO NOTHING;

  -- Payment
  INSERT INTO pipeline_statuses (stage_id, code, name, color, customer_visible, requires_customer_action, display_order) VALUES
    (s_payment, 'awaiting_payment',    'Awaiting Payment',    '#EF4444', TRUE, TRUE,  1),
    (s_payment, 'payment_verification','Payment Verification', '#F97316', TRUE, FALSE, 2),
    (s_payment, 'payment_confirmed',   'Payment Confirmed',   '#10B981', TRUE, FALSE, 3),
    (s_payment, 'payment_failed',      'Payment Failed',      '#DC2626', TRUE, TRUE,  4),
    (s_payment, 'refunded',            'Refunded',            '#6B7280', TRUE, FALSE, 5)
  ON CONFLICT (stage_id, code) DO NOTHING;

  -- Processing
  INSERT INTO pipeline_statuses (stage_id, code, name, color, customer_visible, requires_customer_action, display_order) VALUES
    (s_processing, 'task_started',       'Task Started',       '#3B82F6', TRUE,  FALSE, 1),
    (s_processing, 'in_progress',        'In Progress',        '#2563EB', TRUE,  FALSE, 2),
    (s_processing, 'waiting_third_party','Waiting Third Party', '#F59E0B', FALSE, FALSE, 3),
    (s_processing, 'on_hold',            'On Hold',            '#6B7280', FALSE, FALSE, 4)
  ON CONFLICT (stage_id, code) DO NOTHING;

  -- Delivery (general + service-specific)
  INSERT INTO pipeline_statuses (stage_id, code, name, color, customer_visible, requires_customer_action, display_order) VALUES
    (s_delivery, 'delivered',              'Delivered',              '#10B981', TRUE, FALSE, 1),
    (s_delivery, 'funds_sent',             'Funds Sent',             '#059669', TRUE, FALSE, 2),
    (s_delivery, 'ticket_delivered',       'Ticket Delivered',       '#10B981', TRUE, FALSE, 3),
    (s_delivery, 'booking_voucher_sent',   'Booking Voucher Sent',   '#10B981', TRUE, FALSE, 4),
    (s_delivery, 'appointment_letter_sent','Appointment Letter Sent', '#10B981', TRUE, FALSE, 5),
    (s_delivery, 'product_shipped',        'Product Shipped',        '#10B981', TRUE, FALSE, 6)
  ON CONFLICT (stage_id, code) DO NOTHING;

  -- Completed
  INSERT INTO pipeline_statuses (stage_id, code, name, color, customer_visible, requires_customer_action, display_order) VALUES
    (s_completed, 'completed',    'Completed',    '#6B7280', TRUE,  TRUE,  1),
    (s_completed, 'acknowledged', 'Acknowledged', '#374151', TRUE,  FALSE, 2),
    (s_completed, 'closed',       'Closed',       '#111827', FALSE, FALSE, 3)
  ON CONFLICT (stage_id, code) DO NOTHING;

END $$;


-- ─────────────────────────────────────────────────────────────
-- 3. WORKFLOW RULES (Intelligent automation triggers)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID,
  name                 TEXT NOT NULL,
  current_stage_id     UUID REFERENCES pipeline_stages(id),
  current_status_id    UUID REFERENCES pipeline_statuses(id),
  condition_expression TEXT, -- e.g. "payment.status == 'PAID'"
  action_type          TEXT NOT NULL CHECK (action_type IN ('move_stage', 'move_status', 'notify', 'assign', 'create_tasks')),
  target_stage_id      UUID REFERENCES pipeline_stages(id),
  target_status_id     UUID REFERENCES pipeline_statuses(id),
  display_order        INTEGER DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 4. WORKFLOW EVENTS (Plug-and-play automation actions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  status_id       UUID REFERENCES pipeline_statuses(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL, -- e.g. 'send_whatsapp', 'send_email', 'create_invoice'
  payload         JSONB DEFAULT '{}'::JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 5. WORKFLOW TEMPLATES (Service-specific checklists)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_template_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID,
  template_id      UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  task_type        TEXT,
  default_metadata JSONB DEFAULT '{}'::JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 6. REQUEST FLAGS (Normalized, auditable flags per request)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  request_id      UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  flag            TEXT NOT NULL, -- e.g. 'urgent', 'vip', 'escalated', 'disputed'
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(request_id, flag)
);


-- ─────────────────────────────────────────────────────────────
-- 7. REQUEST WORKFLOW HISTORY (Immutable audit + analytics)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_workflow_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  request_id      UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  old_stage       TEXT,
  new_stage       TEXT NOT NULL,
  old_status      TEXT,
  new_status      TEXT NOT NULL,
  changed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER, -- Time spent in the old stage/status
  remarks         TEXT
);


-- ─────────────────────────────────────────────────────────────
-- 8. REQUEST TASKS (Per-request checklist, with full lifecycle)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  request_id      UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Skipped', 'Cancelled')),
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  task_type       TEXT,
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 9. ALTER service_requests — Add new workflow columns
-- ─────────────────────────────────────────────────────────────
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS pipeline_stage_id   UUID REFERENCES pipeline_stages(id),
  ADD COLUMN IF NOT EXISTS pipeline_status_id  UUID REFERENCES pipeline_statuses(id),
  ADD COLUMN IF NOT EXISTS priority            TEXT DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent', 'Critical')),
  ADD COLUMN IF NOT EXISTS closed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expected_completion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_deadline        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_delivery  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_team       TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id     UUID;


-- ─────────────────────────────────────────────────────────────
-- 10. MIGRATE existing requests to new pipeline columns
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  stage_submitted        UUID := (SELECT id FROM pipeline_stages WHERE code = 'submitted');
  stage_review           UUID := (SELECT id FROM pipeline_stages WHERE code = 'review');
  stage_quotation        UUID := (SELECT id FROM pipeline_stages WHERE code = 'quotation');
  stage_waiting_customer UUID := (SELECT id FROM pipeline_stages WHERE code = 'waiting_customer');
  stage_payment          UUID := (SELECT id FROM pipeline_stages WHERE code = 'payment');
  stage_processing       UUID := (SELECT id FROM pipeline_stages WHERE code = 'processing');
  stage_delivery         UUID := (SELECT id FROM pipeline_stages WHERE code = 'delivery');
  stage_completed        UUID := (SELECT id FROM pipeline_stages WHERE code = 'completed');

  status_submitted        UUID := (SELECT id FROM pipeline_statuses WHERE code = 'submitted');
  status_reviewing        UUID := (SELECT id FROM pipeline_statuses WHERE code = 'reviewing_request');
  status_quote_sent       UUID := (SELECT id FROM pipeline_statuses WHERE code = 'quote_sent');
  status_reviewing_quote  UUID := (SELECT id FROM pipeline_statuses WHERE code = 'reviewing_quote');
  status_awaiting_payment UUID := (SELECT id FROM pipeline_statuses WHERE code = 'awaiting_payment');
  status_pmt_confirmed    UUID := (SELECT id FROM pipeline_statuses WHERE code = 'payment_confirmed');
  status_in_progress      UUID := (SELECT id FROM pipeline_statuses WHERE code = 'in_progress');
  status_delivered        UUID := (SELECT id FROM pipeline_statuses WHERE code = 'delivered');
  status_completed        UUID := (SELECT id FROM pipeline_statuses WHERE code = 'completed');
  status_closed           UUID := (SELECT id FROM pipeline_statuses WHERE code = 'closed');

BEGIN
  -- Map old status text to new pipeline stage + status
  UPDATE service_requests SET pipeline_stage_id = stage_submitted,   pipeline_status_id = status_submitted     WHERE status IN ('Submitted', 'Draft') AND pipeline_stage_id IS NULL;
  UPDATE service_requests SET pipeline_stage_id = stage_review,       pipeline_status_id = status_reviewing      WHERE status IN ('Verifying', 'Pending Review') AND pipeline_stage_id IS NULL;
  UPDATE service_requests SET pipeline_stage_id = stage_quotation,    pipeline_status_id = status_quote_sent     WHERE status IN ('Quote Sent') AND pipeline_stage_id IS NULL;
  UPDATE service_requests SET pipeline_stage_id = stage_waiting_customer, pipeline_status_id = status_reviewing_quote WHERE status IN ('Waiting Customer', 'Customer Review') AND pipeline_stage_id IS NULL;
  UPDATE service_requests SET pipeline_stage_id = stage_payment,      pipeline_status_id = status_awaiting_payment WHERE status IN ('Waiting Payment', 'Awaiting Payment') AND pipeline_stage_id IS NULL;
  UPDATE service_requests SET pipeline_stage_id = stage_payment,      pipeline_status_id = status_pmt_confirmed  WHERE status IN ('Payment Confirmed') AND pipeline_stage_id IS NULL;
  UPDATE service_requests SET pipeline_stage_id = stage_processing,   pipeline_status_id = status_in_progress    WHERE status IN ('Processing') AND pipeline_stage_id IS NULL;
  UPDATE service_requests SET pipeline_stage_id = stage_delivery,     pipeline_status_id = status_delivered      WHERE status IN ('Delivered') AND pipeline_stage_id IS NULL;
  UPDATE service_requests SET pipeline_stage_id = stage_completed,    pipeline_status_id = status_completed      WHERE status IN ('Completed') AND pipeline_stage_id IS NULL;
  UPDATE service_requests SET pipeline_stage_id = stage_completed,    pipeline_status_id = status_closed,        closed_at = NOW() WHERE status IN ('Cancelled', 'Rejected', 'Refunded') AND pipeline_stage_id IS NULL;

  -- Catch any remaining unmapped requests → Submitted
  UPDATE service_requests SET pipeline_stage_id = stage_submitted, pipeline_status_id = status_submitted
    WHERE pipeline_stage_id IS NULL;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 11. Row Level Security (basic — enable on new tables)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pipeline_stages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_statuses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_tasks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_flags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_tasks            ENABLE ROW LEVEL SECURITY;

-- Read-only policy on stages and statuses for authenticated users
DROP POLICY IF EXISTS "Allow read pipeline_stages" ON pipeline_stages;
CREATE POLICY "Allow read pipeline_stages"          ON pipeline_stages          FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Allow read pipeline_statuses" ON pipeline_statuses;
CREATE POLICY "Allow read pipeline_statuses"         ON pipeline_statuses         FOR SELECT TO authenticated USING (TRUE);

-- Full access policies for service role (server-side admin)
DROP POLICY IF EXISTS "Service role full access flags" ON request_flags;
CREATE POLICY "Service role full access flags"       ON request_flags            FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access history" ON request_workflow_history;
CREATE POLICY "Service role full access history"     ON request_workflow_history FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access tasks" ON request_tasks;
CREATE POLICY "Service role full access tasks"       ON request_tasks            FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access rules" ON workflow_rules;
CREATE POLICY "Service role full access rules"       ON workflow_rules           FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access events" ON workflow_events;
CREATE POLICY "Service role full access events"      ON workflow_events          FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access templates" ON workflow_templates;
CREATE POLICY "Service role full access templates"   ON workflow_templates       FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access tmpl_tasks" ON workflow_template_tasks;
CREATE POLICY "Service role full access tmpl_tasks"  ON workflow_template_tasks  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Users can read their own flags, history, tasks
DROP POLICY IF EXISTS "Users read own flags" ON request_flags;
CREATE POLICY "Users read own flags"    ON request_flags            FOR SELECT TO authenticated USING (request_id IN (SELECT id FROM service_requests WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "Users read own history" ON request_workflow_history;
CREATE POLICY "Users read own history"  ON request_workflow_history FOR SELECT TO authenticated USING (request_id IN (SELECT id FROM service_requests WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "Users read own tasks" ON request_tasks;
CREATE POLICY "Users read own tasks"    ON request_tasks            FOR SELECT TO authenticated USING (request_id IN (SELECT id FROM service_requests WHERE profile_id = auth.uid()));
