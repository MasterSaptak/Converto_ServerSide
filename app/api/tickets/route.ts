import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { TicketBookingService } from '@/modules/ticket/service'

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

    const ticketBookingService = new TicketBookingService(supabase)
    
    // Create the order via the module's service
    const order = await ticketBookingService.createRequest(user.id, {
      ticketType: data.ticketType,
      departureCity: data.departureCity,
      destinationCity: data.destinationCity,
      travelStartDate: data.travelStartDate,
      travelEndDate: data.travelEndDate,
      eventName: data.eventName,
      passengers: data.passengers,
      specialRequests: data.specialRequests
    })

    return NextResponse.json({ success: true, orderId: order.id })
    
  } catch (error: any) {
    console.error('Ticket Booking API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
