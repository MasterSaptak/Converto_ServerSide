import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="brutal-card bg-white p-12 max-w-lg w-full text-center space-y-6">
        <div className="inline-flex p-4 bg-red-100 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <ShieldAlert className="w-12 h-12 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Access Denied</h1>
          <p className="font-bold text-black/60">You do not have staff permissions to access the Converto Operations Platform.</p>
        </div>

        <div className="pt-4">
          <Link href="/login" className="brutal-button inline-block">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

