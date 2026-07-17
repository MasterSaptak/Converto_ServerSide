'use client'

import { CreditCard, Receipt, Clock, CheckCircle } from 'lucide-react'

interface OrderPaymentsProps {
  order: any
}

export function OrderPayments({ order }: OrderPaymentsProps) {
  // Normally we would query a 'payments' table, but for MVP we infer from status and metadata
  
  const totalFee = order.metadata?.total_fee || 100
  const isPaid = ['processing', 'completed'].includes(order.status_code)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black uppercase tracking-tighter">Payments & Invoices</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Payment Summary */}
        <div className="brutal-card bg-white p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black/10">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-2 border-black">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black uppercase tracking-widest text-sm">Invoice #INV-{order.id.split('-')[0].toUpperCase()}</h4>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                Created: {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-xs font-bold uppercase opacity-70">Service Fee</span>
              <span className="font-mono font-black">${totalFee.toFixed(2)}</span>
            </div>
            
            <div className="pt-4 border-t-2 border-black/10 mt-4 flex justify-between items-center">
              <span className="font-black uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black font-mono text-primary">${totalFee.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="brutal-card bg-white p-6 flex flex-col justify-center">
          <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-4 text-center">Payment Status</h4>
          
          {isPaid ? (
            <div className="text-center space-y-2">
              <div className="inline-flex w-16 h-16 bg-[#00FF66] border-2 border-black items-center justify-center shadow-[4px_4px_0px_var(--color-foreground)] mb-2">
                <CheckCircle className="w-8 h-8 text-black" />
              </div>
              <h3 className="font-black text-xl uppercase text-[#00AA44]">Paid</h3>
              <p className="text-xs font-bold uppercase opacity-60">Payment successfully processed</p>
            </div>
          ) : order.status_code === 'awaiting_payment' ? (
            <div className="text-center space-y-2">
              <div className="inline-flex w-16 h-16 bg-yellow-400 border-2 border-black items-center justify-center shadow-[4px_4px_0px_var(--color-foreground)] mb-2 animate-pulse">
                <Clock className="w-8 h-8 text-black" />
              </div>
              <h3 className="font-black text-xl uppercase text-yellow-600">Awaiting</h3>
              <p className="text-xs font-bold uppercase opacity-60">Waiting for customer checkout</p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="inline-flex w-16 h-16 bg-slate-200 border-2 border-black items-center justify-center mb-2">
                <CreditCard className="w-8 h-8 text-black/50" />
              </div>
              <h3 className="font-black text-xl uppercase opacity-50">Pending Invoice</h3>
              <p className="text-xs font-bold uppercase opacity-60">Order must reach Awaiting Payment</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
