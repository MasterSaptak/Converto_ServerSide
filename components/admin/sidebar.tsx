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
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Requests', href: '/requests', icon: ClipboardList },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Wallets', href: '/wallets', icon: Wallet },
  { name: 'Exchange', href: '/exchange', icon: RefreshCcw },
  { name: 'Buy For Me', href: '/buy-for-me', icon: ShoppingBag },
  { name: 'Tickets', href: '/tickets', icon: Ticket },
  { name: 'Finance', href: '/finance', icon: BarChart3 },
  { name: 'Staff', href: '/staff', icon: ShieldCheck },
  { name: 'Audit Logs', href: '/audit-logs', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-white border-r-4 border-black w-64">
      <div className="p-6 border-b-4 border-black bg-accent">
        <h1 className="text-2xl font-black tracking-tighter uppercase">Converto</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">Admin ERP v1.0</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 font-bold transition-all border-2 border-transparent",
                isActive 
                  ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                  : "hover:bg-accent hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black/70 hover:text-black"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t-4 border-black">
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
          className="flex items-center gap-3 px-4 py-3 w-full font-bold text-red-600 hover:bg-red-50 transition-all border-2 border-transparent hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
