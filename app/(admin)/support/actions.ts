'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────────────────────
// Send a message in a conversation (staff → customer, internal note, or system)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendSupportMessage(
  conversationId: string,
  text: string,
  visibility: 'customer' | 'staff' | 'system' = 'customer'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const trimmed = text.trim()
  if (!trimmed) throw new Error('Message text cannot be empty')

  // Temporarily bypass the atomic RPC procedure to ensure the updated action_url is used.
  // The RPC function currently hardcodes '/support' instead of '/support?chat=open'.
  // TODO: Update fn_staff_send_chat_message in Supabase to accept p_action_url
  
  /*
  const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_staff_send_chat_message', {
    p_conversation_id: conversationId,
    p_text: trimmed,
    p_visibility: visibility
  })

  if (!rpcErr && rpcData) {
    revalidatePath('/support')
    return { id: rpcData.message_id, created_at: rpcData.created_at }
  }

  if (rpcErr) {
    console.log('fn_staff_send_chat_message RPC fallback:', rpcErr.message)
  }
  */

  // 1. Insert the message
  const { data: message, error } = await supabase
    .from('communication_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_type: 'staff',
      visibility,
      text: trimmed,
    })
    .select()
    .single()

  if (error) throw error

  // 2. Update conversation's denormalised pointers
  const updateData: Record<string, any> = {
    last_message_id: message.id,
    last_message_at: message.created_at,
  }
  // Auto-transition: staff sends customer-visible reply → waiting_on_customer
  if (visibility === 'customer') {
    updateData.status = 'waiting_on_customer'
  }

  await supabase
    .from('communication_conversations')
    .update(updateData)
    .eq('id', conversationId)

  // 3. Mark as read for the sending staff member
  await supabase
    .from('communication_participants')
    .update({
      last_read_message_id: message.id,
      last_read_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)

  // 4. Create customer notification if message is visible to customer
  if (visibility === 'customer') {
    const { data: customerPart } = await supabase
      .from('communication_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_type', 'customer')
      .maybeSingle()

    if (customerPart?.user_id) {
      await supabase.from('notifications').insert({
        profile_id: customerPart.user_id,
        target_role: 'customer',
        title: 'Support Reply Received',
        message: trimmed.substring(0, 80),
        category: 'chat',
        action_url: '/support?chat=open'
      })
    }
  }

  revalidatePath('/support')
  return message
}

// ─────────────────────────────────────────────────────────────────────────────
// Update conversation status (open, waiting_on_customer, resolved, closed)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateConversationStatus(
  conversationId: string,
  status: 'open' | 'waiting_on_customer' | 'resolved' | 'closed'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const updateData: Record<string, any> = { status }
  if (status === 'resolved') {
    updateData.resolved_at = new Date().toISOString()
  }
  if (status === 'open') {
    updateData.resolved_at = null
  }

  const { error } = await supabase
    .from('communication_conversations')
    .update(updateData)
    .eq('id', conversationId)

  if (error) throw error

  // Insert a system message noting the status change
  await supabase
    .from('communication_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_type: 'system',
      visibility: 'customer',
      text: `Conversation marked as ${status.replace(/_/g, ' ')}.`,
    })

  revalidatePath('/support')
}

// ─────────────────────────────────────────────────────────────────────────────
// Update conversation priority (low, normal, high, urgent)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateConversationPriority(
  conversationId: string,
  priority: 'low' | 'normal' | 'high' | 'urgent'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('communication_conversations')
    .update({ priority })
    .eq('id', conversationId)

  if (error) throw error
  revalidatePath('/support')
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark conversation as read (cursor-based: sets last_read_message_id)
// ─────────────────────────────────────────────────────────────────────────────
export async function markConversationRead(conversationId: string, messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('communication_participants')
    .update({
      last_read_message_id: messageId,
      last_read_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Join a conversation as a staff participant (self-assign)
// ─────────────────────────────────────────────────────────────────────────────
export async function joinConversation(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('communication_participants')
    .upsert({
      conversation_id: conversationId,
      user_id: user.id,
      user_type: 'staff',
    }, { onConflict: 'conversation_id,user_id' })

  if (error) throw error
  revalidatePath('/support')
}
