'use client'

import { useState } from 'react'
import { ArrowRightLeft, Send, Loader2, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QuoteProps {
  order: any
}

export function ExchangeQuote({ order }: QuoteProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [baseAmount, setBaseAmount] = useState(order.metadata?.amount || order.amount || 0)
  const [exchangeRate, setExchangeRate] = useState(order.metadata?.exchange_rate || 0)
  const [serviceFee, setServiceFee] = useState(order.metadata?.service_fee || 0)

  // For Exchange, the customer pays the Base Amount + Service Fee in their FROM Currency
  // And receives Base Amount * Exchange Rate in their TO Currency.
  // The system's total value will represent what they pay.
  const total = Number(baseAmount) + Number(serviceFee)

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      const newMetadata = {
        ...order.metadata,
        base_amount: Number(baseAmount),
        exchange_rate: Number(exchangeRate),
        service_fee: Number(serviceFee),
        total_fee: total
      }

      await supabase
        .from('service_requests')
        .update({ 
          metadata: newMetadata,
          amount: Number(baseAmount),
          service_fee: Number(serviceFee),
          total: total,
          status_code: 'quote_sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      // Add timeline event
      await supabase
        .from('service_request_timeline')
        .insert({
          request_id: order.id,
          action: 'quote_sent',
          description: `Exchange Quote sent. Customer pays ${total.toFixed(2)} ${order.metadata?.from_currency || ''}, receives ${(baseAmount * exchangeRate).toFixed(2)} ${order.metadata?.to_currency || ''}`,
          is_internal: false
        })

      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!['draft', 'quote_requested', 'quote_sent'].includes(order.status_code)) {
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
            <h3 className="text-xl font-black uppercase tracking-tighter">Exchange Rate Quote</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Currency Exchange Module</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitQuote} className="space-y-6">
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Amount to Convert ({order.metadata?.from_currency || 'From'})</label>
            <div className="flex">
              <div className="bg-black text-white p-3 border-y-2 border-l-2 border-black font-black"><DollarSign className="w-4 h-4"/></div>
              <input 
                type="number"
                step="0.01"
                required
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                className="w-full p-3 border-2 border-black font-bold outline-none"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Applied Exchange Rate</label>
            <div className="flex">
              <div className="bg-black text-white p-3 border-y-2 border-l-2 border-black font-black">X</div>
              <input 
                type="number"
                step="0.0001"
                required
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="w-full p-3 border-2 border-black font-bold outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Converto Service Fee</label>
            <div className="flex">
              <div className="bg-black text-white p-3 border-y-2 border-l-2 border-black font-black">+</div>
              <input 
                type="number"
                step="0.01"
                required
                value={serviceFee}
                onChange={(e) => setServiceFee(e.target.value)}
                className="w-full p-3 border-2 border-black font-bold outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t-4 border-black flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-auto flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block">Customer Pays ({order.metadata?.from_currency})</span>
            <span className="text-3xl font-black font-mono">{total.toFixed(2)}</span>
          </div>
          
          <ArrowRightLeft className="w-6 h-6 hidden md:block opacity-30" />

          <div className="w-full md:w-auto flex flex-col md:text-right">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block">Customer Receives ({order.metadata?.to_currency})</span>
            <span className="text-3xl font-black font-mono text-emerald-700">{(baseAmount * exchangeRate).toFixed(2)}</span>
          </div>

          <button 
            type="submit" 
            disabled={loading || total <= 0 || exchangeRate <= 0}
            className="brutal-button bg-black text-white flex items-center gap-2 py-4 px-8 text-lg disabled:opacity-50 w-full md:w-auto justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Send Quote <Send className="w-5 h-5" /></>
            )}
          </button>
        </div>

      </form>
    </div>
  )
}
