import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function inspect() {
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    
  if (error) {
    // If pg_policies is not accessible directly via postgrest, query via schema_v* or check table metadata
    console.log("Could not query pg_policies via postgrest:", error)
  } else {
    console.log("Policies:", data)
  }
}

inspect()
