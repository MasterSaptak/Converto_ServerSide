'use client'

import { useState } from 'react'
import { GraduationCap, Send, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QuoteProps {
  order: any
}

export function EducationQuote({ order }: QuoteProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [basePrice, setBasePrice] = useState(order.metadata?.base_price || 0)
  const [tax, setTax] = useState(order.metadata?.tax || 0)
  const [serviceFee, setServiceFee] = useState(order.metadata?.service_fee || 0)

  const total = Number(basePrice) + Number(tax) + Number(serviceFee)

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      const newMetadata = {
        ...order.metadata,
        base_price: Number(basePrice),
        tax: Number(tax),
        service_fee: Number(serviceFee),
        total_fee: total
      }

      await supabase
        .from('service_requests')
        .update({ 
          metadata: newMetadata,
          amount: Number(basePrice),
          tax: Number(tax),
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
          description: `Education Payment Verified. Quote sent for $${total.toFixed(2)}`,
          is_internal: false
        })

      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Verify Institution action
  const handleVerify = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase
        .from('service_requests')
        .update({ 
          status_code: 'verifying_institution',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      await supabase
        .from('service_request_timeline')
        .insert({
          request_id: order.id,
          action: 'institution_verified',
          description: `Institution ${order.metadata?.institution_name} has been verified by the compliance team.`,
          is_internal: true
        })

      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!['draft', 'quote_requested', 'verifying_institution', 'quote_sent'].includes(order.status_code)) {
    return null
  }

  return (
    <div className="brutal-card bg-[#E0E7FF] p-6 mb-8 border-4 border-black shadow-[8px_8px_0px_var(--color-foreground)]">
      <div className="flex items-center justify-between mb-6 pb-4 border-b-4 border-black">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-2 border-black">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Verification & Quote</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Education Module</p>
          </div>
        </div>

        {order.status_code === 'quote_requested' && (
          <button 
            onClick={handleVerify}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-500 text-black px-4 py-2 border-2 border-black font-bold text-xs uppercase hover:-translate-y-1 hover:shadow-[4px_4px_0px_black] transition-all"
          >
            Mark as Verified <CheckCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmitQuote} className="space-y-6">
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Tuition/Fee Amount</label>
            <div className="flex">
              <div className="bg-black text-white p-3 border-y-2 border-l-2 border-black font-black">$</div>
              <input 
                type="number"
                step="0.01"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full p-3 border-2 border-black font-bold outline-none"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Taxes</label>
            <div className="flex">
              <div className="bg-black text-white p-3 border-y-2 border-l-2 border-black font-black">$</div>
              <input 
                type="number"
                step="0.01"
                required
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="w-full p-3 border-2 border-black font-bold outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Converto Service Fee</label>
            <div className="flex">
              <div className="bg-black text-white p-3 border-y-2 border-l-2 border-black font-black">$</div>
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

        <div className="pt-4 mt-4 border-t-4 border-black flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block">Customer Total</span>
            <span className="text-3xl font-black font-mono">${total.toFixed(2)}</span>
          </div>

          <button 
            type="submit" 
            disabled={loading || total <= 0}
            className="brutal-button bg-black text-white flex items-center gap-2 py-4 px-8 text-lg disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Send Quote to Customer <Send className="w-5 h-5" /></>
            )}
          </button>
        </div>

      </form>
    </div>
  )
}
