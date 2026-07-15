import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Supabase configuration is missing. Please check your environment variables.')
    return null as any // Return null but type-cast to avoid breaking consumers that expect a client
  }

  return createBrowserClient(url, key)
}
