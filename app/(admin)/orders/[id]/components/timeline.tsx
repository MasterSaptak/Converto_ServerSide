import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Activity } from 'lucide-react'

export async function OrderTimeline({ orderId }: { orderId: string }) {
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

  const { data: events } = await supabase
    .from('order_events')
    .select('*, actor:profiles!actor_id(*)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  return (
    <div className="brutal-card bg-white p-6">
      <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-4 border-black pb-2 flex items-center gap-2">
        <Activity className="w-4 h-4" /> Timeline
      </h3>
      
      <div className="space-y-6">
        {(!events || events.length === 0) ? (
          <p className="text-xs font-bold uppercase opacity-50 text-center py-4">No events recorded</p>
        ) : (
          events.map((event: any) => (
            <div key={event.id} className="relative pl-4 border-l-2 border-black/20">
              <div className="absolute -left-[5px] top-1 w-2 h-2 bg-black rounded-full" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {new Date(event.created_at).toLocaleString()}
                </span>
                <p className="font-bold text-sm">
                  {event.event_type}
                </p>
                {event.remarks && (
                  <p className="text-xs opacity-70 mt-1">{event.remarks}</p>
                )}
                {event.actor && (
                  <span className="text-[10px] font-bold uppercase mt-1 text-primary">
                    by {event.actor.full_name}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
