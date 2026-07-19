'use client'

import { useState } from 'react'
import { Plus, Minus, Loader2, X, Gift } from 'lucide-react'
import { manageCPoints } from './actions'
import { useRouter } from 'next/navigation'

export function ManageCPointsModal({ customerId, currentPoints }: { customerId: string, currentPoints: number }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<'add' | 'remove'>('add')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const numAmount = parseInt(amount)
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (type === 'remove' && numAmount > currentPoints) {
      setError('Cannot deduct more points than the user has.')
      return
    }
    
    if (!description.trim()) {
      setError('Please provide a reason')
      return
    }

    setLoading(true)
    try {
      const result = await manageCPoints(customerId, type, numAmount, description)
      
      if (result.success) {
        setIsOpen(false)
        setAmount('')
        setDescription('')
        router.refresh() // Force Next.js to immediately refetch the page data
      } else {
        setError(result.error || 'Failed to update C-Points')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-black bg-black text-white hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all uppercase font-black text-xs tracking-widest shrink-0"
      >
        <Gift className="w-4 h-4" />
        Manage Points
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200 p-6 relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 hover:rotate-90 transition-transform"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-black uppercase tracking-widest mb-6">Manage C-Points</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border-4 border-red-500 text-red-700 text-sm font-bold uppercase tracking-widest">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setType('add')}
                  className={`p-3 border-4 border-black uppercase font-black text-sm flex items-center justify-center gap-2 transition-all ${type === 'add' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  <Plus className="w-5 h-5" /> Add
                </button>
                <button
                  type="button"
                  onClick={() => setType('remove')}
                  className={`p-3 border-4 border-black uppercase font-black text-sm flex items-center justify-center gap-2 transition-all ${type === 'remove' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  <Minus className="w-5 h-5" /> Deduct
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest">Amount</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full p-3 border-4 border-black font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  min="1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest">Reason / Description</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Apology bonus, Refund"
                  className="w-full p-3 border-4 border-black text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full p-4 bg-primary border-4 border-black font-black text-lg uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
