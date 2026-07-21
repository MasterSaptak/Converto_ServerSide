'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flag, X, Plus } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function RequestFlags({ requestId }: { requestId: string }) {
  const [flags, setFlags] = useState<any[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newFlag, setNewFlag] = useState('')
  const supabase = createClient()

  const fetchFlags = async () => {
    const { data } = await supabase
      .from('request_flags')
      .select('*')
      .eq('request_id', requestId)
    if (data) setFlags(data)
  }

  useEffect(() => {
    fetchFlags()
  }, [requestId])

  const addFlag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFlag.trim()) return

    const { error } = await supabase.from('request_flags').insert({
      request_id: requestId,
      flag: newFlag.trim().toLowerCase()
    })

    if (error) {
      toast.error(error.message)
    } else {
      setNewFlag('')
      setIsAdding(false)
      fetchFlags()
    }
  }

  const removeFlag = async (flagId: string) => {
    await supabase.from('request_flags').delete().eq('id', flagId)
    fetchFlags()
  }

  return (
    <div className="brutal-card bg-white p-6">
      <div className="flex items-center justify-between mb-4 border-b-4 border-black pb-2">
        <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
          <Flag className="w-4 h-4" /> Request Flags
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-1 border-2 border-transparent hover:border-black transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={addFlag} className="mb-4 flex gap-2">
          <input 
            type="text" 
            placeholder="e.g. VIP, Urgent, Disputed" 
            value={newFlag}
            onChange={(e) => setNewFlag(e.target.value)}
            className="brutal-input flex-1 py-1 px-2 text-xs font-bold"
            autoFocus
          />
          <button type="submit" className="brutal-button py-1 px-3 bg-black text-white text-xs">Add</button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {flags.length === 0 && !isAdding && (
          <span className="text-xs font-bold text-black/40 uppercase">No flags attached</span>
        )}
        {flags.map((flag) => (
          <span 
            key={flag.id} 
            className="bg-red-100 text-red-900 border-2 border-red-500 font-black uppercase text-[10px] tracking-widest px-2 py-1 flex items-center gap-2"
          >
            {flag.flag}
            <button onClick={() => removeFlag(flag.id)} className="hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
