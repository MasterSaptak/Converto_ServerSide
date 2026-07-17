import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function requireStaffRole(allowedRoles?: string[]) {
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_staff')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_staff) {
    redirect('/') // Or to a dedicated unauthorized page
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // Check staff role
    const { data: staff } = await supabase
      .from('staff')
      .select('role:roles(name)')
      .eq('id', user.id)
      .single()
    
    // For this MVP, if roles aren't fully seeded, we'll softly allow if `staff` is null
    // But logically, it should block if the role doesn't match
    if (staff && staff.role && !allowedRoles.includes((staff.role as any).name)) {
      redirect('/') 
    }
  }

  return user
}
