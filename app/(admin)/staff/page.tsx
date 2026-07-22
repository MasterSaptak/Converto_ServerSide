import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ShieldCheck, UserCircle, Mail, Phone, MapPin, Search } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams;
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
      },
    }
  )

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('is_staff', true)
    .order('full_name', { ascending: true })

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data: staffProfiles, error } = await query

  // Optionally fetch staff role mappings if needed, but profiles is the main source
  const { data: staffRoles } = await supabase
    .from('staff')
    .select('id, is_active')

  const staffRoleMap = new Map(staffRoles?.map(s => [s.id, s]) || [])

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-4 sm:p-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8" />
            Staff & Roles
          </h1>
          <p className="text-sm font-bold text-black/60 uppercase tracking-widest mt-2">
            Manage system administrators and staff profiles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form className="relative" action="/staff" method="GET">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
            <input 
              type="text" 
              name="q"
              defaultValue={q || ''}
              placeholder="SEARCH STAFF..." 
              className="pl-9 pr-4 py-2 border-2 border-black bg-gray-50 text-sm font-bold placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-colors uppercase"
            />
          </form>
          <Link href="/staff/add" className="bg-yellow-400 text-black border-2 border-black px-6 py-2 font-black uppercase tracking-widest text-sm hover:bg-yellow-300 hover:-translate-y-0.5 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none inline-block">
            + ADD STAFF
          </Link>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="bg-red-50 border-2 border-red-500 p-4 text-red-700 font-bold uppercase text-sm">
          Error loading staff profiles: {error.message}
        </div>
      )}

      {/* STAFF GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {staffProfiles?.map((profile) => {
          const staffDetails = staffRoleMap.get(profile.id)
          const isActive = staffDetails?.is_active ?? true
          
          return (
            <div key={profile.id} className={`bg-white border-4 border-black p-6 flex flex-col ${isActive ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all' : 'opacity-70 bg-gray-50'}`}>
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-black bg-yellow-100 flex items-center justify-center overflow-hidden shrink-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name || 'Staff'} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-8 h-8 text-black/40" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-lg truncate uppercase">{profile.full_name || profile.username || 'Unnamed Staff'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 border-2 border-black ${isActive ? 'bg-green-400' : 'bg-red-400'}`}>
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      {profile.is_staff && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-black text-white">
                          STAFF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 flex-1 pt-4 border-t-2 border-black/10">
                <div className="flex items-center gap-3 text-sm font-bold text-black/70">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{profile.email || 'No email'}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-3 text-sm font-bold text-black/70">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.country && (
                  <div className="flex items-center gap-3 text-sm font-bold text-black/70">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="uppercase">{profile.country}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t-2 border-black flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">
                  JOINED {new Date(profile.created_at).toLocaleDateString('en-GB')}
                </span>
                <Link href={`/staff/${profile.id}`} className="text-xs font-black uppercase hover:underline decoration-2 underline-offset-4">
                  Edit Profile →
                </Link>
              </div>
            </div>
          )
        })}

        {(!staffProfiles || staffProfiles.length === 0) && !error && (
          <div className="col-span-full py-12 text-center border-4 border-dashed border-black/20 text-black/40 font-bold uppercase tracking-widest">
            No staff profiles found.
          </div>
        )}
      </div>
    </div>
  )
}
