'use client'

import { useState } from 'react'
import { Shield, ShieldOff } from 'lucide-react'
import { toggleStaffStatus } from './actions'

export function StaffToggleButton({ customerId, initialIsStaff }: { customerId: string, initialIsStaff: boolean }) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleToggle() {
    setIsLoading(true)
    try {
      const res = await toggleStaffStatus(customerId, !initialIsStaff)
      if (!res.success) {
        alert('Failed to update staff status: ' + res.error)
      }
    } catch (err: any) {
      alert('Error updating staff status: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleToggle}
      disabled={isLoading}
      title={initialIsStaff ? "Revoke Staff Access" : "Grant Staff Access"}
      className={`brutal-button p-2 text-xs flex items-center gap-2 border-2 border-black transition-colors disabled:opacity-50 ${
        initialIsStaff 
          ? 'bg-amber-300 hover:bg-amber-400 text-black' 
          : 'bg-white hover:bg-gray-100 text-black'
      }`}
    >
      {initialIsStaff ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
      <span className="hidden sm:inline">
        {initialIsStaff ? 'REVOKE STAFF' : 'MAKE STAFF'}
      </span>
    </button>
  )
}
