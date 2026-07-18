'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Edit, X } from 'lucide-react'
import { updateCustomerProfile } from './actions'
import { useRouter } from 'next/navigation'

export function ProfileEditModal({ customer }: { customer: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => setMounted(true), [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await updateCustomerProfile(customer.id, formData)
      if (res.success) {
        setIsOpen(false)
        router.refresh()
      } else {
        alert('Failed to update profile: ' + res.error)
      }
    } catch (err: any) {
      alert('Error updating profile: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="brutal-button p-2 bg-white text-black text-xs flex items-center gap-2 border-2 border-black"
      >
        <Edit className="w-4 h-4" />
        EDIT PROFILE
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-4 border-black w-full max-w-2xl max-h-[90vh] overflow-y-auto brutal-card p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">Edit Customer Profile</h2>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest">Full Name</label>
                  <input 
                    name="full_name" 
                    defaultValue={customer.full_name === 'EMPTY' ? '' : customer.full_name} 
                    className="brutal-input w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20" 
                    placeholder="John Doe" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest">Username</label>
                  <input 
                    name="username" 
                    defaultValue={customer.username === 'EMPTY' ? '' : customer.username} 
                    className="brutal-input w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20" 
                    placeholder="johndoe123" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest">Email</label>
                  <input 
                    name="email" 
                    type="email"
                    defaultValue={customer.email === 'EMPTY' ? '' : customer.email} 
                    className="brutal-input w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20" 
                    placeholder="john@example.com" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest">Phone</label>
                  <input 
                    name="phone" 
                    defaultValue={customer.phone === 'EMPTY' ? '' : customer.phone} 
                    className="brutal-input w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20" 
                    placeholder="+1234567890" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest">Country</label>
                  <input 
                    name="country" 
                    defaultValue={customer.country === 'EMPTY' ? '' : customer.country} 
                    className="brutal-input w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20" 
                    placeholder="United States" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest">Time Zone</label>
                  <input 
                    name="timezone" 
                    defaultValue={customer.timezone === 'EMPTY' ? '' : customer.timezone} 
                    className="brutal-input w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20" 
                    placeholder="America/New_York" 
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest">Present Address</label>
                  <textarea 
                    name="address" 
                    defaultValue={customer.address === 'EMPTY' ? '' : customer.address} 
                    className="brutal-input w-full p-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20 min-h-[100px]" 
                    placeholder="123 Main St, City, Country" 
                  />
                </div>

                <div className="space-y-2 md:col-span-2 flex items-center gap-3 bg-slate-50 p-4 border-2 border-black">
                  <input 
                    type="checkbox" 
                    name="is_staff" 
                    id="is_staff"
                    defaultChecked={customer.is_staff} 
                    className="w-5 h-5 accent-black border-2 border-black cursor-pointer"
                  />
                  <label htmlFor="is_staff" className="text-sm font-bold uppercase tracking-widest cursor-pointer">
                    Is Staff Member
                  </label>
                </div>
                
              </div>

              <div className="pt-6 flex gap-4">
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
                  {isLoading ? 'Saving...' : 'Save Changes'}
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
