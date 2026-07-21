import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function test() {
  const { data: allOrders, count: totalRequests, error: ordersError } = await supabaseAdmin
    .from('service_requests')
    .select('id, status, total, currency, created_at, profile_id, service_id, metadata', { count: 'exact' })

  console.log('totalRequests count:', totalRequests)
  console.log('allOrders length:', allOrders?.length)
  console.log('orders error:', ordersError)

  const { data: services, error: servicesError } = await supabaseAdmin
    .from('services')
    .select('*')

  console.log('services error:', servicesError)
  console.log('services (first 3):', services?.slice(0, 3))
}

test()
