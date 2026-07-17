import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { EducationService } from '@/modules/education/service'

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

    const educationService = new EducationService(supabase)
    
    // Create the order via the module's service
    const order = await educationService.createRequest(user.id, {
      institutionName: data.institutionName,
      country: data.country,
      studentName: data.studentName,
      studentId: data.studentId,
      paymentPurpose: data.paymentPurpose,
      currency: data.currency,
      amountToPay: data.amountToPay,
      paymentDeadline: data.paymentDeadline,
      additionalNotes: data.additionalNotes
    })

    return NextResponse.json({ success: true, orderId: order.id })
    
  } catch (error: any) {
    console.error('Education API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
