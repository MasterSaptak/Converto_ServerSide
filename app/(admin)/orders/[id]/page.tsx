import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, Save, ArrowUpRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { ServiceRequest } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { NotificationService } from '@/lib/services/notifications'
import { OrderTimeline } from './components/timeline'
import { OrderDocuments } from './components/documents'
import { OrderAssignments } from './components/assignments'
import { OrderPayments } from '@/components/admin/orders/payments'
import { BuyForMeQuote } from '@/components/admin/orders/buy-for-me-quote'
import { TicketQuote } from '@/components/admin/orders/ticket-quote'
import { EducationQuote } from '@/components/admin/orders/education-quote'
import { GlobalPaymentsQuote } from '@/components/admin/orders/global-payments-quote'

const statusStyles: Record<string, string> = {
  'Draft': 'bg-slate-100 text-slate-800 border-slate-400',
  'Submitted': 'bg-blue-100 text-blue-800 border-blue-400',
  'Verifying': 'bg-indigo-100 text-indigo-800 border-indigo-400',
  'Processing': 'bg-yellow-100 text-yellow-800 border-yellow-400',
  'Quote Sent': 'bg-purple-100 text-purple-800 border-purple-400',
  'Awaiting Payment': 'bg-orange-100 text-orange-800 border-orange-400',
  'Payment Confirmed': 'bg-teal-100 text-teal-800 border-teal-400',
  'Completed': 'bg-green-100 text-green-800 border-green-400',
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
    
    // Log timeline event
    await supabase.from('order_events').insert({
      order_id: id,
      event_type: 'status_changed',
      remarks: `Status changed from ${currentReq.status} to ${status}`
    });
    
    // Dispatch notification
    const notificationService = new NotificationService(supabase);
    await notificationService.notifyRequestUpdate(currentReq.profile_id, id, status);
  }

  revalidatePath(`/orders/${id}`)
  revalidatePath('/orders')
}

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: order } = await supabase
    .from('service_requests')
    .select('*, profile:profiles(*), service:services(*)')
    .eq('id', id)
    .single()

  if (!order) {
    notFound()
  }

  const metadata = order.metadata as Record<string, any> || {}

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/orders" className="brutal-button p-3 bg-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Order Details</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-black/60 font-bold uppercase tracking-widest text-[10px]">ID: {order.id}</span>
            <span className={`border-2 px-2 py-0.5 font-black uppercase text-[10px] tracking-widest ${statusStyles[order.status] || 'bg-slate-100'}`}>
              {order.status}
            </span>
            <span className="border-2 px-2 py-0.5 font-black uppercase text-[10px] tracking-widest bg-accent">
              {order.service?.name}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
        
        <div className="space-y-8">
          
          {/* Conditional Quote Generator */}
          {order.service?.code === 'buy_for_me' && (
            <BuyForMeQuote order={order} />
          )}
          {order.service?.code === 'ticket_booking' && (
            <TicketQuote order={order} />
          )}
          {order.service?.code === 'education' && (
            <EducationQuote order={order} />
          )}
          {order.service?.code === 'global_payments' && (
            <GlobalPaymentsQuote order={order} />
          )}

          {/* Main Info */}
          <div className="brutal-card bg-white p-6 md:p-8">
             <div className="flex items-center justify-between mb-6 border-b-4 border-black pb-2">
                <h3 className="font-black uppercase tracking-widest text-sm flex items-center">
                  Customer Profile
                </h3>
                <Link href={`/customers/${order.profile_id}`} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
                  View Full Profile <ArrowUpRight className="w-3 h-3" />
                </Link>
             </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Name</span>
                <p className="font-black">{order.profile?.full_name || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Email</span>
                <p className="font-bold">{order.profile?.email || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Phone</span>
                <p className="font-bold">{order.profile?.phone || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Country</span>
                <p className="font-bold">{order.profile?.country || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="brutal-card bg-accent p-6 md:p-8">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-4 border-black pb-2 flex items-center justify-between">
              <span>Order Specifics (Metadata)</span>
            </h3>
            
            <div className="space-y-4">
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

              {order.notes && (
                <div className="flex flex-col gap-1 pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Customer Notes</span>
                  <div className="bg-white border-2 border-black p-4 font-bold text-sm">
                    {order.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="brutal-card bg-white p-6 md:p-8">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-4 border-black pb-2 flex items-center justify-between">
              <span>Financial Breakdown</span>
            </h3>
            
            <div className="space-y-3 font-mono">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold opacity-60">Base Amount</span>
                <span>{order.amount ? order.amount.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'} {order.currency}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold opacity-60">Service Fee</span>
                <span>{order.service_fee ? order.service_fee.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'} {order.currency}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold opacity-60">Exchange Fee</span>
                <span>{order.exchange_fee ? order.exchange_fee.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'} {order.currency}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold opacity-60">Tax</span>
                <span>{order.tax ? order.tax.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'} {order.currency}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-green-600">
                <span className="font-bold opacity-60">Discount</span>
                <span>-{order.discount ? order.discount.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'} {order.currency}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-black pt-4 border-t-4 border-black">
                <span>Total</span>
                <span>{order.total ? order.total.toLocaleString(undefined, {minimumFractionDigits: 2}) : (order.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {order.currency}</span>
              </div>
            </div>
          </div>

          {/* Payments Section */}
          <OrderPayments order={order} />
          
        </div>

        {/* Sidebar Components */}
        <div className="space-y-8">
          <div className="brutal-card bg-white p-6">
             <h3 className="font-black uppercase tracking-widest text-sm mb-4 border-b-4 border-black pb-2">
              Action Panel
            </h3>
            
            <form action={updateRequestStatus} className="space-y-4">
              <input type="hidden" name="id" value={order.id} />
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Transition Status</label>
                <select name="status" defaultValue={order.status} className="brutal-input w-full font-bold">
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Verifying">Verifying</option>
                  <option value="Processing">Processing</option>
                  <option value="Quote Sent">Quote Sent</option>
                  <option value="Awaiting Payment">Awaiting Payment</option>
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

          <OrderAssignments orderId={order.id} />
          
          <OrderDocuments orderId={order.id} />
          
          <OrderTimeline orderId={order.id} />

        </div>

      </div>
    </div>
  )
}
