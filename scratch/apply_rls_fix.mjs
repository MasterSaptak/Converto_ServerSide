import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sql = `
-- 1. Fix RLS policies on communication_conversations
ALTER TABLE public.communication_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff see all conversations" ON public.communication_conversations;
DROP POLICY IF EXISTS "Customers see own conversations" ON public.communication_conversations;
DROP POLICY IF EXISTS "Staff can manage conversations" ON public.communication_conversations;
DROP POLICY IF EXISTS "Authenticated insert conversations" ON public.communication_conversations;
DROP POLICY IF EXISTS "Participants update conversations" ON public.communication_conversations;

CREATE POLICY "Staff see all conversations" ON public.communication_conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Customers see own conversations" ON public.communication_conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.communication_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated insert conversations" ON public.communication_conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants update conversations" ON public.communication_conversations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.communication_participants cp WHERE cp.conversation_id = id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE)
  );

CREATE POLICY "Staff can manage conversations" ON public.communication_conversations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- 2. Fix RLS policies on communication_participants
ALTER TABLE public.communication_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff see all participants" ON public.communication_participants;
DROP POLICY IF EXISTS "Customers see own participation" ON public.communication_participants;
DROP POLICY IF EXISTS "Authenticated insert participants" ON public.communication_participants;
DROP POLICY IF EXISTS "Users update own participation" ON public.communication_participants;

CREATE POLICY "Staff see all participants" ON public.communication_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Customers see own participation" ON public.communication_participants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated insert participants" ON public.communication_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own participation" ON public.communication_participants FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- 3. Fix RLS policies on communication_messages
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff see all messages" ON public.communication_messages;
DROP POLICY IF EXISTS "Customers see own conversation messages" ON public.communication_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.communication_messages;
DROP POLICY IF EXISTS "Staff can send any message" ON public.communication_messages;

CREATE POLICY "Staff see all messages" ON public.communication_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Customers see own conversation messages" ON public.communication_messages FOR SELECT
  USING (
    visibility = 'customer'
    AND EXISTS (
      SELECT 1 FROM public.communication_participants cp
      WHERE cp.conversation_id = communication_messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages" ON public.communication_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communication_participants cp
      WHERE cp.conversation_id = communication_messages.conversation_id
      AND cp.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE)
  );

-- 4. Fix RLS policies on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff see all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT
  USING (profile_id = auth.uid() OR profile_id IS NULL);

CREATE POLICY "Staff see all notifications" ON public.notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Authenticated users create notifications" ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
  USING (profile_id = auth.uid() OR profile_id IS NULL OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE
  USING (profile_id = auth.uid() OR profile_id IS NULL OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_staff = TRUE));

-- 5. Realtime Subscriptions
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
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;

async function run() {
  console.log("Applying RLS and Realtime SQL fixes...")
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
  console.log("RPC result:", data, error)
}

run()
