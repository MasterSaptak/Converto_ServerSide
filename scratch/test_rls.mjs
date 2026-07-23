import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testRLS() {
  // Test anon insert to communication_conversations
  const { data: cData, error: cErr } = await anonSupabase
    .from('communication_conversations')
    .insert({
      channel: 'support',
      status: 'open',
      priority: 'normal',
      subject: 'Test Chat'
    })
    .select()

  console.log("Anon insert to communication_conversations:", cData, cErr)

  // Test insert to notifications
  const { data: nData, error: nErr } = await anonSupabase
    .from('notifications')
    .insert({
      category: 'chat',
      title: 'Test Notification',
      message: 'Test Message'
    })
    .select()

  console.log("Anon insert to notifications:", nData, nErr)
}

testRLS()
