import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BuyForMeService } from '@/modules/buy_for_me/service'

export async function POST(req: Request) {
  try {
    const data = await req.json()

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

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buyForMeService = new BuyForMeService(supabase)
    
    // Create the order via the module's service
    const order = await buyForMeService.createRequest(user.id, {
      website: data.website,
      productUrl: data.productUrl,
      productName: data.productName,
      productImage: data.productImage,
      quantity: parseInt(data.quantity) || 1,
      variant: data.variant,
      notes: data.notes,
      color: data.color,
      size: data.size,
      shippingAddress: data.shippingAddress
    })

    return NextResponse.json({ success: true, orderId: order.id })
    
  } catch (error: any) {
    console.error('Buy For Me API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
