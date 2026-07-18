import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  console.log("Testing Supabase connection with Service Role...")
  
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*')
  console.log("Profiles:", profiles?.length, pErr)
  console.log(profiles?.map(p => ({ id: p.id, is_staff: p.is_staff, email: p.email })))

  const { data: wallets, error: wErr } = await supabase.from('wallet_accounts').select('*')
  console.log("Wallet Accounts:", wallets?.length, wErr)
  console.log(wallets)

  const { data: orders, error: oErr } = await supabase.from('service_requests').select('*')
  console.log("Orders:", orders?.length, oErr)
}

test()
