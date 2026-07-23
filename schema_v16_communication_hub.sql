-- ==============================================================================
-- CONVERTO PLATFORM — V16 COMMUNICATION HUB
-- ==============================================================================
-- This schema establishes the enterprise-grade Communication Hub, replacing
-- the legacy service_messages table with a full-featured, multi-party
-- conversational platform supporting channels, SLA tracking, AI readiness,
-- threaded replies, rich attachments, and organisational labels/tags.
-- ==============================================================================

-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  1. ENUM DEFINITIONS                                                      ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
-- Strict type constraints to enforce data integrity across all communication
-- tables. Using DO blocks for idempotent creation.

DO $$ BEGIN
  CREATE TYPE communication_channel AS ENUM (
    'general', 'exchange', 'medical', 'education',
    'ticket', 'buy_for_me', 'payment', 'support'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM (
    'open', 'waiting_on_customer', 'resolved', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_priority AS ENUM (
    'low', 'normal', 'high', 'urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE participant_type AS ENUM (
    'customer', 'staff', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_visibility AS ENUM (
    'customer', 'staff', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attachment_type AS ENUM (
    'image', 'pdf', 'document', 'video', 'audio', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  2. CORE TABLES                                                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.1 communication_conversations
-- The central hub for all chronologically unified interactions.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         TEXT,

  -- Classification
  channel         communication_channel NOT NULL DEFAULT 'general',
  status          conversation_status   NOT NULL DEFAULT 'open',
  priority        conversation_priority NOT NULL DEFAULT 'normal',

  -- Link to existing service_requests (optional — not all conversations are tied to a request)
  related_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,

  -- Denormalised pointers for fast inbox queries (avoids expensive MAX subqueries)
  last_message_id UUID,          -- FK added after communication_messages is created
  last_message_at TIMESTAMPTZ,

  -- Soft delete
  is_deleted      BOOLEAN   NOT NULL DEFAULT FALSE,
  deleted_by      UUID,
  deleted_at      TIMESTAMPTZ,

  -- SLA tracking
  first_response_due TIMESTAMPTZ,
  next_response_due  TIMESTAMPTZ,
  resolved_at        TIMESTAMPTZ,

  -- AI-ready fields (populated by future AI pipeline)
  ai_summary      TEXT,
  ai_sentiment    TEXT,
  ai_priority     TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_cc_status          ON public.communication_conversations(status);
CREATE INDEX IF NOT EXISTS idx_cc_channel         ON public.communication_conversations(channel);
CREATE INDEX IF NOT EXISTS idx_cc_priority        ON public.communication_conversations(priority);
CREATE INDEX IF NOT EXISTS idx_cc_related_request ON public.communication_conversations(related_request_id);
CREATE INDEX IF NOT EXISTS idx_cc_last_message_at ON public.communication_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_cc_is_deleted      ON public.communication_conversations(is_deleted) WHERE is_deleted = FALSE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.2 communication_participants
-- Multi-party membership: Customer + multiple Staff per conversation.
-- Unread counts derived by comparing last_read_message_id against conversation messages.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.communication_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,         -- References profiles.id or staff.id depending on user_type
  user_type       participant_type NOT NULL,

  -- Read tracking (cursor-based: compare against message ordering)
  last_read_message_id UUID,             -- FK added after communication_messages is created
  last_read_at         TIMESTAMPTZ,

  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A user can only be a participant once per conversation
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_conversation ON public.communication_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cp_user         ON public.communication_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_user_type    ON public.communication_participants(user_type);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.3 communication_messages
-- Unified timeline for chat messages, internal notes, and system events.
-- Immutable by design — no editing allowed (soft delete only).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.communication_conversations(id) ON DELETE CASCADE,

  -- Sender (nullable for system-generated events)
  sender_id       UUID,
  sender_type     participant_type NOT NULL,

  -- Visibility controls: 'customer' = visible to all, 'staff' = internal note, 'system' = system event
  visibility      message_visibility NOT NULL DEFAULT 'customer',

  -- Content
  text            TEXT NOT NULL,

  -- Threading (self-referential for reply chains)
  reply_to_id     UUID REFERENCES public.communication_messages(id) ON DELETE SET NULL,

  -- Soft delete
  is_deleted      BOOLEAN   NOT NULL DEFAULT FALSE,
  deleted_by      UUID,
  deleted_at      TIMESTAMPTZ,

  -- Immutable timestamp (no updated_at — messages are never edited)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cm_conversation     ON public.communication_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cm_sender           ON public.communication_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_cm_reply_to         ON public.communication_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_cm_created_at       ON public.communication_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_conversation_ts  ON public.communication_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_is_deleted       ON public.communication_messages(is_deleted) WHERE is_deleted = FALSE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.4 Deferred Foreign Keys
-- Now that communication_messages exists, add the FK constraints that
-- reference it from conversations and participants.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.communication_conversations
    ADD CONSTRAINT fk_cc_last_message
    FOREIGN KEY (last_message_id) REFERENCES public.communication_messages(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.communication_participants
    ADD CONSTRAINT fk_cp_last_read_message
    FOREIGN KEY (last_read_message_id) REFERENCES public.communication_messages(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.5 communication_attachments
-- Rich attachment metadata linked to a message. Supports images, PDFs,
-- documents, video, audio, and arbitrary files with preview/thumbnail URLs.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID NOT NULL REFERENCES public.communication_messages(id) ON DELETE CASCADE,

  -- File classification
  type            attachment_type NOT NULL DEFAULT 'other',

  -- Storage (points to the 'communication' bucket in Supabase Storage)
  storage_url     TEXT NOT NULL,
  preview_url     TEXT,
  thumbnail_url   TEXT,

  -- File metadata
  file_name       TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL DEFAULT 0,

  -- Extensible metadata (dimensions, page count, duration, etc.)
  metadata        JSONB DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_message ON public.communication_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_ca_type    ON public.communication_attachments(type);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  3. LABELS & TAGS (Enterprise Organisation)                               ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.1 Labels — Strict, admin-defined categories (e.g., 'VIP', 'Fraud', 'Escalated')
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_labels_master (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  color       TEXT DEFAULT '#6B7280',     -- Hex color for UI badge rendering
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_labels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.communication_conversations(id) ON DELETE CASCADE,
  label_id        UUID NOT NULL REFERENCES public.communication_labels_master(id) ON DELETE CASCADE,
  applied_by      UUID,                  -- Staff who applied the label
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (conversation_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_cl_conversation ON public.conversation_labels(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cl_label        ON public.conversation_labels(label_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.2 Tags — Flexible, free-form keywords (e.g., 'passport', 'hospital', 'refund')
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_tags_master (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.communication_conversations(id) ON DELETE CASCADE,
  tag_id          UUID NOT NULL REFERENCES public.communication_tags_master(id) ON DELETE CASCADE,
  applied_by      UUID,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (conversation_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_ct_conversation ON public.conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ct_tag          ON public.conversation_tags(tag_id);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  4. AUTO-UPDATE TRIGGERS                                                  ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
-- Reuse the existing update_updated_at() function from earlier migrations.
-- If it doesn't exist, create it idempotently.

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_communication_conversations_updated_at ON public.communication_conversations;
CREATE TRIGGER update_communication_conversations_updated_at
  BEFORE UPDATE ON public.communication_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_communication_participants_updated_at ON public.communication_participants;
CREATE TRIGGER update_communication_participants_updated_at
  BEFORE UPDATE ON public.communication_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  5. ROW LEVEL SECURITY                                                    ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
-- Enable RLS on all new tables. Policies follow the existing Converto pattern:
-- Staff can see everything, customers see only conversations they participate in.

ALTER TABLE public.communication_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_labels_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_labels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_tags_master   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_tags           ENABLE ROW LEVEL SECURITY;

-- 5.1 Conversations: Staff see all; customers see conversations they participate in
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff see all conversations' AND tablename = 'communication_conversations') THEN
    CREATE POLICY "Staff see all conversations" ON public.communication_conversations FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Customers see own conversations' AND tablename = 'communication_conversations') THEN
    CREATE POLICY "Customers see own conversations" ON public.communication_conversations FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.communication_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage conversations' AND tablename = 'communication_conversations') THEN
    CREATE POLICY "Staff can manage conversations" ON public.communication_conversations FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

-- 5.2 Participants: Staff see all; customers see own participation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff see all participants' AND tablename = 'communication_participants') THEN
    CREATE POLICY "Staff see all participants" ON public.communication_participants FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Customers see own participation' AND tablename = 'communication_participants') THEN
    CREATE POLICY "Customers see own participation" ON public.communication_participants FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;

-- 5.3 Messages: Staff see all; customers see messages in their conversations (customer-visible only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff see all messages' AND tablename = 'communication_messages') THEN
    CREATE POLICY "Staff see all messages" ON public.communication_messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Customers see own conversation messages' AND tablename = 'communication_messages') THEN
    CREATE POLICY "Customers see own conversation messages" ON public.communication_messages FOR SELECT
    USING (
      visibility = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.communication_participants cp
        WHERE cp.conversation_id = communication_messages.conversation_id
        AND cp.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can send messages' AND tablename = 'communication_messages') THEN
    CREATE POLICY "Participants can send messages" ON public.communication_messages FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.communication_participants cp
        WHERE cp.conversation_id = communication_messages.conversation_id
        AND cp.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 5.4 Attachments: Inherit visibility from parent message
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff see all attachments' AND tablename = 'communication_attachments') THEN
    CREATE POLICY "Staff see all attachments" ON public.communication_attachments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Customers see own attachments' AND tablename = 'communication_attachments') THEN
    CREATE POLICY "Customers see own attachments" ON public.communication_attachments FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.communication_messages cm
      JOIN public.communication_participants cp ON cp.conversation_id = cm.conversation_id
      WHERE cm.id = communication_attachments.message_id
      AND cm.visibility = 'customer'
      AND cp.user_id = auth.uid()
    ));
  END IF;
END $$;

-- 5.5 Labels & Tags: Staff-only management; readable by participants
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage labels master' AND tablename = 'communication_labels_master') THEN
    CREATE POLICY "Staff manage labels master" ON public.communication_labels_master FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage conversation labels' AND tablename = 'conversation_labels') THEN
    CREATE POLICY "Staff manage conversation labels" ON public.conversation_labels FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage tags master' AND tablename = 'communication_tags_master') THEN
    CREATE POLICY "Staff manage tags master" ON public.communication_tags_master FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage conversation tags' AND tablename = 'conversation_tags') THEN
    CREATE POLICY "Staff manage conversation tags" ON public.conversation_tags FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));
  END IF;
END $$;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  6. CLEANUP LEGACY DATA                                                   ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
-- Drop the v15 service_messages table. Its functionality is entirely superseded
-- by communication_messages with unified timelines, multi-party support,
-- visibility controls, threading, and rich attachments.

-- First remove from realtime publication (safe — no error if not present)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.service_messages;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DROP TABLE IF EXISTS public.service_messages CASCADE;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  7. STORAGE BUCKET                                                        ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
-- Create a dedicated 'communication' bucket for all conversation attachments.
-- Organised by folder: chat-images/, chat-files/, avatars/, voice/, video/
--
-- NOTE: Supabase Storage bucket creation via SQL. If running outside of
-- Supabase SQL Editor, this may need to be done via the Dashboard or API.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'communication',
  'communication',
  FALSE,                                 -- Private bucket (access via signed URLs)
  52428800,                              -- 50MB max file size
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/ogg', 'audio/webm',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the communication bucket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload communication files' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Authenticated users can upload communication files"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'communication' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view communication files' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Authenticated users can view communication files"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'communication' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can delete communication files' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Staff can delete communication files"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'communication'
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE)
      );
  END IF;
END $$;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  8. REALTIME SUBSCRIPTIONS                                                ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
-- Add all communication tables to the supabase_realtime publication for
-- live updates in the customer and admin UIs.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_attachments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_labels;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_tags;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ==============================================================================
-- MIGRATION COMPLETE — V16 Communication Hub
-- ==============================================================================
-- Summary of changes:
--   ✓ 6 ENUM types created (communication_channel, conversation_status,
--     conversation_priority, participant_type, message_visibility, attachment_type)
--   ✓ 8 tables created (communication_conversations, communication_participants,
--     communication_messages, communication_attachments, communication_labels_master,
--     conversation_labels, communication_tags_master, conversation_tags)
--   ✓ Deferred FK constraints added (last_message_id, last_read_message_id)
--   ✓ Auto-update triggers on conversations & participants
--   ✓ Full RLS policies (staff=all, customer=participant-scoped)
--   ✓ Legacy service_messages table dropped
--   ✓ 'communication' storage bucket created (private, 50MB limit)
--   ✓ 6 tables added to supabase_realtime publication
-- ==============================================================================
