-- ==============================================================================
-- CONVERTO PLATFORM — V17 NOTIFICATIONS, SECURE CHAT RPC & ORDER SYNC
-- ==============================================================================

-- 1. NOTIFICATION AUDIENCE TARGETING
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'customer';

-- Add check constraint for target_role
DO $$ BEGIN
  ALTER TABLE public.notifications 
  ADD CONSTRAINT chk_notifications_target_role 
  CHECK (target_role IN ('customer', 'staff', 'all'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS on notifications if not already enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop legacy notification policies
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications delete policy" ON public.notifications;
DROP POLICY IF EXISTS "Staff can read staff notifications" ON public.notifications;

-- Notification SELECT Policy for Customers and Staff
CREATE POLICY "Notifications select policy" ON public.notifications
FOR SELECT USING (
  profile_id = auth.uid()
  OR (
    profile_id IS NULL AND (
      target_role = 'customer'
      OR target_role = 'all'
      OR (
        target_role = 'staff' AND EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = auth.uid() AND p.is_staff = TRUE
        )
      )
    )
  )
);

-- Notification DELETE Policy (Users can delete their own notifications)
CREATE POLICY "Notifications delete policy" ON public.notifications
FOR DELETE USING (
  profile_id = auth.uid()
);

-- Notification INSERT Policy (Authenticated users can create notifications if needed)
CREATE POLICY "Notifications insert policy" ON public.notifications
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' OR auth.role() = 'service_role'
);


-- 2. STRICT IMMUTABLE RLS ON COMMUNICATION TABLES

-- communication_conversations RLS
ALTER TABLE public.communication_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversations select policy" ON public.communication_conversations;
DROP POLICY IF EXISTS "Conversations insert policy" ON public.communication_conversations;
DROP POLICY IF EXISTS "Conversations update policy" ON public.communication_conversations;

CREATE POLICY "Conversations select policy" ON public.communication_conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.is_staff = TRUE
  )
  OR EXISTS (
    SELECT 1 FROM public.communication_participants cp 
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Conversations insert policy" ON public.communication_conversations
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' OR auth.role() = 'service_role'
);

CREATE POLICY "Conversations update policy" ON public.communication_conversations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.is_staff = TRUE
  )
  OR EXISTS (
    SELECT 1 FROM public.communication_participants cp 
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  )
);

-- communication_participants RLS
ALTER TABLE public.communication_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants select policy" ON public.communication_participants;
DROP POLICY IF EXISTS "Participants insert policy" ON public.communication_participants;

CREATE POLICY "Participants select policy" ON public.communication_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.is_staff = TRUE
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Participants insert policy" ON public.communication_participants
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' OR auth.role() = 'service_role'
);

-- communication_messages RLS
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages select policy" ON public.communication_messages;
DROP POLICY IF EXISTS "Messages insert policy" ON public.communication_messages;

