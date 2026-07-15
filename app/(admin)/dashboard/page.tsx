'use client'

import * as React from 'react'
import { 
  ClipboardList, 
  RefreshCcw, 
  ShoppingBag, 
  Ticket, 
  Users, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Download,
  Plus,
  Database,
  Server,
  ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateRangePicker } from '@/components/admin/date-range-picker'

function SystemActivityFeed() {
  const [activities, setActivities] = React.useState([
    { id: 1, type: 'database', message: 'User DB backup completed', time: 'Just now', icon: Database },
    { id: 2, type: 'server', message: 'Server instance rescaled to 4 nodes', time: '2 mins ago', icon: Server },
    { id: 3, type: 'auth', message: 'Admin login detected from new IP', time: '5 mins ago', icon: ShieldCheck },
  ])

  React.useEffect(() => {
    const interval = setInterval(() => {
      const newEvents = [
        { type: 'database', message: 'Record sync successful', icon: Database },
        { type: 'server', message: 'CPU utilization spike detected', icon: Server },
        { type: 'auth', message: 'Token refresh issued', icon: ShieldCheck },
        { type: 'api', message: 'Payment gateway ping OK', icon: Activity },
      ]
      const randomEvent = newEvents[Math.floor(Math.random() * newEvents.length)]
      
      setActivities(prev => [{
        id: Date.now(),
        ...randomEvent,
        time: 'Just now'
      }, ...prev].slice(0, 5))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="brutal-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b-4 border-border pb-4">
        <h3 className="font-black text-xl uppercase tracking-tight">System Activity</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Live</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse border border-border"></div>
        </div>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
            <div className="p-2 border-2 border-border bg-accent shrink-0">
              <activity.icon className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold">{activity.message}</p>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [dateRange, setDateRange] = React.useState<any>()

  const stats = [
    { name: 'Total Requests', value: dateRange?.from ? '842' : '1,234', change: '+12%', icon: ClipboardList, color: 'bg-blue-400' },
    { name: 'Active Exchanges', value: dateRange?.from ? '31' : '45', change: '+5%', icon: RefreshCcw, color: 'bg-accent' },
    { name: 'Buy For Me', value: dateRange?.from ? '56' : '89', change: '+18%', icon: ShoppingBag, color: 'bg-green-400' },
    { name: 'Tickets Pending', value: dateRange?.from ? '8' : '12', change: '-2%', icon: Ticket, color: 'bg-purple-400' },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Dashboard</h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
            {dateRange?.from ? `Metrics for Selected Period` : 'Operational Overview & Real-time Metrics'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker onRangeChange={setDateRange} />
          
          <div className="flex items-center gap-2">
            <button className="brutal-button bg-card flex items-center gap-2">
              <Download className="w-4 h-4" />
              Report
            </button>
            <button className="brutal-button flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Task
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="brutal-card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className={cn("p-2 border-2 border-border shadow-[2px_2px_0px_0px_var(--color-border)]", stat.color)}>
                <stat.icon className="w-6 h-6 text-foreground" />
              </div>
              <span className={cn(
                "text-xs font-black px-2 py-1 border-2 border-border text-foreground",
                stat.change.startsWith('+') ? "bg-green-400" : "bg-red-400"
              )}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">{stat.name}</p>
              <p className="text-3xl font-black">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 brutal-card bg-card overflow-hidden flex flex-col">
          <div className="p-6 border-b-4 border-border flex items-center justify-between bg-card">
            <h3 className="font-black text-xl uppercase tracking-tight">Recent Requests</h3>
            <button className="text-sm font-black underline decoration-2 underline-offset-4 hover:text-accent transition-colors">View All</button>
          </div>
          <div className="flex-1">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b-4 border-border bg-muted">
                   <th className="p-4 font-black uppercase text-xs">Customer</th>
                   <th className="p-4 font-black uppercase text-xs">Type</th>
                   <th className="p-4 font-black uppercase text-xs">Status</th>
                   <th className="p-4 font-black uppercase text-xs">Date</th>
                   <th className="p-4 font-black uppercase text-xs text-right">Action</th>
                 </tr>
               </thead>
               <tbody>
                 {[1, 2, 3, 4, 5].map((i) => (
                   <tr key={i} className="border-b-2 border-border last:border-0 hover:bg-muted/50 transition-colors">
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-accent border-2 border-border font-black flex items-center justify-center text-xs text-accent-foreground">
                           JD
                         </div>
                         <span className="font-bold">John Doe</span>
                       </div>
                     </td>
                     <td className="p-4">
                       <span className="font-bold px-2 py-1 bg-blue-100 dark:bg-blue-900 border-2 border-border text-[10px] uppercase">Exchange</span>
                     </td>
                     <td className="p-4">
                        <span className="flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-yellow-400 border border-border"></span>
                           <span className="font-bold text-sm">Processing</span>
                        </span>
                     </td>
                     <td className="p-4 font-bold text-sm text-muted-foreground">2 mins ago</td>
                     <td className="p-4 text-right">
                       <button className="p-1 border-2 border-border hover:bg-accent hover:text-accent-foreground transition-all">
                         <ArrowUpRight className="w-4 h-4" />
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

        {/* Right Column: Finance & Activity */}
        <div className="flex flex-col gap-8">
          {/* Finance Snapshot */}
          <div className="brutal-card bg-primary text-primary-foreground p-6 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-xl uppercase tracking-tight">Finance Overview</h3>
               <Activity className="w-6 h-6 text-accent" />
            </div>
            
            <div className="space-y-4">
              <div className="p-4 border-2 border-primary-foreground/20 bg-primary-foreground/5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/50">Total Revenue</p>
                <p className="text-3xl font-black text-accent">$128,450.00</p>
              </div>
              
              <div className="p-4 border-2 border-primary-foreground/20 bg-primary-foreground/5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/50">Wallet Balances</p>
                <p className="text-3xl font-black">$542,100.00</p>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-primary-foreground/20">
               <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-primary-foreground/70">Monthly Target</span>
                  <span className="text-xs font-bold text-accent">85%</span>
               </div>
               <div className="h-4 border-2 border-primary-foreground bg-primary-foreground/10 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-accent w-[85%] border-r-2 border-primary"></div>
               </div>
            </div>

            <button className="w-full py-4 bg-accent text-accent-foreground font-black uppercase tracking-widest text-sm border-2 border-primary-foreground shadow-[4px_4px_0px_0px_var(--color-primary-foreground)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all">
              Full Audit
            </button>
          </div>

          <SystemActivityFeed />
        </div>
      </div>
    </div>
  )
}
