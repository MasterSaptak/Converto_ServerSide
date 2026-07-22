'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updateCurrencyRate({
  baseCurrency,
  targetCurrency,
  customRate
}: {
  baseCurrency: string
  targetCurrency: string
  customRate: number
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {}
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('currency_rates')
    .upsert({
      base_currency: baseCurrency,
      target_currency: targetCurrency,
      custom_rate: customRate,
      admin_updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'base_currency, target_currency' })

  if (error) {
    console.error('Failed to update currency rate:', error)
    throw new Error('Failed to update currency rate')
  }

  // Also trigger a revalidation of the user side if necessary (currently just revalidating admin side)
  revalidatePath('/exchange-rates')
  return { success: true }
}
