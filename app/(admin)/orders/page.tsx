import { Search, Filter, Plus, ArrowUpRight, MoreVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { ServiceRequest } from '@/types/database'

const statusStyles: Record<string, string> = {
  'Submitted': 'bg-blue-100 text-blue-800 border-blue-400',
  'Processing': 'bg-yellow-100 text-yellow-800 border-yellow-400',
  'Quote Sent': 'bg-purple-100 text-purple-800 border-purple-400',
  'Completed': 'bg-green-100 text-green-800 border-green-400',
  'Waiting Payment': 'bg-orange-100 text-orange-800 border-orange-400',
  'Cancelled': 'bg-red-100 text-red-800 border-red-400',
  'Rejected': 'bg-red-100 text-red-800 border-red-400',
}

export default async function OrdersPage() {
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

  const { data: orders } = await supabase
    .from('service_requests')
    .select('*, profile:profiles(*), service:services(*)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Unified Orders</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Manage and track all customer orders across all modules</p>
        </div>
      </div>

      <div className="brutal-card bg-white p-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
          <input type="text" placeholder="Search by ID, customer name, or details..." className="brutal-input w-full pl-10" />
        </div>
        <div className="flex gap-4">
           <select className="brutal-input font-bold bg-white">
             <option>All Modules</option>
             <option>Currency Exchange</option>
             <option>Buy For Me</option>
             <option>Ticket Booking</option>
             <option>Education</option>
             <option>Global Payments</option>
           </select>
           <select className="brutal-input font-bold bg-white">
             <option>All Statuses</option>
             <option>Draft</option>
             <option>Awaiting Payment</option>
             <option>Processing</option>
             <option>Completed</option>
           </select>
           <button className="brutal-button bg-white flex items-center gap-2">
             <Filter className="w-4 h-4" />
             Filters
           </button>
        </div>
      </div>

      <div className="brutal-card bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 border-b-4 border-black">
            <TableRow className="hover:bg-transparent">
              <TableHead className="p-4 font-black uppercase text-xs text-black">ID</TableHead>
              <TableHead className="p-4 font-black uppercase text-xs text-black">Customer</TableHead>
              <TableHead className="p-4 font-black uppercase text-xs text-black">Module</TableHead>
              <TableHead className="p-4 font-black uppercase text-xs text-black">Status</TableHead>
              <TableHead className="p-4 font-black uppercase text-xs text-black">Priority</TableHead>
              <TableHead className="p-4 font-black uppercase text-xs text-black">Amount</TableHead>
              <TableHead className="p-4 font-black uppercase text-xs text-black">Date</TableHead>
              <TableHead className="p-4 font-black uppercase text-xs text-black text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-8 text-center font-bold uppercase opacity-50">
                  No orders found
                </TableCell>
              </TableRow>
            ) : orders?.map((order: any) => (
              <TableRow key={order.id} className="border-b-2 border-black hover:bg-slate-50 transition-colors group">
                <TableCell className="p-4 font-black font-mono text-xs">
                  {order.id.split('-')[0]}...
                </TableCell>
                <TableCell className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent border-2 border-black font-black flex items-center justify-center text-xs">
                      {order.profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                    </div>
                    <span className="font-bold">{order.profile?.full_name || 'Unknown'}</span>
                  </div>
                </TableCell>
                <TableCell className="p-4 font-bold uppercase text-[10px] tracking-widest">{order.service?.name}</TableCell>
                <TableCell className="p-4">
                  <Badge variant="outline" className={cn("rounded-none border-2 font-black uppercase text-[10px]", statusStyles[order.status] || 'bg-slate-100')}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="p-4">
                   <span className={cn(
                     "font-bold text-xs uppercase",
                     order.priority === 'Urgent' ? "text-red-600" : 
                     order.priority === 'High' ? "text-orange-600" : "text-black/60"
                   )}>
                     {order.priority}
                   </span>
                </TableCell>
                <TableCell className="p-4 font-black font-mono">
                  {order.amount ? `${order.amount.toLocaleString(undefined, {minimumFractionDigits: 2})} ${order.currency}` : 'N/A'}
                </TableCell>
                <TableCell className="p-4 font-bold text-sm text-black/50">
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="p-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                     <Link href={`/orders/${order.id}`} className="p-2 border-2 border-black hover:bg-accent transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] bg-white">
                        <ArrowUpRight className="w-4 h-4" />
                     </Link>
                     <DropdownMenu>
                       <DropdownMenuTrigger className="p-2 border-2 border-black hover:bg-slate-100 transition-all bg-white rounded-md">
                          <MoreVertical className="w-4 h-4" />
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold">
                         <DropdownMenuItem>
                           <Link href={`/orders/${order.id}`} className="w-full block">
                             View Details
                           </Link>
                         </DropdownMenuItem>
                         <DropdownMenuItem>Assign Staff</DropdownMenuItem>
                         <DropdownMenuItem>View Timeline</DropdownMenuItem>
                         <DropdownMenuItem className="text-red-600">Cancel Order</DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
