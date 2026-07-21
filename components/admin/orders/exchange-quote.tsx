'use client'

import { useState } from 'react'
import { ArrowRightLeft, Send, Loader2, Globe, Shield, Lock, Gavel, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QuoteProps {
  order: any
}

export function ExchangeQuote({ order }: QuoteProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const meta = order.metadata || {}

  // Read from the immutable snapshot stored in the order
  const sendAmount = meta.send_amount ?? meta.amount ?? order.amount ?? 0
  const customRate = meta.custom_rate_snapshot ?? meta.exchange_rate ?? 0
  const marketRate = meta.market_rate_snapshot ?? 0
  const totalFee = meta.total_fee_snapshot ?? meta.service_fee ?? 0
  const feeFlat = meta.fee_flat_snapshot ?? 0
  const feePercentage = meta.fee_percentage_snapshot ?? 0
  const recipientReceives = meta.recipient_receives ?? (sendAmount * customRate)
  const totalPaid = meta.total_paid ?? (Number(sendAmount) + Number(totalFee))
  const payoutMethod = meta.payout_method || 'bank_transfer'
  const fromCurrency = meta.from_currency || order.currency || ''
  const toCurrency = meta.to_currency || ''

  // Rate Request Information
  const isNegotiating = meta.is_negotiating === true
  const requestedRate = meta.requested_rate
  const requestNote = meta.request_note
  const notifyMe = meta.notify_me
  const effectiveRate = meta.effective_rate ?? customRate

  const diffAbs = isNegotiating ? requestedRate - customRate : 0
  const diffPct = isNegotiating ? (diffAbs / customRate) * 100 : 0
  const diffPrefix = diffAbs > 0 ? '+' : ''

  const PAYOUT_LABELS: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    cash_pickup: 'Cash Pickup',
    mobile_wallet: 'Mobile Wallet',
    upi: 'UPI',
    bkash_nagad_rocket: 'Bkash / Nagad / Rocket',
    paypal_wise_taptap: 'Paypal / Wise / TapTap',
    binance: 'Binance',
  }

  const handleConfirmQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // The snapshot is already frozen — just advance the status
      await supabase
        .from('service_requests')
        .update({
          status_code: 'quote_sent',
          service_fee: Number(totalFee),
          total: Number(totalPaid),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      // Add timeline event
      await supabase
        .from('service_request_timeline')
        .insert({
          request_id: order.id,
          action: 'quote_confirmed',
          description: `Exchange confirmed. Customer pays ${Number(totalPaid).toFixed(2)} ${fromCurrency}, receives ${Number(recipientReceives).toFixed(2)} ${toCurrency} via ${PAYOUT_LABELS[payoutMethod] || payoutMethod}`,
          is_internal: false
        })

      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!['draft', 'quote_requested', 'quote_sent', 'Submitted'].includes(order.status_code || order.status)) {
    return null
  }

  return (
    <div className="brutal-card bg-[#FFF3B0] p-6 mb-8 border-4 border-black shadow-[8px_8px_0px_var(--color-foreground)]">
      <div className="flex items-center justify-between mb-6 pb-4 border-b-4 border-black">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-2 border-black">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Exchange Order Snapshot</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Rates locked at order time</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-60">
          <Lock className="w-3 h-3" /> Immutable
        </div>
      </div>

      {isNegotiating && (
        <div className="mb-6 bg-indigo-100 border-2 border-indigo-500 p-4 shadow-[4px_4px_0px_#6366f1]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-indigo-800 font-black uppercase tracking-widest text-sm">
              <MessageSquare className="w-5 h-5" /> Customer Rate Request
            </div>
            {notifyMe && (
              <div className="bg-white text-indigo-700 px-2 py-1 text-[10px] font-bold uppercase border border-indigo-200">
                🔔 Requested Notification
              </div>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60 text-indigo-900 mb-1">Requested Rate</div>
              <div className="text-xl font-black font-mono text-indigo-900 bg-white inline-block px-2 py-1 border-2 border-indigo-300">
                {Number(requestedRate).toFixed(4)}
              </div>
              <div className="text-xs font-bold text-indigo-700 mt-2 flex gap-3">
                <span>Diff: <span className="font-mono bg-white px-1">{diffPrefix}{diffAbs.toFixed(4)}</span></span>
                <span>Increase: <span className="font-mono bg-white px-1">{diffPrefix}{diffPct.toFixed(2)}%</span></span>
              </div>
            </div>

            {requestNote && (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 text-indigo-900">Message / Note</div>
                  <div className="text-sm font-bold text-indigo-800 bg-white/50 p-2 border border-indigo-200">
                    {requestNote}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Snapshot Display (Read-only) */}
      <div className="space-y-4 mb-6">

        {/* Corridor Info */}
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="bg-black text-white px-2 py-1 text-xs font-black uppercase">{fromCurrency}</span>
          <ArrowRightLeft className="w-4 h-4 opacity-40" />
          <span className="bg-black text-white px-2 py-1 text-xs font-black uppercase">{toCurrency}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-2">
            {PAYOUT_LABELS[payoutMethod] || payoutMethod}
          </span>
        </div>

        {/* Rate Comparison */}
        <div className={`grid ${isNegotiating ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
          <div className="bg-white/50 border-2 border-black/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 flex items-center gap-1 mb-1">
              <Globe className="w-3 h-3" /> Market Rate (Snapshot)
            </div>
            <div className="font-mono font-black text-lg opacity-50 line-through">
              {Number(marketRate).toFixed(4)}
            </div>
          </div>
          <div className="bg-white/50 border-2 border-black/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 flex items-center gap-1 mb-1">
              <Shield className="w-3 h-3" /> Converto Rate (Snapshot)
            </div>
            <div className={`font-mono font-black text-lg text-emerald-700`}>
              {Number(customRate).toFixed(4)}
            </div>
          </div>
          {isNegotiating && (
            <div className="bg-indigo-50 border-2 border-indigo-200 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-1 mb-1">
                <MessageSquare className="w-3 h-3" /> Requested Rate
              </div>
              <div className="font-mono font-black text-lg text-indigo-900">
                {Number(requestedRate).toFixed(4)}
              </div>
            </div>
          )}
        </div>

        {/* Fee Info */}
        <div className="bg-white/50 border-2 border-black/10 p-3 grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">Flat Fee</div>
            <div className="font-mono font-bold">{Number(feeFlat).toFixed(2)} {fromCurrency}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">% Fee</div>
            <div className="font-mono font-bold">{Number(feePercentage).toFixed(2)} {fromCurrency}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">Total Fee</div>
            <div className="font-mono font-black">{Number(totalFee).toFixed(2)} {fromCurrency}</div>
          </div>
        </div>
      </div>

      {/* Summary Row */}
      {/* Summary Row */}
      <form onSubmit={handleConfirmQuote}>
        {isNegotiating && (
          <div className="mb-6 p-4 bg-gray-50 border-2 border-gray-200">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-3">Quick Actions for Request</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="px-3 py-2 bg-emerald-100 text-emerald-800 border-2 border-emerald-400 font-bold text-xs hover:bg-emerald-200">
                Accept Official ({Number(customRate).toFixed(4)})
              </button>
              <button type="button" className="px-3 py-2 bg-indigo-100 text-indigo-800 border-2 border-indigo-400 font-bold text-xs hover:bg-indigo-200">
                Match Requested ({Number(requestedRate).toFixed(4)})
              </button>
              <button type="button" className="px-3 py-2 bg-white text-gray-800 border-2 border-gray-300 font-bold text-xs hover:bg-gray-100">
                Counter +0.20
              </button>
              <button type="button" className="px-3 py-2 bg-white text-gray-800 border-2 border-gray-300 font-bold text-xs hover:bg-gray-100">
                Counter +0.30
              </button>
            </div>
            <p className="text-[10px] mt-2 text-gray-500 font-bold italic">Note: These buttons are UI mocks for the negotiation workflow. Full rate mutation requires further backend support to recalculate the totals.</p>
          </div>
        )}

        <div className="pt-4 mt-4 border-t-4 border-black flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-auto flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block">Customer Pays ({fromCurrency})</span>
            <span className="text-3xl font-black font-mono">{Number(totalPaid).toFixed(2)}</span>
          </div>
          
          <ArrowRightLeft className="w-6 h-6 hidden md:block opacity-30" />

          <div className="w-full md:w-auto flex flex-col md:text-right">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block">Customer Receives ({toCurrency})</span>
            <span className="text-3xl font-black font-mono text-emerald-700">{Number(recipientReceives).toFixed(2)}</span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="brutal-button bg-black text-white flex items-center gap-2 py-4 px-8 text-lg disabled:opacity-50 w-full md:w-auto justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Confirm Official Quote <Send className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
