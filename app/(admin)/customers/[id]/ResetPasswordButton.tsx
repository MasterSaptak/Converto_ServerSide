'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { sendPasswordReset } from './actions'

export function ResetPasswordButton({ email }: { email: string | null | undefined }) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleReset() {
    if (!email || email === 'EMPTY' || email === 'NULL') {
      alert("This customer doesn't have a valid email address saved.")
      return
    }

    if (!confirm(`Are you sure you want to send a password reset email to ${email}?`)) {
      return
    }

    setIsLoading(true)
    try {
      const res = await sendPasswordReset(email)
      if (res.success) {
        alert(`Password reset email sent to ${email} successfully!`)
      } else {
        alert('Failed to send reset email: ' + res.error)
      }
    } catch (err: any) {
      alert('Error sending reset email: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleReset}
      disabled={isLoading || !email || email === 'EMPTY' || email === 'NULL'}
      className="brutal-button p-2 bg-white text-black text-xs flex items-center gap-2 border-2 border-black disabled:opacity-50"
    >
      <KeyRound className="w-4 h-4" />
      {isLoading ? 'SENDING...' : 'RESET PASSWORD'}
    </button>
  )
}
