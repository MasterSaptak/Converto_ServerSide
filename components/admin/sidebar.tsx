'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Wallet, 
  RefreshCcw, 
  ShoppingBag, 
  Ticket, 
  BarChart3, 
  Settings, 
  LogOut,
  Bell,
  ShieldCheck,
  History,
  GraduationCap,
  Globe,
  MessageSquare,
  Workflow,
  ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'

const coreNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Requests', href: '/requests', icon: ClipboardList },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Support Inbox', href: '/messages', icon: MessageSquare },
]

const modulesNav = [
  { name: 'Currency Exchange', href: '/requests?service=exchange', icon: RefreshCcw },
  { name: 'Buy For Me', href: '/requests?service=buy_for_me', icon: ShoppingBag },
  { name: 'Ticket Booking', href: '/requests?service=ticket_booking', icon: Ticket },
  { name: 'Education', href: '/requests?service=education', icon: GraduationCap },
  { name: 'Global Payments', href: '/requests?service=payments', icon: Globe },
  { name: 'Support Tickets', href: '/requests?service=support', icon: MessageSquare },
]

const systemNav = [
  { name: 'Service Registry', href: '/services-registry', icon: Workflow, roles: ['Super Admin'] },
  { name: 'Finance & Ledger', href: '/finance', icon: Wallet, roles: ['Super Admin', 'Treasury'] },
  { name: 'Workflows & Pricing', href: '/workflows', icon: Workflow },
  { name: 'Exchange Rates', href: '/exchange-rates', icon: RefreshCcw },
  { name: 'Staff & Roles', href: '/staff', icon: ShieldCheck },
  { name: 'Audit & Security', href: '/audit', icon: ShieldAlert, roles: ['Super Admin'] },
  { name: 'Platform Settings', href: '/settings', icon: Settings, roles: ['Super Admin'] },
]

function NavGroup({ title, items, pathname, userRole }: { title: string, items: any[], pathname: string, userRole: string }) {
  const visibleItems = items.filter(item => !item.roles || item.roles.includes(userRole))
  
  if (visibleItems.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="px-4 mb-1.5 text-xs font-black tracking-widest uppercase text-muted-foreground">{title}</h3>
      <div className="space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 font-bold transition-all border-2 border-transparent text-sm",
                isActive 
                  ? "bg-foreground text-background border-border shadow-[3px_3px_0px_0px_var(--color-border)]" 
                  : "hover:bg-accent hover:border-border hover:shadow-[3px_3px_0px_0px_var(--color-border)] text-foreground/70 hover:text-foreground hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function Sidebar({ role = 'Staff' }: { role?: string }) {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex flex-col h-full bg-card border-r-4 border-border w-64">
      <div className="px-4 py-4 border-b-4 border-border bg-accent text-accent-foreground">
        <h1 className="text-xl font-black tracking-tighter uppercase">Converto</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-0.5">Platform v2.0</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <NavGroup title="Core" items={coreNav} pathname={pathname} userRole={role} />
        <NavGroup title="Modules" items={modulesNav} pathname={pathname} userRole={role} />
        <NavGroup title="System" items={systemNav} pathname={pathname} userRole={role} />
      </nav>

      <div className="p-3 border-t-4 border-border">
        <button 
          onClick={async () => {
            document.cookie = "demo_auth=; path=/; max-age=0"
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            if (supabase) {
              await supabase.auth.signOut()
            }
            window.location.href = '/'
          }}
          className="flex items-center gap-3 px-4 py-3 w-full font-bold text-red-600 dark:text-red-400 hover:bg-destructive/10 transition-all border-2 border-transparent hover:border-border hover:shadow-[4px_4px_0px_0px_var(--color-border)]"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
