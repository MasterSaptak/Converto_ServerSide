'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteStaffMember } from '../actions'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react'

const LOADING_STAGES = [
  'Validating Request...',
  'Checking Permissions...',
  'Creating Staff Record...',
  'Sending Invitation...',
  'Finalizing...'
]

export function AddStaffForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const [isSuccess, setIsSuccess] = useState(false)

  const simulateLoadingStages = () => {
    let stage = 0;
    const interval = setInterval(() => {
      stage += 1;
      if (stage < LOADING_STAGES.length) {
        setLoadingStage(stage);
      } else {
        clearInterval(interval);
      }
    }, 400);
    return interval;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setLoadingStage(0)
    
    const interval = simulateLoadingStages()
    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await inviteStaffMember(formData)
      
      clearInterval(interval)
      
      if (!result.success) {
        toast.error(result.message)
        setIsSubmitting(false)
      } else {
        setLoadingStage(LOADING_STAGES.length - 1)
        setIsSuccess(true)
        toast.success(result.message)
        setTimeout(() => {
          router.push('/staff')
        }, 1000)
      }
    } catch (err: any) {
      clearInterval(interval)
      toast.error('An unexpected error occurred.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
      
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center border-4 border-transparent backdrop-blur-sm">
          {!isSuccess ? (
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
          ) : (
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
          )}
          <h2 className="text-xl font-black uppercase tracking-widest text-center">
            {isSuccess ? 'Success!' : LOADING_STAGES[Math.min(loadingStage, LOADING_STAGES.length - 1)]}
          </h2>
          <div className="w-64 h-2 bg-gray-200 mt-6 border-2 border-black overflow-hidden">
             <div 
               className="h-full bg-yellow-400 transition-all duration-300" 
               style={{ width: isSuccess ? '100%' : `${((loadingStage + 1) / LOADING_STAGES.length) * 100}%` }}
             />
          </div>
        </div>
      )}

      <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 mb-6 pb-6 border-b-4 border-black">
        <ShieldCheck className="w-8 h-8" />
        Add New Staff
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-black uppercase mb-2">Email Address</label>
          <input 
            name="email"
            type="email" 
            required 
            placeholder="staff@converto.com"
            className="w-full p-3 border-2 border-black bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase font-bold placeholder:text-black/30" 
          />
          <p className="text-[10px] font-bold text-black/50 uppercase mt-2">
            If the user already exists, they will be promoted. Otherwise, an invite will be sent.
          </p>
        </div>

        <div>
          <label className="block text-sm font-black uppercase mb-2">Full Name</label>
          <input 
            name="fullName"
            type="text" 
            required 
            placeholder="John Doe"
            className="w-full p-3 border-2 border-black bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase font-bold placeholder:text-black/30" 
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-yellow-400 text-black border-2 border-black px-6 py-4 font-black uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Add Staff Member
        </button>
      </form>
    </div>
  )
}
