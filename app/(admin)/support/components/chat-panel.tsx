'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Lock, Eye, Bot, Loader2, ArrowDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { sendSupportMessage, markConversationRead } from '../actions'
import type { ConversationData, MessageData } from './support-inbox'

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface ChatPanelProps {
  conversation: ConversationData
  messages: MessageData[]
  currentUserId: string
  loading: boolean
  onMessageSent: (msg: MessageData) => void
}

export function ChatPanel({
  conversation,
  messages,
  currentUserId,
  loading,
  onMessageSent,
}: ChatPanelProps) {
  const [text, setText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark as read when opening a conversation
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      markConversationRead(conversation.id, lastMsg.id)
    }
  }, [conversation.id, messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || isSending) return

    setIsSending(true)
    try {
      const visibility = isInternal ? 'staff' : 'customer'
      const msg = await sendSupportMessage(conversation.id, text, visibility)
      setText('')
      onMessageSent({
        ...msg,
        conversation_id: conversation.id,
        sender_id: currentUserId,
        sender_type: 'staff',
        visibility: visibility,
        text: text,
      } as MessageData)
    } catch (err) {
      console.error('Failed to send:', err)
    } finally {
      setIsSending(false)
    }
  }

  // ── Classify a message ─────────────────────────────────────────────────
  function getMessageMeta(msg: MessageData) {
    const isOwn = msg.sender_id === currentUserId
    const isSystem = msg.sender_type === 'system'
    const isStaff = msg.sender_type === 'staff'
    const isInternalNote = msg.visibility === 'staff'

    let senderLabel = 'Customer'
    if (isSystem) senderLabel = 'System'
    else if (isStaff) senderLabel = isOwn ? 'You' : 'Staff'

    return { isOwn, isSystem, isStaff, isInternalNote, senderLabel }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Chat Header ──────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b-2 border-border bg-card flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="font-black uppercase text-sm truncate">
            {conversation.subject || `Ticket #${conversation.id.substring(0, 8)}`}
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
            {conversation.customer?.full_name || 'Unknown'} · {conversation.channel}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            'text-[8px] font-black uppercase px-2 py-0.5 border',
            conversation.status === 'open' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
            conversation.status === 'waiting_on_customer' ? 'bg-amber-100 text-amber-800 border-amber-300' :
            conversation.status === 'resolved' ? 'bg-blue-100 text-blue-800 border-blue-300' :
            'bg-muted text-muted-foreground border-border'
          )}>
            {conversation.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* ── Messages Feed ────────────────────────────────────────────────── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin opacity-30" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-30">
            <p className="text-[10px] font-black uppercase tracking-widest">No messages yet</p>
          </div>
        ) : (
          messages.map(msg => {
            const { isOwn, isSystem, isStaff, isInternalNote, senderLabel } = getMessageMeta(msg)

            // ── System event ──
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-muted border border-border/50 max-w-[80%]">
                    <Bot className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">
                      {msg.text}
                    </p>
                  </div>
                </div>
              )
            }

            // ── Internal note ──
            if (isInternalNote) {
              return (
                <div key={msg.id} className={cn('flex flex-col max-w-[75%]', isOwn ? 'ml-auto items-end' : 'mr-auto items-start')}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-700">{senderLabel} · Internal Note</span>
                    <span className="text-[9px] font-bold text-muted-foreground">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                  <div className="p-3 border-2 border-amber-400 bg-amber-50 w-full">
                    <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed text-amber-900">{msg.text}</p>
                  </div>
                </div>
              )
            }

            // ── Regular message (staff or customer) ──
            const avatarUrl = msg.avatar_url;

            return (
              <div key={msg.id} className={cn('flex gap-3 w-full', isStaff ? 'flex-row-reverse' : 'flex-row')}>
                <div className={cn(
                  'w-8 h-8 shrink-0 rounded-full border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--color-border)] overflow-hidden',
                  isStaff ? 'bg-foreground text-background' : 'bg-card'
                )}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={senderLabel} className="w-full h-full object-cover" />
                  ) : (
                    isStaff ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />
                  )}
                </div>
                <div className={cn('flex flex-col max-w-[75%]', isStaff ? 'items-end' : 'items-start')}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{senderLabel}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                    {msg.visibility === 'customer' && isStaff && (
                      <Eye className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className={cn(
                    'p-3 border-2 border-border shadow-[2px_2px_0px_0px_var(--color-border)]',
                    isStaff
                      ? 'bg-foreground text-background'
                      : 'bg-card'
                  )}>
                    <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ───────────────────────────────────────────────────── */}
      <div className="shrink-0 p-3 bg-card border-t-2 border-border">
        {/* Internal note toggle */}
        <div className="flex items-center gap-3 mb-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="w-3.5 h-3.5 border-2 border-border rounded-none accent-amber-500 cursor-pointer"
            />
            <span className={cn(
              'text-[10px] font-black uppercase tracking-widest flex items-center gap-1',
              isInternal ? 'text-amber-700' : 'text-muted-foreground'
            )}>
              <Lock className="w-3 h-3" />
              Internal Note
            </span>
          </label>
          {isInternal && (
            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
              Hidden from customer
            </span>
          )}
        </div>

        {/* Message input */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isInternal ? 'Write an internal note...' : 'Type your reply to the customer...'}
            className={cn(
              'flex-1 border-2 border-border px-3 py-2 text-sm font-bold',
              'placeholder:text-muted-foreground/40 placeholder:uppercase placeholder:tracking-widest placeholder:text-xs',
              'focus:outline-none focus:ring-1 focus:ring-foreground',
              isInternal && 'bg-amber-50 border-amber-400'
            )}
          />
          <button
            type="submit"
            disabled={isSending || !text.trim()}
            className={cn(
              'px-5 border-2 border-border font-black uppercase tracking-widest text-xs flex items-center gap-2',
              'shadow-[3px_3px_0px_0px_var(--color-border)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]',
              'transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
              isInternal
                ? 'bg-amber-400 text-amber-950 border-amber-600'
                : 'bg-foreground text-background'
            )}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
