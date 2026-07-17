import { Search, Mail, Phone, MapPin, UserCheck, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function CustomersPage({
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
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  // Fetch all non-staff profiles
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('is_staff', false)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data: customers } = await query

  // Fetch aggregate order counts and totals per profile_id
  const { data: allOrders } = await supabase
    .from('service_requests')
    .select('profile_id, total, status')

  // Build a lookup map: profile_id -> { count, spent }
  const customerStats: Record<string, { count: number; spent: number; active: boolean }> = {}
  if (allOrders) {
    for (const order of allOrders) {
      if (!customerStats[order.profile_id]) {
        customerStats[order.profile_id] = { count: 0, spent: 0, active: false }
      }
      customerStats[order.profile_id].count++
      customerStats[order.profile_id].spent += order.total || 0
      // If ANY order is not completed/cancelled, the customer is "Active"
      if (!['Completed', 'Cancelled', 'Rejected', 'Refunded'].includes(order.status)) {
        customerStats[order.profile_id].active = true
      }
    }
  }

  const totalCustomers = customers?.length || 0
  const activeCustomers = customers?.filter(c => customerStats[c.id]?.active).length || 0

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Customer CRM</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Manage Client Relationships and Account Activity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {/* Search & Stats Sidebar */}
         <div className="md:col-span-1 space-y-6">
            <div className="brutal-card bg-white p-6 space-y-4">
               <h3 className="font-black uppercase text-sm">Quick Search</h3>
               <form className="relative" action="/customers" method="GET">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                  <input type="text" name="q" defaultValue={q || ''} placeholder="Name, Email, ID..." className="brutal-input w-full pl-10" />
               </form>
               <div className="pt-4 space-y-2 border-t-2 border-black/5">
                  <div className="flex items-center justify-between font-bold">
                     <span className="text-xs text-black/60">Total Customers</span>
                     <span className="text-lg">{totalCustomers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                     <span className="text-xs text-black/60">With Active Orders</span>
                     <span className="text-lg text-green-600">{activeCustomers.toLocaleString()}</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Customer List */}
         <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 gap-4">
               {(!customers || customers.length === 0) ? (
                 <div className="brutal-card bg-white p-12 text-center">
                    <p className="font-bold text-xs uppercase opacity-50">No customers found</p>
                 </div>
               ) : customers.map(customer => {
                 const stats = customerStats[customer.id] || { count: 0, spent: 0, active: false }
                 return (
                  <div key={customer.id} className="brutal-card bg-white p-6 flex items-center justify-between group cursor-pointer hover:bg-slate-50">
                     <div className="flex items-center gap-6">
                        <Avatar className="w-16 h-16 rounded-none border-4 border-black">
                          <AvatarImage src={customer.avatar_url || ''} />
                          <AvatarFallback className="rounded-none font-black text-xl bg-accent">{customer.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                           <div className="flex items-center gap-2">
                              <h4 className="text-xl font-black uppercase">{customer.full_name || 'Unnamed'}</h4>
                              {stats.active && <UserCheck className="w-4 h-4 text-green-600" />}
                           </div>
                           <p className="text-sm font-bold text-black/50">{customer.email || 'No email'}</p>
                           <div className="flex items-center gap-4 mt-2">
                              <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5">{stats.count} Requests</span>
                              <span className="text-[10px] font-black uppercase bg-accent text-black px-2 py-0.5">${stats.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} Spent</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end gap-2">
                        <p className="text-[10px] font-black uppercase text-black/40">Joined {new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                        <Link href={`/customers/${customer.id}`} className="p-3 border-2 border-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]">
                           View Profile
                        </Link>
                     </div>
                  </div>
                 )
               })}
            </div>
         </div>
      </div>
    </div>
  )
}
