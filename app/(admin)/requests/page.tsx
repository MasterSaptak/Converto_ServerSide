import { Search, Filter, Plus, ArrowUpRight, MoreVertical } from 'lucide-react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import KanbanBoard from '@/components/admin/kanban-board'

export default async function RequestsPage() {
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

  // Fetch Stages
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // Fetch Statuses
  const { data: statuses } = await supabase
    .from('pipeline_statuses')
    .select('*')
    .eq('is_active', true)

  // Fetch active requests
  const { data: requests } = await supabase
    .from('service_requests')
    .select('*, profile:profiles!service_requests_profile_id_fkey(*), service:services(*)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Unified Requests</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">
            Enterprise Workflow Pipeline
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/requests/new" className="brutal-button bg-primary text-primary-foreground flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </Link>
        </div>
      </div>

      <div className="brutal-card bg-white p-4 flex flex-wrap gap-4 items-center shrink-0">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
          <input type="text" placeholder="Search by ID, customer name, or details..." className="brutal-input w-full pl-10" />
        </div>
        <div className="flex gap-4">
           <select className="brutal-input font-bold bg-white">
             <option>All Services</option>
             <option>Currency Exchange</option>
             <option>Buy For Me</option>
             <option>Ticket Booking</option>
             <option>Education</option>
             <option>Global Payments</option>
           </select>
           <button className="brutal-button bg-white flex items-center gap-2">
             <Filter className="w-4 h-4" />
             Filters
           </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <KanbanBoard 
          initialStages={stages || []} 
          initialStatuses={statuses || []} 
          initialRequests={requests || []} 
        />
      </div>
    </div>
  )
}
