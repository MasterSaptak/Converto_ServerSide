import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Workflow, ArrowRight } from 'lucide-react'

export default async function WorkflowsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  // Fetch all active services
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Fetch all workflow steps
  const { data: workflows } = await supabase
    .from('service_workflows')
    .select('*')
    .order('step_order', { ascending: true })

  // Group workflows by service_id
  const groupedWorkflows: Record<string, any[]> = {}
  if (workflows) {
    workflows.forEach((wf: any) => {
      if (!groupedWorkflows[wf.service_id]) {
        groupedWorkflows[wf.service_id] = []
      }
      groupedWorkflows[wf.service_id].push(wf)
    })
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Workflows Engine</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Configure State Machines for Platform Modules</p>
        </div>
      </div>

      <div className="space-y-8">
        {(!services || services.length === 0) ? (
          <p className="font-bold opacity-50">No modules found.</p>
        ) : (
          services.map((service: any) => {
            const moduleWorkflows = groupedWorkflows[service.id] || []
            
            return (
              <div key={service.id} className="brutal-card bg-white p-6 md:p-8">
                <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 border-2 border-black flex items-center justify-center font-black bg-accent">
                       {service.code.substring(0, 2).toUpperCase()}
                     </div>
                     <div>
                       <h3 className="font-black uppercase tracking-widest text-lg leading-none">{service.name}</h3>
                       <span className="text-[10px] font-bold uppercase opacity-60 tracking-widest">{moduleWorkflows.length} Steps Defined</span>
                     </div>
                   </div>
                   <button className="brutal-button bg-primary text-primary-foreground text-xs py-2">
                     Edit State Machine
                   </button>
                </div>

                {moduleWorkflows.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-black/20 text-center">
                    <p className="text-sm font-bold uppercase opacity-50 mb-2">No workflow defined</p>
                    <button className="text-xs font-black uppercase underline hover:text-primary">Generate Default Workflow</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
                    {moduleWorkflows.map((step: any, index: number) => (
                      <div key={step.id} className="flex items-center shrink-0">
                        <div className="border-2 border-black p-4 min-w-[150px] bg-slate-50 flex flex-col hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                          <span className="text-[10px] font-black opacity-40 mb-1 tracking-widest">STEP {step.step_order}</span>
                          <span className="font-bold uppercase text-sm">{step.step_name}</span>
                          
                          {(step.requires_documents || step.requires_payment || step.is_terminal) && (
                            <div className="mt-3 flex gap-1 flex-wrap">
                              {step.requires_documents && <span className="bg-blue-100 text-blue-800 text-[8px] font-black uppercase px-1 border border-blue-400">DOCS REQ</span>}
                              {step.requires_payment && <span className="bg-orange-100 text-orange-800 text-[8px] font-black uppercase px-1 border border-orange-400">PAYMENT</span>}
                              {step.is_terminal && <span className="bg-red-100 text-red-800 text-[8px] font-black uppercase px-1 border border-red-400">TERMINAL</span>}
                            </div>
                          )}
                        </div>
                        {index < moduleWorkflows.length - 1 && (
                          <ArrowRight className="w-5 h-5 opacity-30 mx-2" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
