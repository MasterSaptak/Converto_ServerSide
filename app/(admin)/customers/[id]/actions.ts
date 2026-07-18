'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

export async function updateCustomerProfile(id: string, formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  const updates = {
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    country: formData.get('country') as string,
    address: formData.get('address') as string,
    timezone: formData.get('timezone') as string,
    is_staff: formData.get('is_staff') === 'on',
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/customers/${id}`)
  return { success: true }
}

export async function manageWalletBalance(accountId: string, amount: number, type: 'credit' | 'debit', description: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  // Retrieve current account balance
  const { data: account, error: accountError } = await supabase
    .from('wallet_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (accountError || !account) {
    return { success: false, error: accountError?.message || 'Account not found' }
  }

  let newBalance = Number(account.available_balance || 0)
  if (type === 'credit') {
    newBalance += amount
  } else {
    newBalance -= amount
    if (newBalance < 0) {
      return { success: false, error: 'Insufficient funds' }
    }
  }

  // Usually this should be done in a secure RPC to avoid race conditions
  const { error: updateError } = await supabase
    .from('wallet_accounts')
    .update({
      available_balance: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', accountId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Create a transaction record
  await supabase.from('wallet_transactions').insert({
    wallet_account_id: accountId,
    amount: amount,
    type: type,
    status: 'completed',
    description: description
  })

  // We revalidate the customer path later from the client component because we don't have the customer ID here
  // or we can just let the client refresh.
  return { success: true }
}

export async function sendPasswordReset(email: string) {
  if (!email) return { success: false, error: 'Email is required' }
  
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function toggleStaffStatus(id: string, isStaff: boolean) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  const { error } = await supabase
    .from('profiles')
    .update({ is_staff: isStaff, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/customers/${id}`)
  return { success: true }
}

export async function deleteCustomerCompletely(id: string) {
  // We need the admin client to bypass RLS and delete from auth.users
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Delete from auth.users (this should cascade if configured correctly)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

  if (authError) {
    console.error('Error deleting auth user:', authError)
  }

  // Explicitly delete from other tables if they aren't ON DELETE CASCADE
  // service_requests
  await supabaseAdmin.from('service_requests').delete().eq('profile_id', id)
  
  // documents
  await supabaseAdmin.from('documents').delete().eq('customer_id', id)
  
  // wallets (wallet_transactions and wallet_accounts should cascade from wallets)
  const { data: wallets } = await supabaseAdmin.from('wallets').select('id').eq('profile_id', id)
  if (wallets && wallets.length > 0) {
    for (const w of wallets) {
      // Deleting wallet accounts for this wallet
      const { data: accounts } = await supabaseAdmin.from('wallet_accounts').select('id').eq('wallet_id', w.id)
      if (accounts && accounts.length > 0) {
        for (const a of accounts) {
           await supabaseAdmin.from('wallet_transactions').delete().eq('wallet_account_id', a.id)
        }
        await supabaseAdmin.from('wallet_accounts').delete().eq('wallet_id', w.id)
      }
      await supabaseAdmin.from('wallets').delete().eq('id', w.id)
    }
  }

  // Finally delete profile (if not already deleted by cascade)
  const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', id)

  if (profileError) {
    console.error('Error deleting profile:', profileError)
  }

  revalidatePath('/customers')
  return { success: true }
}
