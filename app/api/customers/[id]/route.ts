import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const customerId = params.id
    
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*, wallets(*)')
      .eq('id', customerId)
      .eq('is_staff', false)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error(`API /api/customers/[id] GET error:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
