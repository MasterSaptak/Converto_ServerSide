'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { History } from 'lucide-react'

export function RequestWorkflowHistory({ requestId }: { requestId: string }) {
  const [history, setHistory] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('request_workflow_history')
        .select('*, changed_by_profile:profiles(full_name)')
        .eq('request_id', requestId)
        .order('changed_at', { ascending: false })
      
      if (data) setHistory(data)
    }

    fetchHistory()
  }, [requestId])

  return (
    <div className="brutal-card bg-white p-6">
      <h3 className="font-black uppercase tracking-widest text-sm mb-4 border-b-4 border-black pb-2 flex items-center gap-2">
        <History className="w-4 h-4" /> Workflow History
      </h3>

      <div className="space-y-4">
        {history.length === 0 && (
          <span className="text-xs font-bold text-black/40 uppercase">No history available</span>
        )}
        {history.map((log) => (
          <div key={log.id} className="border-l-4 border-black pl-4 py-1 relative">
            <div className="absolute w-3 h-3 bg-black rounded-full -left-[8px] top-2 border-2 border-white"></div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/50">
                {new Date(log.changed_at).toLocaleString()}
              </span>
              <p className="font-bold text-sm">
                Status changed to <span className="bg-black text-white px-1">{log.new_status}</span>
              </p>
              {log.remarks && (
                <p className="text-xs font-bold text-black/70 italic">"{log.remarks}"</p>
              )}
              {log.changed_by_profile?.full_name && (
                <p className="text-[10px] font-bold uppercase mt-1 text-primary">
                  By: {log.changed_by_profile.full_name}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
