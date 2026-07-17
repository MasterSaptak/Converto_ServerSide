import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { orderId, intentId, status } = await req.json()
    
    // In a real Stripe webhook, we would verify the signature here.
    // For our mock, we just trust the payload for now.
    
    if (status === 'succeeded') {
      const supabase = createAdminClient()

      // Get the service ID and code so we can find the next workflow step
      const { data: order } = await supabase
        .from('service_requests')
        .select('service_id, services(code)')
        .eq('id', orderId)
        .single()

      if (order) {
        // Transition based on service
        const serviceCode = (order.services as any)?.code
        let nextStatus = 'processing' // fallback
        if (serviceCode === 'buy_for_me') nextStatus = 'purchasing'
        if (serviceCode === 'ticket_booking') nextStatus = 'issuing'
        if (serviceCode === 'education') nextStatus = 'processing_payment'
        if (serviceCode === 'global_payments') nextStatus = 'transferring_funds'

        await supabase
          .from('service_requests')
          .update({ 
            status_code: nextStatus,
            status: 'Payment Confirmed', // Map to generic status string for UI
            updated_at: new Date().toISOString() 
          })
          .eq('id', orderId)

        // Log the payment in timeline
        await supabase
          .from('service_request_timeline')
          .insert({
            request_id: orderId,
            action: 'payment_received',
            description: `Payment confirmed via Mock Payment Engine (Intent: ${intentId})`,
            is_internal: false
          })

        return NextResponse.json({ success: true, message: 'Webhook processed' })
      }
    }
    
    return NextResponse.json({ success: false, message: 'Unhandled status' })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
