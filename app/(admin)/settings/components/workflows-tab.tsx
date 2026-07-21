'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, GripVertical, Trash2, Edit2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

type PipelineStage = {
  id: string
  code: string
  name: string
  description: string | null
  display_order: number
  is_active: boolean
}

type PipelineStatus = {
  id: string
  stage_id: string
  code: string
  name: string
  color: string
  customer_visible: boolean
  requires_customer_action: boolean
  display_order: number
}

export function WorkflowsTab() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [statuses, setStatuses] = useState<PipelineStatus[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [stagesRes, statusesRes] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('display_order'),
      supabase.from('pipeline_statuses').select('*').order('display_order')
    ])
    if (stagesRes.data) setStages(stagesRes.data)
    if (statusesRes.data) setStatuses(statusesRes.data)
    setLoading(false)
  }

  // Very simple view for now, full drag and drop can be added later
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black uppercase">Pipeline Configuration</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">Configure stages and statuses for service requests.</p>
        </div>
        <button className="brutal-button bg-black text-white px-4 py-2 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Stage
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-20 bg-secondary/30 border-2 border-black w-full"></div>
          <div className="h-20 bg-secondary/30 border-2 border-black w-full"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {stages.map(stage => {
            const stageStatuses = statuses.filter(s => s.stage_id === stage.id)
            
            return (
              <div key={stage.id} className="border-2 border-black bg-white p-6 relative group">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <GripVertical className="w-5 h-5 text-black/20 cursor-grab" />
                    <div>
                      <h4 className="font-black uppercase text-xl flex items-center gap-2">
                        {stage.name}
                        {!stage.is_active && <span className="text-[10px] bg-red-100 text-red-800 px-2 py-1 border border-red-800">Inactive</span>}
                      </h4>
                      <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">Code: {stage.code}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 border-2 border-transparent hover:border-black transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pl-9 space-y-3">
                  <h5 className="font-bold uppercase tracking-widest text-[10px] opacity-60 mb-2">Statuses</h5>
                  {stageStatuses.map(status => (
                    <div key={status.id} className="flex items-center justify-between p-3 border-2 border-black/20 bg-secondary/10 hover:border-black transition-colors">
                      <div className="flex items-center gap-4">
                        <GripVertical className="w-4 h-4 text-black/20 cursor-grab" />
                        <div 
                          className="w-3 h-3 rounded-full border-2 border-black" 
                          style={{ backgroundColor: status.color || '#000' }}
                        ></div>
                        <span className="font-bold uppercase text-sm">{status.name}</span>
                        {status.customer_visible && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 border border-emerald-600 bg-emerald-50 px-2 py-0.5">Visible</span>
                        )}
                        {status.requires_customer_action && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 border border-orange-600 bg-orange-50 px-2 py-0.5">Action Req</span>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  <button className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] hover:underline mt-2">
                    <Plus className="w-3 h-3" /> Add Status
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
