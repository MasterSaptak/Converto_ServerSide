import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data: convs, error: cErr } = await supabase.from('communication_conversations').select('*')
  console.log("Conversations count:", convs?.length, cErr)
  console.log("Conversations:", convs)

  const { data: msgs, error: mErr } = await supabase.from('communication_messages').select('*')
  console.log("Messages count:", msgs?.length, mErr)

  const { data: parts, error: pErr } = await supabase.from('communication_participants').select('*')
  console.log("Participants count:", parts?.length, pErr)

  const { data: notifs, error: nErr } = await supabase.from('notifications').select('*')
  console.log("Notifications count:", notifs?.length, nErr)
  console.log("Notifications sample:", notifs?.slice(0, 5))
}

check()
