'use client'

import { useState } from 'react'
import { Calculator, ArrowRight, Loader2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QuoteProps {
  order: any
}

export function BuyForMeQuote({ order }: QuoteProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [basePrice, setBasePrice] = useState(order.metadata?.base_price || 0)
  const [shippingFee, setShippingFee] = useState(order.metadata?.shipping_fee || 0)
  const [serviceFee, setServiceFee] = useState(order.metadata?.service_fee || 0)
  const [tax, setTax] = useState(order.metadata?.tax || 0)
  const [discount, setDiscount] = useState(order.metadata?.discount || 0)

  const total = Number(basePrice) + Number(shippingFee) + Number(serviceFee) + Number(tax) - Number(discount)

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      const newMetadata = {
        ...order.metadata,
        base_price: Number(basePrice),
        shipping_fee: Number(shippingFee),
        service_fee: Number(serviceFee),
        tax: Number(tax),
        discount: Number(discount),
        total_fee: total
      }

      await supabase
        .from('service_requests')
        .update({ 
          metadata: newMetadata,
          amount: Number(basePrice),
          service_fee: Number(shippingFee) + Number(serviceFee),
          tax: Number(tax),
          discount: Number(discount),
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
          description: `Quote generated and sent for $${total.toFixed(2)}`,
          is_internal: false
        })

      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Only show this form if the order is still in the quoting phase (e.g. quote_requested or draft)
  if (!['draft', 'quote_requested', 'quote_sent'].includes(order.status_code)) {
    return null
  }

  return (
    <div className="brutal-card bg-[#E0F2FE] p-6 mb-8 border-4 border-black shadow-[8px_8px_0px_var(--color-foreground)]">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b-4 border-black">
        <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-2 border-black">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter">Quote Generator</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Buy For Me Module</p>
        </div>
      </div>

      <form onSubmit={handleSubmitQuote} className="space-y-6">
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Product Base Price</label>
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
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Shipping & Customs</label>
            <div className="flex">
              <div className="bg-black text-white p-3 border-y-2 border-l-2 border-black font-black">$</div>
              <input 
                type="number"
                step="0.01"
                required
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                className="w-full p-3 border-2 border-black font-bold outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Service Fee</label>
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

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Tax</label>
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
            <label className="text-[10px] font-black uppercase tracking-widest text-green-700">Discount</label>
            <div className="flex">
              <div className="bg-green-700 text-white p-3 border-y-2 border-l-2 border-black font-black">-$</div>
              <input 
                type="number"
                step="0.01"
                required
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full p-3 border-2 border-black font-bold outline-none text-green-700"
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
