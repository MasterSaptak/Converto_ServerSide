import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ShieldAlert, Clock, User, ArrowRight, Activity } from 'lucide-react'
import { requireStaffRole } from '@/lib/rbac'
import { format } from 'date-fns'

export default async function AuditPage() {
  await requireStaffRole(['Super Admin'])
  
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

  // Fetch audit logs joined with staff profiles
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select(`
      *,
      staff:profiles(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase flex items-center gap-3">
            <ShieldAlert className="w-8 h-8" />
            Audit Logs
          </h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Immutable Security and Activity Ledger</p>
        </div>
      </div>

      <div className="brutal-card bg-white p-6 md:p-8 space-y-6">
        {(!auditLogs || auditLogs.length === 0) ? (
           <div className="text-center p-12 opacity-50">
             <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
             <p className="font-bold uppercase tracking-widest">No Audit Logs Found</p>
           </div>
        ) : (
          <div className="space-y-4">
             {auditLogs.map((log: any) => (
                <div key={log.id} className="border-2 border-black p-4 md:p-6 flex flex-col md:flex-row gap-6 items-start hover:bg-slate-50 transition-colors">
                   {/* Metadata side */}
                   <div className="shrink-0 w-full md:w-48 space-y-3">
                      <div className="inline-flex px-2 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest">
                         {log.action}
                      </div>
                      <div className="space-y-1 text-xs font-bold opacity-60">
                         <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                         </div>
                         <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {log.staff?.full_name || 'System / Unknown'}
                         </div>
                      </div>
                      
                      <div className="pt-2 border-t-2 border-black/10">
                         <p className="text-[10px] font-black uppercase opacity-40">Target</p>
                         <p className="text-xs font-bold truncate" title={log.entity_id}>{log.entity_type} {log.entity_id && `#${log.entity_id.split('-')[0]}`}</p>
                      </div>
                   </div>

                   {/* Data Diff */}
                   <div className="flex-1 w-full bg-slate-100 border-2 border-black/10 p-4 font-mono text-xs overflow-x-auto">
                      {(log.old_data || log.new_data) ? (
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 border-b-2 border-black/10 pb-1">Old Data</p>
                               <pre className="text-red-700 whitespace-pre-wrap">
                                  {log.old_data ? JSON.stringify(log.old_data, null, 2) : 'null'}
                               </pre>
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 border-b-2 border-black/10 pb-1">New Data</p>
                               <pre className="text-green-700 whitespace-pre-wrap">
                                  {log.new_data ? JSON.stringify(log.new_data, null, 2) : 'null'}
                               </pre>
                            </div>
                         </div>
                      ) : (
                         <p className="opacity-40 italic">No state changes recorded.</p>
                      )}
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  )
}
