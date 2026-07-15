'use client'

import { Bell, Search, User, Moon, Sun } from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    document.cookie = "demo_auth=; path=/; max-age=0"
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    window.location.href = '/'
  }

  return (
    <header className="h-20 border-b-4 border-black bg-white dark:bg-card flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/50 dark:text-white/50" />
          <input 
            type="text" 
            placeholder="Search requests, users, transactions..."
            className="w-full pl-10 pr-4 py-2 border-2 border-black font-bold focus:outline-none focus:bg-accent transition-all placeholder:text-black/30 dark:placeholder:text-white/30 dark:bg-card dark:text-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {mounted && (
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="relative p-2 border-2 border-black hover:bg-accent transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        )}

        <button className="relative p-2 border-2 border-black hover:bg-accent transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-black rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            3
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 p-1 border-2 border-black hover:bg-accent transition-all pr-4">
            <Avatar className="w-10 h-10 rounded-none border-r-2 border-black">
              <AvatarImage src="" />
              <AvatarFallback className="rounded-none font-black bg-black text-white dark:bg-white dark:text-black">AD</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-black leading-none text-foreground">Admin User</p>
              <p className="text-[10px] font-bold text-black/50 dark:text-white/50 uppercase tracking-tighter">Super Admin</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-56 dark:bg-card">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-black text-foreground">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-black dark:bg-white h-[2px]" />
              <DropdownMenuItem className="font-bold focus:bg-accent text-foreground">Profile Settings</DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleLogout}
                className="font-bold focus:bg-accent text-red-600 dark:text-red-400"
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
