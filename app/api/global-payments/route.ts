import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GlobalPaymentsService } from '@/modules/global_payments/service'

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

    const globalPaymentsService = new GlobalPaymentsService(supabase)
    
    // Create the order via the module's service
    const order = await globalPaymentsService.createRequest(user.id, {
      recipientName: data.recipientName,
      country: data.country,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      swiftCode: data.swiftCode,
      transferCurrency: data.transferCurrency,
      amountToTransfer: data.amountToTransfer,
      purposeOfTransfer: data.purposeOfTransfer,
      paymentReference: data.paymentReference
    })

    return NextResponse.json({ success: true, orderId: order.id })
    
  } catch (error: any) {
    console.error('Global Payments API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
