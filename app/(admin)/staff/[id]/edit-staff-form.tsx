'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStaffProfile } from '../actions'
import { toast } from 'sonner'
import { ShieldCheck, Loader2 } from 'lucide-react'

export function EditStaffForm({ 
  profile, 
  staffData,
  authUser
}: { 
  profile: any, 
  staffData: any,
  authUser?: any
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await updateStaffProfile(formData)
      
      if (!result.success) {
        toast.error(result.message)
      } else {
        toast.success(result.message)
        router.push('/staff')
      }
    } catch (err) {
      toast.error('An unexpected error occurred.')
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 mb-6 pb-6 border-b-4 border-black">
        <ShieldCheck className="w-8 h-8" />
        Edit Profile: {profile.full_name || 'Staff Member'}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <input type="hidden" name="profileId" value={profile.id} />
        {/* Optimistic Concurrency Token */}
        <input type="hidden" name="lastUpdatedAt" value={staffData?.updated_at || ''} />

        {/* PERSONAL SECTION */}
        <div className="space-y-4">
          <h2 className="font-black uppercase tracking-widest text-sm border-b-2 border-black pb-2 inline-block">Personal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">Email Address (Read-Only)</label>
              <input 
                type="email" 
                disabled 
                defaultValue={profile.email} 
                className="w-full p-3 border-2 border-black bg-gray-200 text-black/50 uppercase cursor-not-allowed font-bold" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">Full Name</label>
              <input 
                name="fullName"
                type="text" 
                required 
                defaultValue={profile.full_name}
                className="w-full p-3 border-2 border-black bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase font-bold" 
              />
            </div>
          </div>
        </div>

        {/* ACCESS SECTION */}
        <div className="space-y-4">
          <h2 className="font-black uppercase tracking-widest text-sm border-b-2 border-black pb-2 inline-block">Access</h2>
          
          <div className="flex items-center gap-4 border-2 border-black p-4 bg-gray-50 max-w-sm">
            <input 
              type="checkbox" 
              name="isActive"
              id="isActive" 
              value="true"
              defaultChecked={staffData?.is_active ?? true} 
              className="w-6 h-6 border-2 border-black rounded-none appearance-none checked:bg-black checked:after:content-['✓'] checked:after:text-white flex items-center justify-center font-bold" 
            />
            <label htmlFor="isActive" className="font-black uppercase cursor-pointer select-none">
              Active Staff Member
            </label>
          </div>
        </div>

        {/* METADATA SECTION */}
        <div className="space-y-4 pt-6 border-t-4 border-black">
          <h2 className="font-black uppercase tracking-widest text-sm border-b-2 border-black pb-2 inline-block">Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold uppercase tracking-widest">
            <div className="p-3 border-2 border-black/10 bg-gray-50">
               <div className="text-[9px] text-black/50 mb-1">Profile ID</div>
               <div className="truncate" title={profile.id}>{profile.id.split('-')[0]}...</div>
            </div>
            <div className="p-3 border-2 border-black/10 bg-gray-50">
               <div className="text-[9px] text-black/50 mb-1">Created At</div>
               <div>{new Date(profile.created_at).toLocaleDateString()}</div>
            </div>
            <div className="p-3 border-2 border-black/10 bg-gray-50">
               <div className="text-[9px] text-black/50 mb-1">Staff Record Updated</div>
               <div>{staffData?.updated_at ? new Date(staffData.updated_at).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div className="p-3 border-2 border-black/10 bg-gray-50">
               <div className="text-[9px] text-black/50 mb-1">Last Login</div>
               <div>{authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleDateString() : 'Never'}</div>
            </div>
            <div className="p-3 border-2 border-black/10 bg-gray-50">
               <div className="text-[9px] text-black/50 mb-1">Invite Status</div>
               <div>{authUser?.last_sign_in_at ? 'Accepted' : 'Pending'}</div>
            </div>
            <div className="p-3 border-2 border-black/10 bg-gray-50">
               <div className="text-[9px] text-black/50 mb-1">Invited By</div>
               <div>System Admin</div>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-yellow-400 text-black border-2 border-black px-6 py-4 font-black uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Saving Changes...</>
          ) : (
            'Save Profile Changes'
          )}
        </button>
      </form>
    </div>
  )
}
