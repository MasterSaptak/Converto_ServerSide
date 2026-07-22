import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'

export async function SidebarServer() {
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

  if (user) {
    const { data: staff } = await supabase
      .from('staff')
      .select('name, role:roles(name)')
      .eq('id', user.id)
      .single()
    
    if (staff && staff.role) {
      role = (staff.role as any).name
      userName = staff.name || 'Admin'
    } else {
      role = 'Super Admin' // Fallback for MVP if roles table isn't seeded
    }
  }

  return (
    <>
      <Sidebar role={role} user={{ name: userName, email: userEmail }} />
      <div className="md:hidden fixed top-4 left-4 z-50">
        <MobileSidebar role={role} />
      </div>
    </>
  )
}
