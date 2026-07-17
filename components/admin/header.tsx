'use client'

import { Bell, Search, Moon, Sun, Download, RefreshCw, Smartphone, Monitor, X } from 'lucide-react'
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
import { NotificationBell } from './NotificationBell'

export function Header() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)

    // Capture the PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleLogout = async () => {
    document.cookie = "demo_auth=; path=/; max-age=0"
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    window.location.href = '/'
  }

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      setShowInstallModal(true)
    }
  }

  const handleUpdateApp = async () => {
    setIsUpdating(true)

    try {
      // 1. Clear all localStorage
      localStorage.clear()

      // 2. Clear all sessionStorage
      sessionStorage.clear()

      // 3. Clear all cookies
      document.cookie.split(';').forEach(c => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
      })

      // 4. Unregister all service workers and clear their caches
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }

      // 5. Clear all Cache Storage (SW caches)
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const name of cacheNames) {
          await caches.delete(name)
        }
      }

      // 6. Hard reload — bypass browser cache entirely
      window.location.replace(window.location.origin + window.location.pathname + '?_update=' + Date.now())
    } catch (err) {
      console.error('Update failed:', err)
      window.location.reload()
    }
  }

  return (
    <>
      <header className="h-14 md:h-16 border-b-4 border-border bg-card flex items-center justify-between pl-14 pr-3 md:px-6 sticky top-0 z-30">
        <div className="hidden md:flex items-center gap-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search requests, users, transactions..."
              className="w-full pl-10 pr-4 py-2 border-2 border-border font-bold focus:outline-none focus:bg-accent focus:text-accent-foreground transition-all placeholder:text-muted-foreground bg-transparent text-foreground"
            />
          </div>
        </div>
        <h1 className="md:hidden text-sm font-black uppercase tracking-wider text-foreground">Converto Ops</h1>

        <div className="flex items-center gap-3 md:gap-6">
          {mounted && (
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="relative p-2 border-2 border-border hover:bg-accent hover:text-accent-foreground transition-all shadow-[2px_2px_0px_0px_var(--color-border)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          )}

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 p-1 border-2 border-border hover:bg-accent transition-all pr-4">
              <Avatar className="w-10 h-10 rounded-none border-r-2 border-border">
                <AvatarImage src="" />
                <AvatarFallback className="rounded-none font-black bg-foreground text-background">AD</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-black leading-none text-foreground">Admin User</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Super Admin</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)] w-56 bg-card">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-black text-foreground">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border h-[2px]" />
                <DropdownMenuItem 
                  onClick={() => router.push('/profile')}
                  className="font-bold focus:bg-accent focus:text-accent-foreground cursor-pointer"
                >
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border h-[2px]" />
                <DropdownMenuItem 
                  onClick={handleInstallPWA}
                  className="font-bold focus:bg-accent focus:text-accent-foreground cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleUpdateApp}
                  className="font-bold focus:bg-accent focus:text-accent-foreground cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                  {isUpdating ? 'Updating...' : 'Update App'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border h-[2px]" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="font-bold focus:bg-destructive focus:text-destructive-foreground text-destructive cursor-pointer"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* PWA Install Instructions Modal */}
      {showInstallModal && mounted && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowInstallModal(false)}>
          <div 
            className="bg-card border-4 border-border shadow-[8px_8px_0px_0px_var(--color-border)] max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b-4 border-border bg-accent">
              <div className="flex items-center gap-3">
                <Download className="w-6 h-6 text-accent-foreground" />
                <h2 className="text-xl font-black uppercase text-accent-foreground">Install App</h2>
              </div>
              <button 
                onClick={() => setShowInstallModal(false)} 
                className="p-1 border-2 border-accent-foreground/30 hover:bg-accent-foreground/10 transition-all"
              >
                <X className="w-5 h-5 text-accent-foreground" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <p className="font-bold text-sm text-muted-foreground">
                Install Converto Operations as a standalone app on your device for a faster, native-like experience.
              </p>

              {/* Chrome / Edge (Desktop) */}
              <div className="border-2 border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  <h3 className="font-black uppercase text-sm">Chrome / Edge (Desktop)</h3>
                </div>
                <ol className="list-decimal list-inside text-sm space-y-2 font-bold text-muted-foreground">
                  <li>Click the <span className="text-foreground">install icon</span> in the address bar (⊕ or ↓)</li>
                  <li>Or open <span className="text-foreground">⋮ Menu → Install Converto Operations</span></li>
                  <li>Click <span className="text-foreground">&quot;Install&quot;</span> in the prompt</li>
                </ol>
              </div>

              {/* Android */}
              <div className="border-2 border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  <h3 className="font-black uppercase text-sm">Android (Chrome)</h3>
                </div>
                <ol className="list-decimal list-inside text-sm space-y-2 font-bold text-muted-foreground">
                  <li>Tap <span className="text-foreground">⋮ Menu</span> (top-right corner)</li>
                  <li>Tap <span className="text-foreground">&quot;Add to Home Screen&quot;</span> or <span className="text-foreground">&quot;Install App&quot;</span></li>
                  <li>Confirm by tapping <span className="text-foreground">&quot;Install&quot;</span></li>
                  <li>The app icon will appear on your home screen</li>
                </ol>
              </div>

              {/* iOS */}
              <div className="border-2 border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  <h3 className="font-black uppercase text-sm">iPhone / iPad (Safari)</h3>
                </div>
                <ol className="list-decimal list-inside text-sm space-y-2 font-bold text-muted-foreground">
                  <li>Open this page in <span className="text-foreground">Safari</span> (required)</li>
                  <li>Tap the <span className="text-foreground">Share button</span> (□↑) at the bottom</li>
                  <li>Scroll down and tap <span className="text-foreground">&quot;Add to Home Screen&quot;</span></li>
                  <li>Tap <span className="text-foreground">&quot;Add&quot;</span> in the top-right corner</li>
                </ol>
                <div className="bg-muted p-2 text-[11px] font-bold text-muted-foreground border-2 border-border">
                  ⚠ Note: PWA install is only supported via Safari on iOS. Chrome/Firefox on iOS will not show the option.
                </div>
              </div>

              {/* Extra Tips */}
              <div className="border-2 border-border p-4 bg-muted/30 space-y-2">
                <h3 className="font-black uppercase text-sm">💡 Extras</h3>
                <ul className="text-sm space-y-1 font-bold text-muted-foreground list-disc list-inside">
                  <li>The installed app opens in its own window — no browser tabs</li>
                  <li>You get a dedicated icon on your taskbar / dock / home screen</li>
                  <li>Works offline for cached pages</li>
                  <li>Push notifications supported on Android &amp; Desktop</li>
                  <li>Use <span className="text-foreground">&quot;Update App&quot;</span> from the menu to pull the latest version</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t-4 border-border">
              <button 
                onClick={() => setShowInstallModal(false)} 
                className="brutal-button w-full text-center"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
