import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://usibqzifqzfpxfvngeow.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJxemlmcXpmcHhmdm5nZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk1ODc2OCwiZXhwIjoyMDk5NTM0NzY4fQ.S8Fgyty3YoIyM25pU0J5DnxVdI9XEj6wmAWQfdi8eW0';

const supabase = createClient(supabaseUrl, serviceKey);

async function runSql() {
  const sqlPath = path.join(process.cwd(), 'schema_v17_notifications_and_chat_fix.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying V17 SQL Schema...');

  // Try calling rpc 'exec_sql' or 'exec' or query via postgres REST
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.log('exec_sql RPC failed/not found, trying statement execution:', error.message);
  } else {
    console.log('Success via exec_sql!', data);
  }
}

runSql();
