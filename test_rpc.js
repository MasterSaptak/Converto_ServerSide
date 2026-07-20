const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  'https://usibqzifqzfpxfvngeow.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJxemlmcXpmcHhmdm5nZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk1ODc2OCwiZXhwIjoyMDk5NTM0NzY4fQ.S8Fgyty3YoIyM25pU0J5DnxVdI9XEj6wmAWQfdi8eW0'
)

async function test() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'ALTER PUBLICATION supabase_realtime ADD TABLE user_rewards;' })
  console.log('Result:', data, error)
}
test()
