'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Bell, Check, Phone, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { acceptInstaOrder } from '@/app/(admin)/orders/actions'

// Custom Component for Persistent Insta Order Alerts
function InstaOrderCard({ order, onAccept, onDismiss }: { order: any, onAccept: (id: string) => void, onDismiss: (id: string) => void }) {
  const [elapsed, setElapsed] = useState(0)
  const [isAccepting, setIsAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const router = useRouter()
  
  useEffect(() => {
    // Calculate initial elapsed time
    const start = new Date(order.created_at).getTime()
    const update = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [order.created_at])

  // Persistent Alarm logic
  useEffect(() => {
    if (elapsed > 60 && !accepted && elapsed % 30 === 0) {
      // Play a reminder ping every 30s after 1 minute
      const audio = new Audio('/ding.mp3')
      audio.play().catch(e => console.log('Audio fail', e))
    }
  }, [elapsed, accepted])

  // Color logic based on SLA
  let bgColor = 'bg-green-100 border-green-500'
  let textColor = 'text-green-800'
  let iconColor = 'bg-green-500 text-white'
  let statusIcon = '🟢'
  
  if (elapsed > 120 && elapsed <= 300) {
    bgColor = 'bg-yellow-200 border-yellow-500'
    textColor = 'text-yellow-900'
    iconColor = 'bg-yellow-500 text-black'
    statusIcon = '🟡'
  } else if (elapsed > 300) {
    bgColor = 'bg-red-200 border-red-600'
    textColor = 'text-red-900'
    iconColor = 'bg-red-600 text-white animate-pulse'
    statusIcon = '🔴'
  }

  // Format time (MM:SS)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  const handleAccept = async () => {
    setIsAccepting(true)
    const res = await acceptInstaOrder(order.id)
    if (res.error) {
      toast.error(res.error, { style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' } })
      onDismiss(order.id) // It was taken by someone else
    } else {
      setAccepted(true)
      toast.success('Assigned to you! Open the order to view details.')
      setTimeout(() => {
        onDismiss(order.id)
      }, 2000)
    }
    setIsAccepting(false)
  }

  const customerName = order.profile?.full_name || 'Customer'
  const customerPhone = order.profile?.phone || ''

  return (
    <div className={`w-[90vw] sm:w-[400px] shrink-0 shadow-xl rounded-none border-4 pointer-events-auto flex ring-1 ring-black shadow-[8px_8px_0px_rgba(0,0,0,1)] transition-all ${bgColor}`}>
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <div className={`h-10 w-10 flex items-center justify-center border-2 border-black ${iconColor}`}>
              <Bell className="h-6 w-6 animate-bounce" />
            </div>
          </div>
          <div className="ml-3 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-sm font-black uppercase tracking-widest ${textColor}`}>
                  ⚡ NEW INSTA ORDER
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900">
                  Customer: {customerName}
                </p>
                <p className="text-xs font-bold text-gray-700 mt-0.5">
                  ID: {order.id.substring(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[10px] font-black px-1.5 py-0.5 border-2 border-black ${iconColor}`}>
                  {statusIcon} {timeString}
                </span>
                {elapsed > 60 && <span className="text-[9px] font-black text-red-600 mt-1 uppercase animate-pulse">SLA Warning</span>}
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              {!accepted ? (
                <>
                  <button 
                    disabled={isAccepting}
                    onClick={handleAccept}
                    className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest px-3 py-2 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-xs disabled:opacity-50 flex justify-center items-center gap-1"
                  >
                    {isAccepting ? 'Accepting...' : <><Check className="w-4 h-4"/> Accept</>}
                  </button>
                  
                  {customerPhone && (
                    <a 
                      href={`tel:${customerPhone}`}
                      className="bg-green-500 text-white font-black uppercase tracking-widest px-3 py-2 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none transition-all flex items-center justify-center"
                      title="Call Customer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}

                  <button 
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="bg-blue-400 text-black font-black uppercase tracking-widest px-3 py-2 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none transition-all flex items-center justify-center"
                    title="Open Details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-2 bg-green-500 text-white border-2 border-black font-black uppercase text-xs flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Assigned to You
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RealtimeNotifications() {
  const router = useRouter()
  const [activeInstaOrders, setActiveInstaOrders] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Fetch existing unassigned Insta Orders on mount
    const fetchPendingOrders = async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('*, profile:profiles(full_name, phone)')
        .eq('status', 'Submitted')
      
      if (data) {
        const pendingInstaOrders = data.filter(order => {
          let metadataObj = order.metadata
          if (typeof metadataObj === 'string') {
            try { metadataObj = JSON.parse(metadataObj) } catch(e){}
          }
          return metadataObj?.is_insta_order === true || metadataObj?.is_insta_order === 'true'
        })
        setActiveInstaOrders(pendingInstaOrders)
      }
    }
    
    fetchPendingOrders()
  }, [supabase])

  useEffect(() => {
    const alertSound = typeof window !== 'undefined' ? new Audio('/ding.mp3') : null

    const channel = supabase
      .channel('service_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
        },
        async (payload) => {
          console.log('New Order Received!', payload)
          
          let metadataObj = payload.new.metadata || {};
          if (typeof metadataObj === 'string') {
            try { metadataObj = JSON.parse(metadataObj) } catch(e){}
          }
          const isInstaOrder = metadataObj?.is_insta_order === true || metadataObj?.is_insta_order === 'true';

          if (isInstaOrder) {
            // Fetch full order to get profile (name/phone)
            const { data } = await supabase
              .from('service_requests')
              .select('*, profile:profiles(full_name, phone)')
              .eq('id', payload.new.id)
              .single()
            
            if (data) {
              setActiveInstaOrders(prev => [...prev, data])
              if (alertSound) alertSound.play().catch(e => console.log('Audio fail', e))
            }
          } else {
            // Regular request toast (auto dismisses)
            if (alertSound) alertSound.play().catch(e => console.log('Audio fail', e))
            toast.custom((t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } w-[90vw] sm:w-[400px] shrink-0 bg-white shadow-xl rounded-none border-4 border-black pointer-events-auto flex ring-1 ring-black shadow-[8px_8px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-slate-50 transition-colors`}
                onClick={() => {
                  toast.dismiss(t.id)
                  router.push(`/orders/${payload.new.id}`)
                }}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-10 w-10 bg-primary flex items-center justify-center border-2 border-black">
                        <Bell className="h-6 w-6 text-primary-foreground animate-bounce" />
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-black uppercase tracking-widest text-black">
                        New Request!
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-700">
                        ID: {payload.new.id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ), { duration: 6000, position: 'top-right' })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, supabase])

  const dismissInstaOrder = (id: string) => {
    setActiveInstaOrders(prev => prev.filter(o => o.id !== id))
  }

  return (
    <>
      {/* Fixed overlay container for persistent Insta Orders */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-4 items-end pointer-events-none">
        {activeInstaOrders.map(order => (
          <InstaOrderCard 
            key={order.id} 
            order={order} 
            onAccept={dismissInstaOrder} 
            onDismiss={dismissInstaOrder}
          />
        ))}
      </div>
    </>
  )
}
