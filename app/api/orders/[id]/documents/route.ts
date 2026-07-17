import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/modules/core/documents/service'

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
      .from('documents')
      .select('*, document_type:document_types(*), verified_by_staff:staff(*)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error(`API /api/orders/[id]/documents GET error:`, error)
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
    // For now, assume profile_id is passed since we don't have auth middleware applied yet
    const customerId = body.customer_id;
    if (!customerId) {
        return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
    }

    const doc = await DocumentService.registerDocument({
      ...body,
      order_id: orderId,
      customer_id: customerId
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error: any) {
    console.error(`API /api/orders/[id]/documents POST error:`, error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
