import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { 
  ClipboardList, 
  RefreshCcw, 
  ShoppingBag, 
  Ticket, 
  ArrowUpRight, 
  DollarSign, 
  Activity,
  Download,
  GraduationCap,
  Globe,
  Users,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardActivityFeed } from './components/activity-feed'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
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

  // Create an Admin client that ignores user cookies and purely uses the Service Role Key
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── Fetch all service requests ──────────────────────
  const { data: allOrders, count: totalRequests } = await supabaseAdmin
    .from('service_requests')
    .select('id, status, total, currency, created_at, profile_id, service_id', { count: 'exact' })

  // ── Fetch services for code lookup ──────────────────
  const { data: services } = await supabaseAdmin
    .from('services')
    .select('id, code, name')

  const serviceMap: Record<string, string> = {}
  services?.forEach(s => { serviceMap[s.id] = s.code || '' })

  // ── Compute stats ──────────────────────────────────
  let activeExchanges = 0
  let buyForMeCount = 0
  let ticketCount = 0
  let educationCount = 0
  let globalPaymentsCount = 0
  let totalRevenue = 0

  // Pending action counts
  let submittedCount = 0
  let waitingPaymentCount = 0
  let processingCount = 0

  if (allOrders) {
    for (const order of allOrders) {
      const code = serviceMap[order.service_id] || ''
      const isActive = !['Completed', 'Cancelled', 'Rejected', 'Refunded'].includes(order.status)

      if (code === 'exchange' && isActive) activeExchanges++
      if (code === 'buy_for_me') buyForMeCount++
      if (code === 'ticket_booking') ticketCount++
      if (code === 'education') educationCount++
      if (code === 'global_payments') globalPaymentsCount++

      if (order.status === 'Completed' && order.total) {
        totalRevenue += order.total
      }

      // Pending actions
      if (order.status === 'Submitted') submittedCount++
      if (['Waiting Payment', 'Quote Sent'].includes(order.status)) waitingPaymentCount++
      if (order.status === 'Processing') processingCount++
    }
  }

  const pendingTotal = submittedCount + waitingPaymentCount + processingCount

  // ── Fetch customer count ────────────────────────────
  const { count: customerCount } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_staff', false)

  // ── Recent 5 orders ─────────────────────────────────
  const { data: recentOrders } = await supabaseAdmin
    .from('service_requests')
    .select('*, profile:profiles(full_name), service:services(name, code)')
    .order('created_at', { ascending: false })
    .limit(5)

  // ── Wallet balance aggregate ────────────────────────
  const { data: walletAccounts } = await supabaseAdmin
    .from('wallet_accounts')
    .select('available_balance, currency_code')

  let totalWalletBalance = 0
  walletAccounts?.forEach(a => { totalWalletBalance += a.available_balance || 0 })

  const stats = [
    { name: 'Total Requests', value: (totalRequests || 0).toLocaleString(), icon: ClipboardList, color: 'bg-blue-400' },
    { name: 'Active Exchanges', value: activeExchanges.toLocaleString(), icon: RefreshCcw, color: 'bg-accent' },
    { name: 'Buy For Me', value: buyForMeCount.toLocaleString(), icon: ShoppingBag, color: 'bg-green-400' },
    { name: 'Tickets', value: ticketCount.toLocaleString(), icon: Ticket, color: 'bg-purple-400' },
    { name: 'Education', value: educationCount.toLocaleString(), icon: GraduationCap, color: 'bg-indigo-400' },
    { name: 'Global Payments', value: globalPaymentsCount.toLocaleString(), icon: Globe, color: 'bg-teal-400' },
    { name: 'Customers', value: (customerCount || 0).toLocaleString(), icon: Users, color: 'bg-orange-400' },
  ]

  return (
    <div className="space-y-4 md:space-y-5 max-w-7xl mx-auto">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">Dashboard</h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-0.5">
            Operational Overview &amp; Real-time Metrics
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button className="brutal-button bg-card text-foreground flex items-center gap-2 text-sm py-1.5 px-3">
              <Download className="w-4 h-4" />
              Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid — Compact Bento Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.map((stat) => (
          <div key={stat.name} className="brutal-card-compact p-3 flex flex-col gap-2">
            <div className={cn("p-1.5 border-2 border-border shadow-[2px_2px_0px_0px_var(--color-border)] w-fit", stat.color)}>
              <stat.icon className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-tight">{stat.name}</p>
              <p className="text-xl font-black">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Bento Grid — 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Recent Orders + Pending Actions (span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Recent Requests Table */}
          <div className="brutal-card-static bg-card overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b-4 border-border flex items-center justify-between bg-card">
              <h3 className="font-black text-base uppercase tracking-tight">Recent Requests</h3>
              <Link href="/orders" className="text-xs font-black underline decoration-2 underline-offset-4 hover:text-accent transition-colors">View All</Link>
            </div>
            <div className="flex-1">
               <table className="w-full text-left">
                 <thead>
                   <tr className="border-b-4 border-border bg-muted">
                     <th className="px-4 py-2 font-black uppercase text-[10px] tracking-wider">Customer</th>
                     <th className="px-4 py-2 font-black uppercase text-[10px] tracking-wider">Service</th>
                     <th className="px-4 py-2 font-black uppercase text-[10px] tracking-wider">Status</th>
                     <th className="px-4 py-2 font-black uppercase text-[10px] tracking-wider">Amount</th>
                     <th className="px-4 py-2 font-black uppercase text-[10px] tracking-wider">Date</th>
                     <th className="px-4 py-2 font-black uppercase text-[10px] tracking-wider text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   {(!recentOrders || recentOrders.length === 0) ? (
                     <tr>
                       <td colSpan={6} className="px-4 py-6">
                         <div className="flex flex-col items-center justify-center opacity-50">
                           <ClipboardList className="w-6 h-6 mb-1.5" />
                           <span className="text-xs font-black uppercase tracking-widest">No requests yet</span>
                           <span className="text-[10px] font-bold text-muted-foreground mt-0.5">Requests will appear here as they come in</span>
                         </div>
                       </td>
                     </tr>
                   ) : recentOrders.map((order: any) => {
                     const statusColor = 
                       order.status === 'Completed' ? 'bg-green-400' :
                       order.status === 'Cancelled' ? 'bg-red-400' :
                       ['Processing', 'Submitted'].includes(order.status) ? 'bg-yellow-400' :
                       'bg-blue-400'

                     return (
                       <tr key={order.id} className="border-b-2 border-border last:border-0 hover:bg-muted/50 transition-colors">
                         <td className="px-4 py-2.5">
                           <div className="flex items-center gap-2">
                             <div className="w-7 h-7 bg-accent border-2 border-border font-black flex items-center justify-center text-[10px] text-accent-foreground shrink-0">
                               {(order.profile as any)?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                             </div>
                             <span className="font-bold text-sm truncate max-w-[120px]">{(order.profile as any)?.full_name || 'Unknown'}</span>
                           </div>
                         </td>
                         <td className="px-4 py-2.5">
                           <span className="font-bold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 border-2 border-border text-[10px] uppercase">{(order.service as any)?.name}</span>
                         </td>
                         <td className="px-4 py-2.5">
                            <span className="flex items-center gap-1.5">
                               <span className={cn("w-2 h-2 rounded-full border border-border", statusColor)}></span>
                               <span className="font-bold text-xs">{order.status}</span>
                            </span>
                         </td>
                         <td className="px-4 py-2.5 font-bold text-xs text-foreground">
                           {order.total != null
                             ? `${order.currency || '$'}${Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                             : <span className="text-muted-foreground">—</span>
                           }
                         </td>
                         <td className="px-4 py-2.5 font-bold text-xs text-muted-foreground">
                           {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                         </td>
                         <td className="px-4 py-2.5 text-right">
                           <Link href={`/orders/${order.id}`} className="p-1 border-2 border-border hover:bg-accent hover:text-accent-foreground transition-all inline-block">
                             <ArrowUpRight className="w-3.5 h-3.5" />
                           </Link>
                         </td>
                       </tr>
                     )
                   })}
                 </tbody>
               </table>
            </div>
          </div>

          {/* Pending Actions — compact, collapses when empty */}
          {pendingTotal > 0 && (
            <div className="brutal-card-compact p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <h3 className="font-black text-xs uppercase tracking-widest">Requires Attention</h3>
                <span className="ml-auto text-[10px] font-black bg-orange-400 text-foreground border-2 border-border px-1.5 py-0.5">{pendingTotal}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {submittedCount > 0 && (
                  <Link href="/orders?status=Submitted" className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-border bg-yellow-100 dark:bg-yellow-900/30 hover:shadow-[2px_2px_0px_0px_var(--color-border)] transition-all text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 border border-border"></span>
                    {submittedCount} Submitted
                  </Link>
                )}
                {waitingPaymentCount > 0 && (
                  <Link href="/orders?status=Waiting+Payment" className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-border bg-blue-100 dark:bg-blue-900/30 hover:shadow-[2px_2px_0px_0px_var(--color-border)] transition-all text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 border border-border"></span>
                    {waitingPaymentCount} Awaiting Payment
                  </Link>
                )}
                {processingCount > 0 && (
                  <Link href="/orders?status=Processing" className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-border bg-green-100 dark:bg-green-900/30 hover:shadow-[2px_2px_0px_0px_var(--color-border)] transition-all text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 border border-border"></span>
                    {processingCount} Processing
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Finance & Activity */}
        <div className="flex flex-col gap-5">
          {/* Finance Snapshot */}
          <div className="brutal-card-static bg-primary text-primary-foreground p-4 space-y-4">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-base uppercase tracking-tight">Finance Overview</h3>
               <Activity className="w-5 h-5 text-accent" />
            </div>
            
            <div className="space-y-3">
              <div className="p-3 border-2 border-primary-foreground/20 bg-primary-foreground/5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/50">Total Revenue (Completed)</p>
                <p className="text-2xl font-black text-accent">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              
              <div className="p-3 border-2 border-primary-foreground/20 bg-primary-foreground/5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/50">Total Wallet Balances</p>
                <p className="text-2xl font-black">${totalWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="p-3 border-2 border-primary-foreground/20 bg-primary-foreground/5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/50">Pending Orders</p>
                <p className="text-2xl font-black">{pendingTotal}</p>
              </div>
            </div>

            <Link href="/orders" className="block w-full py-3 bg-accent text-accent-foreground font-black uppercase tracking-widest text-xs border-2 border-primary-foreground shadow-[4px_4px_0px_0px_var(--color-primary-foreground)] hover:shadow-[2px_2px_0px_0px_var(--color-primary-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all text-center">
              Full Audit
            </Link>
          </div>

          <DashboardActivityFeed />
        </div>
      </div>
    </div>
  )
}
