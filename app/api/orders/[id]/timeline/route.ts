import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const orderId = params.id
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // We fetch both events and status history to build a complete timeline
    const [eventsRes, historyRes] = await Promise.all([
      supabase
        .from('order_events')
        .select('*, actor_profile:profiles(*)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('order_status_history')
        .select('*, changed_by_profile:profiles(*)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
    ])

    if (eventsRes.error) throw eventsRes.error
    if (historyRes.error) throw historyRes.error

    // Merge and sort
    const timeline = [
      ...(eventsRes.data || []).map((e: any) => ({ type: 'event', data: e, date: e.created_at })),
      ...(historyRes.data || []).map((h: any) => ({ type: 'status_change', data: h, date: h.created_at }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(timeline)
  } catch (error: any) {
    console.error(`API /api/orders/[id]/timeline error:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
