import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function test() {
  const { data: firstOrder } = await supabaseAdmin
    .from('service_requests')
    .select('*')
    .limit(1)

  console.log('Columns in service_requests:', firstOrder && firstOrder[0] ? Object.keys(firstOrder[0]) : 'no data')
}

test()
