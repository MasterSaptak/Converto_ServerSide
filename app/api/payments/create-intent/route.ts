import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { MockPaymentEngine } from '@/modules/core/payments/mockStripe'

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json()
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        },
      }
    )

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the order to get the amount
    const { data: order, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', orderId)
      .eq('profile_id', user.id) // Security: Ensure they own the order
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status_code !== 'awaiting_payment') {
      return NextResponse.json({ error: 'Order is not awaiting payment' }, { status: 400 })
    }

    // Since our database stores metadata natively, we can extract the amount from there.
    // Assuming metadata has something like { total_fee: 15.50 } or we charge a fixed fee for now.
    // For this generic mock, let's just assume a $100 fee if not specified in metadata
    const amount = (order.metadata?.total_fee || 100) * 100 // Convert to cents

    // Generate Mock Payment Intent
    const intent = await MockPaymentEngine.createPaymentIntent(order.id, amount, 'USD')

    return NextResponse.json({ 
      clientSecret: intent.client_secret,
      intentId: intent.id
    })

  } catch (error: any) {
    console.error('Payment intent error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
