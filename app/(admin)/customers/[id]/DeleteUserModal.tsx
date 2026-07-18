'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import { deleteCustomerCompletely } from './actions'
import { useRouter } from 'next/navigation'

export function DeleteUserModal({ customerId, customerName }: { customerId: string, customerName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: first confirm, 2: second confirm
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => setMounted(true), [])

  async function handleDelete() {
    setIsLoading(true)
    try {
      const res = await deleteCustomerCompletely(customerId)
      if (res.success) {
        setIsOpen(false)
        router.push('/customers')
      } else {
        alert('Failed to delete user: ' + res.error)
      }
    } catch (err: any) {
      alert('Error deleting user: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => { setIsOpen(true); setStep(1); }}
        className="brutal-button p-2 bg-red-500 text-white text-xs flex items-center gap-2 border-2 border-black hover:bg-red-600 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        DELETE USER
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white border-4 border-black w-full max-w-md brutal-card p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4">
               <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                  Danger Zone
               </h2>
               <button 
                 onClick={() => setIsOpen(false)}
                 className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            {step === 1 ? (
              <div className="space-y-6">
                 <p className="font-bold text-lg leading-tight uppercase">
                    You are about to delete <span className="text-red-600 font-black">{customerName}</span> from everything.
                 </p>
                 <p className="text-sm font-bold opacity-70">
                    This action will remove their profile, wallets, transaction history, orders, and documents permanently.
                 </p>
                 <button
                    onClick={() => setStep(2)}
                    className="w-full brutal-button p-4 bg-black text-white border-2 border-black uppercase font-black hover:bg-red-600 transition-colors"
                 >
                    Yes, I want to delete
                 </button>
              </div>
            ) : (
              <div className="space-y-6">
                 <p className="font-black text-xl leading-tight uppercase text-red-600 animate-pulse">
                    Are you absolutely sure?
                 </p>
                 <p className="text-sm font-bold opacity-70">
                    There is no going back. All data for <span className="text-red-600 font-black">{customerName}</span> will be wiped completely from the database.
                 </p>
                 <div className="flex gap-4">
                   <button
                      onClick={() => setIsOpen(false)}
                      className="w-full brutal-button p-4 bg-white text-black border-2 border-black uppercase font-black"
                   >
                      Cancel
                   </button>
                   <button
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="w-full brutal-button p-4 bg-red-600 text-white border-2 border-black uppercase font-black disabled:opacity-50 hover:bg-red-700"
                   >
                      {isLoading ? 'DELETING...' : 'CONFIRM DELETE'}
                   </button>
                 </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
