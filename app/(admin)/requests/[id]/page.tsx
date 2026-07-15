import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, Save, ArrowUpRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { ServiceRequest } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { NotificationService } from '@/lib/services/notifications'

const statusStyles: Record<string, string> = {
  'Submitted': 'bg-blue-100 text-blue-800 border-blue-400',
  'Processing': 'bg-yellow-100 text-yellow-800 border-yellow-400',
  'Quote Sent': 'bg-purple-100 text-purple-800 border-purple-400',
  'Completed': 'bg-green-100 text-green-800 border-green-400',
  'Waiting Payment': 'bg-orange-100 text-orange-800 border-orange-400',
  'Cancelled': 'bg-red-100 text-red-800 border-red-400',
  'Rejected': 'bg-red-100 text-red-800 border-red-400',
}

async function updateRequestStatus(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const status = formData.get('status') as string
  
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  // Get current request to check status change and get profile_id
  const { data: currentReq } = await supabase
    .from('service_requests')
    .select('status, profile_id')
    .eq('id', id)
    .single();

  if (currentReq && currentReq.status !== status) {
    await supabase
      .from('service_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    // Dispatch notification
    const notificationService = new NotificationService(supabase);
    await notificationService.notifyRequestUpdate(currentReq.profile_id, id, status);
  }

  revalidatePath(`/requests/${id}`)
  revalidatePath('/requests')
}

export default async function RequestDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  const { data: request } = await supabase
    .from('service_requests')
    .select('*, profile:profiles(*), service:services(*)')
    .eq('id', id)
    .single()

  if (!request) {
    notFound()
  }

  const metadata = request.metadata as Record<string, any> || {}

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/requests" className="brutal-button p-3 bg-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Request Details</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="font-mono text-black/60 font-bold uppercase tracking-widest text-xs">ID: {request.id}</p>
            <span className={`border-2 px-2 py-0.5 font-bold uppercase text-[10px] tracking-widest ${statusStyles[request.status] || 'bg-slate-100'}`}>
              {request.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[2fr_1fr] gap-8">
        
        <div className="space-y-8">
          {/* Main Info */}
          <div className="brutal-card bg-white p-6 md:p-8">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-4 border-black pb-2 flex items-center justify-between">
              <span>Customer Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Name</span>
                <p className="font-black">{request.profile?.full_name || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Email</span>
                <p className="font-bold">{request.profile?.email || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Phone</span>
                <p className="font-bold">{request.profile?.phone || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Country</span>
                <p className="font-bold">{request.profile?.country || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="brutal-card bg-accent p-6 md:p-8">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-4 border-black pb-2 flex items-center justify-between">
              <span>Service Requirements</span>
              <span className="bg-white border-2 border-black px-2 py-1 text-[10px]">{request.service?.name}</span>
            </h3>
            
            <div className="space-y-4">
              {request.amount && (
                <div className="flex flex-col gap-1 border-b-2 border-black/10 pb-4 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Base Amount</span>
                  <p className="font-black text-2xl font-mono">{request.amount.toLocaleString(undefined, {minimumFractionDigits: 2})} {request.currency}</p>
                </div>
              )}

              {Object.entries(metadata).map(([key, value]) => {
                if (value === undefined || value === null || value === '') return null;
                const formattedKey = key.replace(/_/g, ' ');
                const formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

                return (
                  <div key={key} className="flex flex-col gap-1 border-b-2 border-black/10 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{formattedKey}</span>
                    <p className="font-bold font-mono text-sm">{formattedValue}</p>
                  </div>
                );
              })}

              {request.notes && (
                <div className="flex flex-col gap-1 pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Customer Notes</span>
                  <div className="bg-white border-2 border-black p-4 font-bold text-sm">
                    {request.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-8">
          <div className="brutal-card bg-white p-6">
             <h3 className="font-black uppercase tracking-widest text-sm mb-4 border-b-4 border-black pb-2">
              Update Status
            </h3>
            
            <form action={updateRequestStatus} className="space-y-4">
              <input type="hidden" name="id" value={request.id} />
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Current Status</label>
                <select name="status" defaultValue={request.status} className="brutal-input w-full font-bold">
                  <option value="Submitted">Submitted</option>
                  <option value="Processing">Processing</option>
                  <option value="Quote Sent">Quote Sent</option>
                  <option value="Waiting Payment">Waiting Payment</option>
                  <option value="Payment Confirmed">Payment Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <button type="submit" className="brutal-button w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground">
                <Save className="w-4 h-4" /> Save Status
              </button>
            </form>
          </div>

          <div className="brutal-card bg-white p-6">
            <h3 className="font-black uppercase tracking-widest text-sm mb-4 border-b-4 border-black pb-2">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="brutal-button w-full text-left py-3 text-sm flex items-center justify-between group bg-slate-50">
                <span>Generate Quote</span>
                <ArrowUpRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </button>
              <button className="brutal-button w-full text-left py-3 text-sm flex items-center justify-between group bg-slate-50">
                <span>Message Customer</span>
                <ArrowUpRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </button>
            </div>
          </div>

          <div className="brutal-card bg-white p-6">
            <h3 className="font-black uppercase tracking-widest text-sm mb-4 border-b-4 border-black pb-2">
              Metadata
            </h3>
            <div className="space-y-2">
               <div className="flex justify-between items-center text-xs">
                 <span className="font-bold opacity-60">Created</span>
                 <span className="font-mono font-bold">{new Date(request.created_at).toLocaleDateString()}</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                 <span className="font-bold opacity-60">Priority</span>
                 <span className="font-black uppercase text-orange-600">{request.priority}</span>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
