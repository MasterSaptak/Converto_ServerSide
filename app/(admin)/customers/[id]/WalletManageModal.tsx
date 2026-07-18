'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PlusCircle, MinusCircle, X } from 'lucide-react'
import { manageWalletBalance } from './actions'
import { useRouter } from 'next/navigation'

export function WalletManageModal({ account }: { account: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit')
  const router = useRouter()

  useEffect(() => setMounted(true), [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get('amount'))
    const description = formData.get('description') as string

    if (!amount || amount <= 0) {
      alert('Please enter a valid amount')
      setIsLoading(false)
      return
    }
    
    try {
      const res = await manageWalletBalance(account.id, amount, transactionType, description)
      if (res.success) {
        setIsOpen(false)
        router.refresh()
      } else {
        alert('Transaction failed: ' + res.error)
      }
    } catch (err: any) {
      alert('Error processing transaction: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-1 border-2 border-black hover:bg-black hover:text-white transition-colors flex items-center justify-center bg-white"
        title="Manage Balance"
      >
        <PlusCircle className="w-4 h-4" />
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-4 border-black w-full max-w-md brutal-card p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4">
              <h2 className="text-xl font-black uppercase tracking-tight">Manage Balance</h2>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-accent border-2 border-black">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">Current Balance ({account.currency_code})</p>
              <p className="text-3xl font-black font-mono">{(account.available_balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTransactionType('credit')}
                  className={`brutal-button p-3 border-2 border-black flex items-center justify-center gap-2 font-black uppercase text-xs transition-colors ${transactionType === 'credit' ? 'bg-black text-white' : 'bg-white text-black'}`}
                >
                  <PlusCircle className="w-4 h-4" /> Add Funds
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('debit')}
                  className={`brutal-button p-3 border-2 border-black flex items-center justify-center gap-2 font-black uppercase text-xs transition-colors ${transactionType === 'debit' ? 'bg-black text-white' : 'bg-white text-black'}`}
                >
                  <MinusCircle className="w-4 h-4" /> Deduct
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black font-mono">{account.currency_code}</span>
                  <input 
                    name="amount" 
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="brutal-input w-full p-3 pl-16 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20 font-mono text-lg" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Description / Reason</label>
                <input 
                  name="description" 
                  required
                  className="brutal-input w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20" 
                  placeholder="e.g. Deposit for order #123" 
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="w-full brutal-button p-4 bg-white text-black border-2 border-black uppercase font-black"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full brutal-button p-4 bg-black text-white border-2 border-black uppercase font-black disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
