import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function logAuditAction({
  action,
  entity_type,
  entity_id,
  old_data,
  new_data
}: {
  action: string
  entity_type: string
  entity_id?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
}) {
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

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return // Can't audit without user context

  // Get staff profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_staff')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_staff) return // Only staff actions are audited here

  // Insert audit log
  await supabase
    .from('audit_logs')
    .insert({
      staff_id: user.id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      ip_address: '127.0.0.1' // Ideally from req headers, but Next.js Server Actions don't expose req easily
    })
}
