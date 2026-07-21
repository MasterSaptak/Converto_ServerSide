'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Bell, Check, Phone, ExternalLink, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { acceptInstaOrder, rejectInstaOrder } from '@/app/(admin)/requests/actions'

// Custom Component for Persistent Insta Order Alerts
function InstaOrderCard({ order, onDismiss, onMarkAccepted }: { order: any, onDismiss: (id: string) => void, onMarkAccepted: (id: string) => void }) {
  const [elapsed, setElapsed] = useState(0)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
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
      onMarkAccepted(order.id)
      toast.success('Assigned to you! Open the order to view details.')
      setTimeout(() => {
        onDismiss(order.id)
      }, 2000)
    }
    setIsAccepting(false)
  }

  const handleReject = async () => {
    setIsRejecting(true)
    const res = await rejectInstaOrder(order.id)
    if (res.error) {
      toast.error(res.error, { style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' } })
    } else {
      toast.success('Order rejected.')
      onMarkAccepted(order.id) // Stops the ringing
    }
    onDismiss(order.id)
    setIsRejecting(false)
  }

  const customerName = order.profile?.full_name || 'Customer'
  const customerPhone = order.profile?.phone || ''

  let metadataObj = order.metadata
  if (typeof metadataObj === 'string') {
    try { metadataObj = JSON.parse(metadataObj) } catch(e){}
  }
  const isInstaOrder = metadataObj?.is_insta_order === true || metadataObj?.is_insta_order === 'true';

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
                  {isInstaOrder ? '⚡ NEW INSTA ORDER' : '🆕 NEW REQUEST'}
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
                  
                  <button 
                    disabled={isRejecting}
                    onClick={handleReject}
                    className="bg-red-500 text-white font-black uppercase tracking-widest px-3 py-2 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none transition-all flex items-center justify-center disabled:opacity-50"
                    title="Reject Order"
                  >
                    <X className="w-4 h-4" />
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
                    onClick={() => router.push(`/requests/${order.id}`)}
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
  const activeOrdersRef = useRef<any[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)

  // Initialize looping audio
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('/ding.mp3')
      audioRef.current.loop = true
    }
  }, [])

  // Keep a ref synced with state so intervals can access latest data
  useEffect(() => {
    activeOrdersRef.current = activeInstaOrders
  }, [activeInstaOrders])

  const ringingCount = activeInstaOrders.filter(o => !o.is_accepted_ui).length

  useEffect(() => {
    if (audioRef.current) {
      if (ringingCount > 0) {
        audioRef.current.play().catch(e => {
          console.log('Audio autoplay blocked by browser. Please interact with the page first.', e)
          setAudioBlocked(true)
        })
      } else {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [ringingCount])

  useEffect(() => {
    const fetchPendingOrders = async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('*, profile:profiles!service_requests_profile_id_fkey(full_name, phone)')
        .eq('status', 'Submitted')
      
      if (data) {
        // Identify truly new orders that aren't already active
        const existingIds = new Set(activeOrdersRef.current.map((o: any) => o.id))
        const newOrders = data.filter((o: any) => !existingIds.has(o.id))
        
        if (newOrders.length > 0) {
          setActiveInstaOrders(prev => [...prev, ...newOrders])
        }
      }
    }
    
    // Initial fetch
    fetchPendingOrders()

    // Robust Polling Fallback (Every 5 seconds) - Catches anything Realtime misses!
    const pollInterval = setInterval(fetchPendingOrders, 5000)

    // Realtime Websocket
    const channel = supabase
      .channel('service_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
        },
        async (payload: any) => {
          console.log('Realtime Order Change Received!', payload)
          
          // Seamlessly refresh Server Components (like Dashboard metrics and tables)
          router.refresh()
          
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('service_requests')
              .select('*, profile:profiles!service_requests_profile_id_fkey(full_name, phone)')
              .eq('id', payload.new.id)
              .single()
            
            if (data && !activeOrdersRef.current.some(o => o.id === data.id)) {
              setActiveInstaOrders(prev => [...prev, data])
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log('Supabase Realtime Status:', status)
      })

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [router, supabase])

  const dismissInstaOrder = (id: string) => {
    setActiveInstaOrders(prev => prev.filter(o => o.id !== id))
  }

  return (
    <>
      {/* Audio Unmute Overlay */}
      {audioBlocked && ringingCount > 0 && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center cursor-pointer pointer-events-auto"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.play().catch(() => {})
            }
            setAudioBlocked(false)
          }}
        >
          <div className="bg-red-500 text-white font-black uppercase text-2xl p-8 border-4 border-black animate-pulse flex flex-col items-center gap-4 text-center shadow-[12px_12px_0px_rgba(0,0,0,1)]">
            <Bell className="w-16 h-16 animate-bounce" />
            CLICK TO UNMUTE ALARM!
            <p className="text-sm opacity-90 max-w-sm mt-2">Browser blocked the alarm sound. Click anywhere to allow audio playback.</p>
          </div>
        </div>
      )}

      {/* Fixed overlay container for persistent Insta Orders */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-4 items-end pointer-events-none">
        {activeInstaOrders.map(order => (
          <InstaOrderCard 
            key={order.id} 
            order={order} 
            onDismiss={dismissInstaOrder}
            onMarkAccepted={(id) => {
              setActiveInstaOrders(prev => prev.map(o => o.id === id ? { ...o, is_accepted_ui: true } : o))
            }}
          />
        ))}
      </div>
    </>
  )
}
