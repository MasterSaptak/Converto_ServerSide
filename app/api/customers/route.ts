import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const page = searchParams.has('page') ? parseInt(searchParams.get('page')!) : 1
    const perPage = searchParams.has('per_page') ? parseInt(searchParams.get('per_page')!) : 20
    
    const supabase = await createClient()

    let query = supabase
      .from('profiles')
      .select('*, wallets(*)', { count: 'exact' })
      .eq('is_staff', false)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const from = (page - 1) * perPage
    const to = from + perPage - 1
    
    const { data, count, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error)
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    const total = count || 0
    return NextResponse.json({
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage)
    })
  } catch (error: any) {
    console.error('API /api/customers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
