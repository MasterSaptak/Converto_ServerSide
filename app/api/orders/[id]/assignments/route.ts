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

    const { data, error } = await supabase
      .from('order_assignments')
      .select('*, staff:staff(*, profile:profiles(*))')
      .eq('order_id', orderId)
      .order('assigned_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error(`API /api/orders/[id]/assignments GET error:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const orderId = params.id
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { staff_id, role, is_primary } = body;
    
    if (!staff_id || !role) {
        return NextResponse.json({ error: 'staff_id and role are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('order_assignments')
      .upsert({
        order_id: orderId,
        staff_id,
        role,
        is_primary: is_primary || false
      }, { onConflict: 'order_id,staff_id,role' })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error(`API /api/orders/[id]/assignments POST error:`, error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
