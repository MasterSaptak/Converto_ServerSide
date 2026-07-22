'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, MoreVertical, ArrowUpRight, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function KanbanBoard({ 
  initialStages, 
  initialStatuses, 
  initialRequests 
}: { 
  initialStages: any[], 
  initialStatuses: any[], 
  initialRequests: any[] 
}) {
  const [requests, setRequests] = useState(initialRequests)
  const [selectedStageId, setSelectedStageId] = useState<string | 'ALL'>('ALL')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setRequests(initialRequests)
  }, [initialRequests])

  // Group requests by stage to get counts
  const requestsByStage = initialStages.reduce((acc, stage) => {
    acc[stage.id] = requests.filter(r => r.pipeline_stage_id === stage.id)
    return acc
  }, {} as Record<string, any[]>)

  const displayedRequests = selectedStageId === 'ALL' 
    ? requests 
    : requests.filter(r => r.pipeline_stage_id === selectedStageId)

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-200px)]">
      
      {/* Sliding Stage Filters (Pills) */}
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar shrink-0">
        <button
          onClick={() => setSelectedStageId('ALL')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 border-4 border-black font-black uppercase tracking-widest text-xs whitespace-nowrap transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
            selectedStageId === 'ALL' ? "bg-black text-white shadow-none translate-y-1 translate-x-1" : "bg-white hover:bg-slate-100"
          )}
        >
          All Requests
          <span className="bg-white/20 px-2 py-0.5 border-2 border-transparent">{requests.length}</span>
        </button>
        
        {initialStages.map((stage) => {
          const count = requestsByStage[stage.id]?.length || 0
          const isSelected = selectedStageId === stage.id
          
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStageId(stage.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border-4 border-black font-black uppercase tracking-widest text-xs whitespace-nowrap transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                isSelected ? "shadow-none translate-y-1 translate-x-1" : "hover:bg-slate-50"
              )}
              style={{
                backgroundColor: isSelected ? (stage.color || '#e5e7eb') : 'white',
                color: isSelected ? 'black' : 'black'
              }}
            >
              {stage.name}
              <span className="bg-white px-2 py-0.5 border-2 border-black">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Vertical List of Cards */}
      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 pb-4">
        {displayedRequests.length === 0 ? (
          <div className="h-40 border-4 border-dashed border-black/20 flex flex-col items-center justify-center text-black/40 font-bold uppercase tracking-widest text-sm">
            <span className="text-4xl mb-2">📭</span>
            No requests in this stage
          </div>
        ) : (
          displayedRequests.map((request) => {
            const status = initialStatuses.find(s => s.id === request.pipeline_status_id)
            const stage = initialStages.find(s => s.id === request.pipeline_stage_id)
            
            return (
              <div 
                key={request.id} 
                className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col"
              >
                <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                  
                  {/* Info Section */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-black text-sm bg-black text-white px-2 py-1">
                        #{request.id.substring(0,8).toUpperCase()}
                      </span>
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-1 border-2 border-black",
                        request.priority === 'Urgent' ? 'bg-red-500 text-white' : 'bg-accent text-black'
                      )}>
                        {request.priority || 'NORMAL'}
                      </span>
                      {status && (
                        <span 
                          className="text-[10px] font-black uppercase px-2 py-1 border-2 border-black"
                          style={{ backgroundColor: status.color ? `${status.color}33` : '#f1f5f9' }}
                        >
                          {status.name}
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-black text-xl sm:text-2xl uppercase tracking-tight">
                        {request.profile?.full_name || 'Unknown Customer'}
                      </h3>
                      <p className="text-xs font-bold text-black/60 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span>Module: {request.service?.name}</span>
                        <span>•</span>
                        <span>{new Date(request.created_at).toLocaleDateString('en-GB')}</span>
                      </p>
                    </div>
                  </div>

                  {/* Pricing / Right Info */}
                  <div className="flex flex-col items-start md:items-end gap-2 shrink-0 border-t-4 border-black md:border-t-0 pt-4 md:pt-0">
                    <div className="text-2xl font-black font-mono">
                       {request.amount ? `${request.amount.toLocaleString(undefined, {minimumFractionDigits: 2})} ${request.currency}` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Quick Actions Row */}
                <div className="flex flex-wrap border-t-4 border-black bg-slate-50">
                  {request.profile?.phone && (
                    <a href={`https://wa.me/${request.profile.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex-1 min-w-[120px] p-3 border-r-4 border-black font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-green-400 hover:text-black transition-colors">
                       WhatsApp
                    </a>
                  )}
                  {request.profile?.phone && (
                    <a href={`tel:${request.profile.phone}`} className="flex-1 min-w-[120px] p-3 border-r-4 border-black font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-blue-400 hover:text-black transition-colors">
                       Call
                    </a>
                  )}
                  <Link href={`/requests/${request.id}`} className="flex-1 min-w-[120px] p-3 border-r-4 border-black font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-accent transition-colors">
                     View Details <ArrowUpRight className="w-4 h-4" />
                  </Link>
                  <button className="flex-[2] min-w-[200px] p-3 bg-primary text-primary-foreground font-black uppercase text-xs tracking-widest hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                     Quick Action ⚡
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
