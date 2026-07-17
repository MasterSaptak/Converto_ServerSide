import { NextRequest, NextResponse } from 'next/server'
import { OrderService } from '@/modules/core/orders/service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const filters = {
      service_id: searchParams.get('service_id') || undefined,
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      assigned_staff_id: searchParams.get('assigned_staff_id') || undefined,
      customer_id: searchParams.get('customer_id') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.has('page') ? parseInt(searchParams.get('page')!) : 1,
      per_page: searchParams.has('per_page') ? parseInt(searchParams.get('per_page')!) : 20,
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
    }

    const result = await OrderService.getOrders(filters)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('API /api/orders GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // TODO: In a real app, we would get the customerId from the auth token
    // For now, if profile_id is not passed, we will assume it's from an authenticated user context
    // We should implement proper auth middleware later.
    const customerId = body.profile_id;
    if (!customerId) {
        return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
    }

    const order = await OrderService.createOrder(body, customerId)
    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    console.error('API /api/orders POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
