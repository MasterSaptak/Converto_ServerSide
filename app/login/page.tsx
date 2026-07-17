"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Verify if user is staff
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_staff')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile?.is_staff) {
        // Sign them out immediately if they are not staff
        await supabase.auth.signOut()
        throw new Error('Access denied. Admin privileges required.')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md">
        
        <div className="mb-10 text-center">
          <div className="inline-flex w-16 h-16 border-2 border-foreground bg-primary items-center justify-center mb-6 shadow-[4px_4px_0px_var(--color-foreground)]">
            <ShieldAlert className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Converto</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2">Admin Portal Access</p>
        </div>

        <form onSubmit={handleLogin} className="brutal-card bg-card p-6 md:p-8 space-y-6 relative overflow-hidden">
          
          {error && (
            <div className="bg-destructive/10 border-2 border-destructive p-3 text-destructive text-sm font-bold animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="brutal-input w-full bg-background"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="brutal-input w-full bg-background"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-foreground text-background font-black uppercase tracking-widest py-4 border-2 border-transparent hover:border-foreground hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2 relative z-10 disabled:opacity-50 shadow-[4px_4px_0px_var(--color-primary)] hover:shadow-none translate-x-[-2px] translate-y-[-2px] hover:translate-x-0 hover:translate-y-0"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Authenticate <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
          
        </form>
      </div>
    </div>
  )
}
