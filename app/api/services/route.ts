import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }

    return NextResponse.json(services)
  } catch (error: any) {
    console.error('API /api/services error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
