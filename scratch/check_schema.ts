import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function test() {
  const { data, error } = await supabaseAdmin.rpc('run_sql', { sql: "SELECT data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'status';" })
  
  console.log("data:", data)
  console.log("error:", error)

  const { data: d2, error: e2 } = await supabaseAdmin.rpc('run_sql', { sql: "SELECT pg_get_constraintdef(c.oid) AS constraint_def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'service_requests';" })
  console.log("constraints:", d2)
  console.log("constraints error:", e2)
}
test()
