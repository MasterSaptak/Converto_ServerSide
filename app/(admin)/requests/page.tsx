import { Search, Filter, Plus, ArrowUpRight, MoreVertical } from 'lucide-react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import KanbanBoard from '@/components/admin/kanban-board'
import { RequestsFilter } from './components/requests-filter'
import { RefreshCcw } from 'lucide-react'

export default async function RequestsPage(props: { searchParams: Promise<{ service?: string }> }) {
  const searchParams = await props.searchParams
  const currentServiceSlug = searchParams?.service || 'all'

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

  // Fetch Services for dropdown
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Determine active service ID if filtering
  let activeServiceId = null
  if (currentServiceSlug !== 'all' && services) {
    const srv = services.find(s => s.slug === currentServiceSlug || s.code === currentServiceSlug)
    if (srv) activeServiceId = srv.id
  }

  // Fetch active requests
  let query = supabase
    .from('service_requests')
    .select('*, profile:profiles!service_requests_profile_id_fkey(*), service:services(*)')
    .order('created_at', { ascending: false })

  if (activeServiceId) {
    query = query.eq('service_id', activeServiceId)
  }

  const { data: requests } = await query

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
          {currentServiceSlug === 'exchange' && (
            <Link href="/exchange-rates" className="brutal-button bg-[#FF90E8] text-black flex items-center gap-2">
              <RefreshCcw className="w-4 h-4" />
              Manage Rates
            </Link>
          )}
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
        <RequestsFilter services={services || []} currentService={currentServiceSlug} />
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