CREATE POLICY "Messages select policy" ON public.communication_messages
FOR SELECT USING (
  (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.is_staff = TRUE
    )
  )
  OR (
    visibility = 'customer' AND EXISTS (
      SELECT 1 FROM public.communication_participants cp 
      WHERE cp.conversation_id = communication_messages.conversation_id AND cp.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Messages insert policy" ON public.communication_messages
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' OR auth.role() = 'service_role'
);


-- 3. ATOMIC POSTGRES STORED PROCEDURES (RPC)

-- 3.1 Customer Send Chat Message RPC
CREATE OR REPLACE FUNCTION public.fn_customer_send_chat_message(
  p_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_conv_id UUID;
  v_msg_id UUID;
  v_msg_created_at TIMESTAMPTZ;
  v_user_name TEXT;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated caller';
  END IF;

  IF TRIM(p_text) = '' THEN
    RAISE EXCEPTION 'Message text cannot be empty';
  END IF;

  -- Get user name for notification
  SELECT COALESCE(full_name, email, 'Customer') INTO v_user_name 
  FROM public.profiles 
  WHERE id = v_user_id;

  -- Find existing open/waiting conversation for this customer
  SELECT cp.conversation_id INTO v_conv_id
  FROM public.communication_participants cp
  JOIN public.communication_conversations cc ON cc.id = cp.conversation_id
  WHERE cp.user_id = v_user_id 
    AND cp.user_type = 'customer'
    AND cc.status IN ('open', 'waiting_on_customer')
    AND cc.is_deleted = FALSE
  ORDER BY cc.last_message_at DESC NULLS LAST
  LIMIT 1;

  -- If no open conversation exists, create a new one
  IF v_conv_id IS NULL THEN
    INSERT INTO public.communication_conversations (
      channel,
      status,
      priority,
      subject
    ) VALUES (
      'support',
      'open',
      'normal',
      'Live Support Chat'
    )
    RETURNING id INTO v_conv_id;

    -- Add customer participant
    INSERT INTO public.communication_participants (
      conversation_id,
      user_id,
      user_type
    ) VALUES (
      v_conv_id,
      v_user_id,
      'customer'
    );
  END IF;

  -- Insert message
  INSERT INTO public.communication_messages (
    conversation_id,
    sender_id,
    sender_type,
    visibility,
    text
  ) VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'customer',
    TRIM(p_text)
  )
  RETURNING id, created_at INTO v_msg_id, v_msg_created_at;

  -- Update conversation last_message pointers & status
  UPDATE public.communication_conversations
  SET 
    last_message_id = v_msg_id,
    last_message_at = v_msg_created_at,
    status = 'open',
    updated_at = NOW()
  WHERE id = v_conv_id;

  -- Insert staff notification
  INSERT INTO public.notifications (
    profile_id,
    target_role,
    title,
    message,
    category,
    action_url
  ) VALUES (
    NULL,
    'staff',
    'New Support Message',
    v_user_name || ': ' || LEFT(TRIM(p_text), 60),
    'chat',
    '/support'
  );

  v_result := jsonb_build_object(
    'conversation_id', v_conv_id,
    'message_id', v_msg_id,
    'created_at', v_msg_created_at
  );

  RETURN v_result;
END;
$$;


-- 3.2 Staff Send Chat Message RPC
CREATE OR REPLACE FUNCTION public.fn_staff_send_chat_message(
  p_conversation_id UUID,
  p_text TEXT,
  p_visibility TEXT DEFAULT 'customer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id UUID;
  v_is_staff BOOLEAN;
  v_msg_id UUID;
  v_msg_created_at TIMESTAMPTZ;
  v_customer_user_id UUID;
  v_new_status conversation_status;
  v_result JSONB;
BEGIN
  v_staff_id := auth.uid();
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated caller';
  END IF;

  SELECT COALESCE(is_staff, FALSE) INTO v_is_staff 
  FROM public.profiles 
  WHERE id = v_staff_id;

  IF NOT COALESCE(v_is_staff, FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not staff';
  END IF;

  IF TRIM(p_text) = '' THEN
    RAISE EXCEPTION 'Message text cannot be empty';
  END IF;

  v_new_status := CASE WHEN p_visibility = 'customer' THEN 'waiting_on_customer'::conversation_status ELSE 'open'::conversation_status END;

  -- Insert message
  INSERT INTO public.communication_messages (
    conversation_id,
    sender_id,
    sender_type,
    visibility,
    text
  ) VALUES (
    p_conversation_id,
    v_staff_id,
    'staff',
    p_visibility::message_visibility,
    TRIM(p_text)
  )
  RETURNING id, created_at INTO v_msg_id, v_msg_created_at;

  -- Update conversation pointers
  UPDATE public.communication_conversations
  SET 
    last_message_id = v_msg_id,
    last_message_at = v_msg_created_at,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_conversation_id;

  -- If customer visible, find customer participant & notify
  IF p_visibility = 'customer' THEN
    SELECT user_id INTO v_customer_user_id
    FROM public.communication_participants
    WHERE conversation_id = p_conversation_id AND user_type = 'customer'
    LIMIT 1;

    IF v_customer_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        profile_id,
        target_role,
        title,
        message,
        category,
        action_url
      ) VALUES (
        v_customer_user_id,
        'customer',
        'Support Reply Received',
        LEFT(TRIM(p_text), 80),
        'chat',
        '/support'
      );
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'conversation_id', p_conversation_id,
    'message_id', v_msg_id,
    'created_at', v_msg_created_at
  );

  RETURN v_result;
END;
$$;


-- 4. DATABASE TRIGGER FOR AUTOMATED ORDER STATUS NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.trg_notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_name TEXT;
BEGIN
  -- Determine status text
  IF NEW.pipeline_status_id IS NOT NULL AND (OLD.pipeline_status_id IS NULL OR OLD.pipeline_status_id <> NEW.pipeline_status_id) THEN
    SELECT name INTO v_status_name FROM public.pipeline_statuses WHERE id = NEW.pipeline_status_id;
  ELSIF NEW.status IS NOT NULL AND (OLD.status IS NULL OR OLD.status <> NEW.status) THEN
    v_status_name := NEW.status;
  END IF;

  IF v_status_name IS NOT NULL THEN
    INSERT INTO public.notifications (
      profile_id,
      target_role,
      title,
      message,
      category,
      action_url
    ) VALUES (
      NEW.profile_id,
      'customer',
      'Order Status Updated',
      'Your request #' || LEFT(NEW.id::text, 8) || ' is now: ' || v_status_name,
      'request',
      '/track'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_request_status_notify ON public.service_requests;
CREATE TRIGGER trg_service_request_status_notify
  AFTER UPDATE OF pipeline_status_id, status
  ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_order_status_change();


-- 5. REALTIME PUBLICATION SETUP
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_conversations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_participants;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
