'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Lock, CheckCircle, Clock } from 'lucide-react'
import { sendMessage, updateConversationStatus } from '@/app/api/messages/actions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function ChatInterface({ 
  conversationId, 
  messages, 
  currentUserId 
}: { 
  conversationId: string, 
  messages: any[], 
  currentUserId: string 
}) {
  const [text, setText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setIsSubmitting(true)
    try {
      await sendMessage(conversationId, text, isInternal)
      setText('')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleClose() {
    try {
      await updateConversationStatus(conversationId, 'closed')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header Actions */}
      <div className="absolute top-0 right-0 p-4 z-10 flex gap-2">
         <button 
           onClick={handleClose}
           className="px-3 py-1.5 border-2 border-black bg-red-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:bg-red-200"
         >
           <CheckCircle className="w-3 h-3" />
           Close Ticket
         </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pt-16">
        {messages.map((msg) => {
          const isStaff = msg.sender_type === 'staff'
          const isOwn = msg.sender_id === currentUserId

          return (
            <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isStaff ? "ml-auto items-end" : "mr-auto items-start")}>
              
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-black uppercase opacity-50 tracking-widest">
                   {isStaff ? (isOwn ? 'You' : 'Support Team') : 'Customer'}
                 </span>
                 <span className="text-[10px] font-bold opacity-40">
                   {format(new Date(msg.created_at), 'HH:mm')}
                 </span>
              </div>

              <div 
                className={cn(
                  "p-4 border-2 border-black",
                  msg.is_internal ? "bg-amber-100 text-amber-900 border-amber-900" : (isStaff ? "bg-black text-white" : "bg-slate-50")
                )}
              >
                {msg.is_internal && (
                  <div className="flex items-center gap-1 mb-2 pb-2 border-b-2 border-amber-900/10 text-[10px] font-black uppercase tracking-widest opacity-60">
                    <Lock className="w-3 h-3" /> Internal Note
                  </div>
                )}
                <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              </div>

            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-slate-50 border-t-4 border-black">
        <form onSubmit={handleSend} className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-4 h-4 border-2 border-black rounded-none checked:bg-black focus:ring-black focus:ring-2 focus:ring-offset-2" 
              />
              <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Internal Note
              </span>
            </label>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message..."
              className={cn("brutal-input flex-1", isInternal && "bg-amber-50")}
            />
            <button 
              type="submit" 
              disabled={isSubmitting || !text.trim()}
              className="brutal-button px-6 disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
