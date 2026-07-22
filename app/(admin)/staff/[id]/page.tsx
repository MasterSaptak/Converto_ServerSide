import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { EditStaffForm } from './edit-staff-form'

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()
  const { data: staffData } = await supabase.from('staff').select('*').eq('id', id).single()

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)

  if (!profile) {
    return <div>Profile not found</div>
  }

  return (
    <div className="space-y-6 max-w-[800px] mx-auto p-4 sm:p-8">
      <Link href="/staff" className="text-sm font-bold uppercase hover:underline flex items-center gap-2 mb-4 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Staff
      </Link>
      <EditStaffForm profile={profile} staffData={staffData} authUser={authUser?.user} />
    </div>
  )
}
