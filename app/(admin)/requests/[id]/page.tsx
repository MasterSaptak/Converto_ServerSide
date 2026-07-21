import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, Save, ArrowUpRight, Activity } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { ServiceRequest } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { NotificationService } from '@/lib/services/notifications'
import { OrderTimeline } from './components/timeline'
import { OrderDocuments } from './components/documents'
import { OrderAssignments } from './components/assignments'
import { RequestTasks } from './components/request-tasks'
import { RequestFlags } from './components/request-flags'
import { RequestWorkflowHistory } from './components/request-history'
import { OrderPayments } from '@/components/admin/orders/payments'
import { BuyForMeQuote } from '@/components/admin/orders/buy-for-me-quote'
import { TicketQuote } from '@/components/admin/orders/ticket-quote'
import { EducationQuote } from '@/components/admin/orders/education-quote'
import { GlobalPaymentsQuote } from '@/components/admin/orders/global-payments-quote'
import { ExchangeQuote } from '@/components/admin/orders/exchange-quote'
import { evaluateWorkflowEvents, evaluateWorkflowRules } from '@/lib/workflow-engine'

// Deprecated: legacy status styles
// const statusStyles: Record<string, string> = { ... }

async function updateRequestStatus(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const status_id = formData.get('status_id') as string
  const stage_id = formData.get('stage_id_' + status_id) as string // We'll pass this via a hidden input or parse it
  
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

  const { data: currentReq } = await supabase
    .from('service_requests')
    .select('pipeline_status_id, profile_id, pipeline_stage_id')
    .eq('id', id)
    .single();

  if (currentReq && currentReq.pipeline_status_id !== status_id) {
    // 1. Get the new status details
    const { data: newStatus } = await supabase.from('pipeline_statuses').select('*, stage:pipeline_stages(*)').eq('id', status_id).single();

    // 2. Update the Request
    await supabase
      .from('service_requests')
      .update({ 
        pipeline_status_id: status_id, 
        pipeline_stage_id: newStatus.stage_id,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
    
    // 3. Log History
    await supabase.from('request_workflow_history').insert({
      request_id: id,
      new_stage: newStatus.stage.name,
      new_status: newStatus.name,
      remarks: 'Status updated via Action Panel'
    });
    
    // 4. Automation Engine
    // Execute events tied to the new status
    await evaluateWorkflowEvents(supabase, id, status_id);
    
    // Evaluate rules that might auto-transition from this status
    await evaluateWorkflowRules(supabase, id, status_id);
  }

  revalidatePath(`/requests/${id}`)
  revalidatePath('/requests')
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
    .select(`
      *, 
      profile:profiles!service_requests_profile_id_fkey(*), 
      service:services(*),
      stage:pipeline_stages(*),
      status_obj:pipeline_statuses(*)
    `)
    .eq('id', id)
    .single()

  // Fetch all stages and statuses for the selector
  const { data: stages } = await supabase.from('pipeline_stages').select('*').order('display_order');
  const { data: statuses } = await supabase.from('pipeline_statuses').select('*').order('display_order');

  if (!order) {
    notFound()
  }

  const metadata = order.metadata as Record<string, any> || {}

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/requests" className="brutal-button p-3 bg-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Request Details</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-black/60 font-bold uppercase tracking-widest text-[10px]">ID: {order.id}</span>
            <span className="flex items-center gap-2 border-2 px-2 py-0.5 font-black uppercase text-[10px] tracking-widest bg-white">
              <Activity className="w-3 h-3" />
              {order.stage?.name || 'Unknown Stage'}
              <span className="text-black/30">/</span>
              <span style={{ color: order.status_obj?.color || 'inherit' }}>{order.status_obj?.name || 'Unknown Status'}</span>
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
          {order.service?.code === 'exchange' && (
            <ExchangeQuote order={order} />
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
                <select name="status_id" defaultValue={order.pipeline_status_id || ''} className="brutal-input w-full font-bold bg-white">
                  {stages?.map(stage => (
                    <optgroup key={stage.id} label={stage.name}>
                      {statuses?.filter(s => s.stage_id === stage.id).map(status => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <button type="submit" className="brutal-button w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground">
                <Save className="w-4 h-4" /> Save Status
              </button>
            </form>
          </div>

          <RequestFlags requestId={order.id} />
          <RequestTasks requestId={order.id} />
          <OrderAssignments orderId={order.id} />
          <OrderDocuments orderId={order.id} />
          <RequestWorkflowHistory requestId={order.id} />
          <OrderTimeline orderId={order.id} />

        </div>

      </div>
    </div>
  )
}
