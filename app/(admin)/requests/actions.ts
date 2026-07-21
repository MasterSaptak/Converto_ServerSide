'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )
}

export async function acceptInstaOrder(orderId: string) {
  try {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized: You must be logged in to accept orders.' }
    }

    // Step 1: Atomic update - only if assigned_staff_id is null
    const { data, error, count } = await supabase
      .from('service_requests')
      .update({
        status: 'Accepted',
        assigned_staff_id: user.id,
      })
      .eq('id', orderId)
      .is('assigned_staff_id', null)
      .select('id, profile_id')
      .single()

    // If no row is returned, it means it was already assigned or doesn't exist
    if (error || !data) {
      return { error: 'This order has already been assigned to another admin.' }
    }

    // Step 2: Log the activity in order_events
    await supabase.from('order_events').insert({
      order_id: data.id,
      event_type: 'Order Accepted',
      remarks: `Order accepted by admin via Insta Orders`,
      actor_id: user.id
    })

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to accept order' }
  }
}

export async function rejectInstaOrder(orderId: string) {
  try {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized: You must be logged in to reject orders.' }
    }

    const { error } = await supabase
      .from('service_requests')
      .update({
        status: 'Rejected',
        closed_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .is('assigned_staff_id', null)

    if (error) {
      return { error: 'This order has already been processed by another admin.' }
    }

    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'Order Rejected',
      remarks: `Order rejected by admin via Insta Orders popup`,
      actor_id: user.id
    })

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to reject order' }
  }
}

export async function addOrderNote(formData: FormData) {
  try {
    const orderId = formData.get('orderId') as string
    const note = formData.get('note') as string
    
    if (!orderId || !note.trim()) {
      return { error: 'Order ID and note content are required.' }
    }

    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized: You must be logged in to add notes.' }
    }

    const { error } = await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'Internal Note',
      remarks: note.trim(),
      actor_id: user.id
    })

    if (error) {
      return { error: 'Failed to add note: ' + error.message }
    }

    revalidatePath(`/orders/${orderId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to add note' }
  }
}
