'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    if (!supabase) {
      setError('Supabase is not configured. Please check environment variables.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Check if user is staff
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_staff')
        .eq('id', user.id)
        .single()

      if (!profile?.is_staff) {
        await supabase.auth.signOut()
        setError('Access denied. This portal is for authorized staff only.')
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-3 bg-accent" />
      <div className="absolute bottom-0 left-0 w-full h-3 bg-accent" />
      <div className="absolute top-0 left-0 w-3 h-full bg-accent" />
      <div className="absolute top-0 right-0 w-3 h-full bg-accent" />

      <div className="w-full max-w-[460px] relative">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="h-8 w-8 border-3 border-foreground bg-accent shadow-[3px_3px_0px_var(--color-foreground)]" />
          <span className="text-2xl font-black uppercase tracking-widest">Converto</span>
        </div>

        <div className="border-3 border-foreground bg-card shadow-[8px_8px_0px_var(--color-foreground)]">
          {/* Header */}
          <div className="bg-accent border-b-3 border-foreground p-6 md:p-8">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-6 h-6" />
              <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Operations Platform</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-[0.9]">
              Staff Login
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-50 mt-2">Authorized Personnel Only</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-6 md:p-8 flex flex-col gap-5">
            {error && (
              <div className="border-3 border-red-600 bg-red-50 p-4 text-xs font-black uppercase tracking-wider text-red-600">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className="text-[10px] uppercase font-black tracking-[0.2em]">
                Staff Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@converto.com"
                className="brutal-input w-full px-4 py-3 text-sm font-bold placeholder:opacity-30 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="login-password" className="text-[10px] uppercase font-black tracking-[0.2em]">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="brutal-input w-full px-4 py-3 pr-12 text-sm font-bold placeholder:opacity-30 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-40 hover:opacity-100 transition-opacity"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="brutal-button w-full py-4 text-sm flex items-center justify-center gap-3 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t-3 border-dashed border-foreground/20 p-6 text-center">
            <span className="text-[10px] uppercase font-black tracking-widest opacity-30">
              © Converto Operations 2024 // Encrypted & Secure
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
