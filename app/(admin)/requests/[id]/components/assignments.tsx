import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Users, Plus } from 'lucide-react'

export async function OrderAssignments({ orderId }: { orderId: string }) {
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

  const { data: assignments } = await supabase
    .from('order_assignments')
    .select('*, staff:staff(*, profile:profiles(*))')
    .eq('order_id', orderId)

  return (
    <div className="brutal-card bg-white p-6">
      <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-4 border-black pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Assigned Staff</div>
        <button className="text-[10px] bg-black text-white px-2 py-1 flex items-center gap-1 hover:bg-black/80 transition-colors">
          <Plus className="w-3 h-3" /> Assign
        </button>
      </h3>
      
      <div className="space-y-4">
        {(!assignments || assignments.length === 0) ? (
          <p className="text-xs font-bold uppercase opacity-50 text-center py-4">Unassigned</p>
        ) : (
          assignments.map((assignment: any) => (
            <div key={assignment.id} className="flex items-center justify-between p-3 border-2 border-black bg-slate-50">
              <div className="flex flex-col">
                <span className="font-bold text-sm">{assignment.staff?.profile?.full_name || 'Unknown Staff'}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-primary">
                  {assignment.role} {assignment.is_primary ? '(Primary)' : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
