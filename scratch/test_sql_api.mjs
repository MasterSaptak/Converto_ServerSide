import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testSqlEndpoint() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Try standard Supabase SQL admin endpoint
  try {
    const res = await fetch(`${url}/rest/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ query: 'SELECT 1' })
    })
    console.log("query endpoint status:", res.status, await res.text())
  } catch (e) {
    console.log("query endpoint err:", e)
  }
}

testSqlEndpoint()
