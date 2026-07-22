'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { 
  LayoutDashboard, ClipboardList, Users, Wallet, RefreshCcw, 
  ShoppingBag, Ticket, Settings, LogOut, ShieldCheck, 
  GraduationCap, Globe, MessageSquare, Workflow, ShieldAlert,
  ChevronRight, ChevronLeft, MoreVertical, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const primaryNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Requests', href: '/requests', icon: ClipboardList },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Support', href: '/support', icon: MessageSquare },
]

const settingsNav: { name: string, href: string, icon: any, roles?: string[] }[] = [
  { name: 'Exchange Rates', href: '/exchange-rates', icon: RefreshCcw },
  { name: 'Staff & Roles', href: '/staff', icon: ShieldCheck },
]

function NavItem({ item, isActive, isCollapsed }: { item: any, isActive: boolean, isCollapsed: boolean }) {
  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.name : undefined}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 transition-all duration-200 group outline-none",
        isCollapsed ? "justify-center" : "",
        isActive 
          ? "bg-foreground text-background rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] border border-border"
          : "hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground font-medium"
      )}
    >
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-[6px] top-1/2 -translate-y-1/2 w-[4px] h-4 bg-yellow-400 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
      <div className={cn("flex items-center justify-center", isActive && !isCollapsed ? "ml-2" : "")}>
        <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-background" : "text-muted-foreground group-hover:text-foreground")} />
      </div>
      {!isCollapsed && (
        <span className={cn("text-[15px] whitespace-nowrap", isActive ? "font-bold" : "font-medium")}>
          {item.name}
        </span>
      )}
    </Link>
  )
}

export function Sidebar({ role = 'Staff', user = { name: 'Admin', email: 'admin@converto.com' } }: { role?: string, user?: { name: string, email: string } }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('sidebar_collapsed')
    if (saved === 'true') setIsCollapsed(true)
  }, [])

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', next.toString())
      if (next) setSettingsExpanded(false)
      return next
    })
  }

  const handleLogout = async () => {
    document.cookie = "demo_auth=; path=/; max-age=0"
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    window.location.href = '/'
  }

  const visibleSettings = settingsNav.filter(item => !item.roles || item.roles.includes(role))
  const isSettingsActive = visibleSettings.some(item => pathname === item.href) || pathname.startsWith('/settings')

  return (
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="hidden md:flex flex-col h-full bg-card border-r-2 border-border relative z-20 shrink-0"
    >
      {/* Collapse Toggle */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3.5 top-6 bg-background border-2 border-border rounded-full p-1 z-30 hover:bg-accent transition-colors shadow-sm"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Header / Logo Area */}
      <div className={cn("flex items-center pt-6 pb-4 px-5 border-b border-border/40", isCollapsed && "justify-center px-2")}>
        <div className={cn("w-8 h-8 bg-foreground rounded-lg flex items-center justify-center shrink-0", !isCollapsed && "mr-3")}>
          <span className="text-background font-black text-lg leading-none">C</span>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-base font-black tracking-tight uppercase leading-tight truncate">Converto</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">Platform v2</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-4 px-3 space-y-1">
        {primaryNav.map((item) => (
          <NavItem key={item.name} item={item} isActive={pathname === item.href} isCollapsed={isCollapsed} />
        ))}

        {visibleSettings.length > 0 && (
          <div className="pt-2">
            {!isCollapsed && (
              <button 
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors group"
              >
                <span>Settings</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", settingsExpanded ? "rotate-180" : "")} />
              </button>
            )}
            
            <AnimatePresence initial={false}>
              {(settingsExpanded || isCollapsed) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("overflow-hidden space-y-1", !isCollapsed && "pl-2")}
                >
                  {isCollapsed && <div className="my-2 border-t border-border/40" />}
                  {visibleSettings.map((item) => (
                    <NavItem key={item.name} item={item} isActive={pathname === item.href} isCollapsed={isCollapsed} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* User Profile Sticky Bottom */}
      <div className="p-3 border-t border-border/40 bg-card/50">
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(
            "flex items-center w-full gap-3 p-2 rounded-xl hover:bg-accent transition-colors border border-transparent hover:border-border text-left outline-none",
            isCollapsed && "justify-center"
          )}>
            <Avatar className="w-8 h-8 rounded-lg shrink-0 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{role}</p>
              </div>
            )}
            {!isCollapsed && <MoreVertical className="w-4 h-4 text-muted-foreground" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? "start" : "end"} side="right" sideOffset={12} className="w-56 rounded-xl shadow-lg border-2 border-border p-1">
            <div className="px-2 py-1.5 mb-1">
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <Link href="/settings" className="w-full">
              <DropdownMenuItem className="cursor-pointer font-medium text-[14px]">
                <Settings className="w-4 h-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer font-medium text-[14px] text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

