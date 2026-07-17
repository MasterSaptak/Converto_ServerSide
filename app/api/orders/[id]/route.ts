import { NextRequest, NextResponse } from 'next/server'
import { OrderService } from '@/modules/core/orders/service'

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

    const order = await OrderService.getOrder(orderId)
    return NextResponse.json(order)
  } catch (error: any) {
    console.error(`API /api/orders/[id] GET error:`, error)
    return NextResponse.json({ error: error.message }, { status: error.message.includes('not found') ? 404 : 500 })
  }
}

export async function PATCH(
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
    const updatedOrder = await OrderService.updateOrder(orderId, body)
    
    return NextResponse.json(updatedOrder)
  } catch (error: any) {
    console.error(`API /api/orders/[id] PATCH error:`, error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
