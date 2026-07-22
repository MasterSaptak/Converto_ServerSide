import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Header } from './header'

export async function HeaderServer() {
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
  let role = 'Staff'
  let userName = 'Admin'
  let userEmail = user?.email || 'admin@converto.com'
  let avatarUrl = ''

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
    if (profile) {
      userName = profile.full_name || userName
      avatarUrl = profile.avatar_url || ''
    }
    const { data: staff } = await supabase
      .from('staff')
      .select('role:roles(name)')
      .eq('id', user.id)
      .single()
    
    if (staff && staff.role) {
      role = (staff.role as any).name
    } else {
      role = 'Super Admin' 
    }
  }

  return <Header user={{ name: userName, email: userEmail, role, avatarUrl }} />
}
