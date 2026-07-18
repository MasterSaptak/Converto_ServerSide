import Link from 'next/link'
import { ArrowRight, LayoutDashboard, Database } from 'lucide-react'

export default function LandingPage() {
  const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  return (
    <div className="min-h-screen bg-accent flex items-center justify-center p-6">
      <div className="brutal-card bg-white p-12 max-w-2xl w-full space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">Converto Admin</h1>
          <p className="text-xl font-bold uppercase tracking-widest text-black/60">Enterprise Operations Dashboard</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="bg-red-50 border-4 border-black p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-red-600" />
              <h3 className="text-xl font-black uppercase">Configuration Required</h3>
            </div>
            <p className="font-bold text-sm">
              Please provide your <code className="bg-red-100 px-1 border border-black">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-red-100 px-1 border border-black">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in the AI Studio Secrets panel.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/dashboard" className="brutal-button flex items-center justify-between group">
             <div className="flex items-center gap-3">
                <LayoutDashboard className="w-6 h-6" />
                <span className="text-xl uppercase">Dashboard</span>
             </div>
             <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>

          <Link href="/login" className="brutal-button bg-white text-black flex items-center justify-between group">
             <span className="text-xl uppercase">Staff Login</span>
             <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>

        <div className="pt-8 border-t-4 border-black">
          <p className="text-xs font-bold text-black/40 uppercase tracking-widest leading-relaxed">
            This is the operational management interface for the CONVERTO application.
            Authorized staff only. Unauthorized access is strictly prohibited and logged.
          </p>
        </div>
      </div>
    </div>
  )
}
