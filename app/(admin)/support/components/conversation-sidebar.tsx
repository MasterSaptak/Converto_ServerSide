'use client'

import { useState } from 'react'
import { User, Clock, Tag, Flag, ArrowUpRight, Globe, Mail, Phone, MapPin, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { updateConversationStatus, updateConversationPriority } from '../actions'
import type { ConversationData } from './support-inbox'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'open', label: 'Open', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'waiting_on_customer', label: 'Waiting', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'resolved', label: 'Resolved', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'closed', label: 'Closed', color: 'bg-muted text-muted-foreground border-border' },
] as const

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
  { value: 'normal', label: 'Normal', color: 'bg-card text-foreground' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
] as const

const CHANNEL_LABELS: Record<string, { emoji: string; label: string }> = {
  general: { emoji: '💬', label: 'General' },
  exchange: { emoji: '💱', label: 'Currency Exchange' },
  medical: { emoji: '🏥', label: 'Medical' },
  education: { emoji: '🎓', label: 'Education' },
  ticket: { emoji: '🎫', label: 'Ticket' },
  buy_for_me: { emoji: '🛒', label: 'Buy For Me' },
  payment: { emoji: '💳', label: 'Payment' },
  support: { emoji: '🛟', label: 'Support' },
}

function displayName(customer: ConversationData['customer']): string {
  if (!customer) return 'Unknown'
  const name = customer.full_name
  if (name && name !== 'EMPTY' && name !== 'NULL') return name
  if (customer.email) return customer.email.split('@')[0]
  return 'Unknown'
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface ConversationSidebarProps {
  conversation: ConversationData
  onConversationUpdated: (fields: Partial<ConversationData>) => void
}

export function ConversationSidebar({ conversation, onConversationUpdated }: ConversationSidebarProps) {
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingPriority, setUpdatingPriority] = useState(false)

  const channel = CHANNEL_LABELS[conversation.channel] || CHANNEL_LABELS.general

  async function handleStatusChange(status: string) {
    setUpdatingStatus(true)
    try {
      await updateConversationStatus(conversation.id, status as any)
      onConversationUpdated({ status })
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handlePriorityChange(priority: string) {
    setUpdatingPriority(true)
    try {
      await updateConversationPriority(conversation.id, priority as any)
      onConversationUpdated({ priority })
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingPriority(false)
    }
  }

  return (
    <div className="flex flex-col">
      {/* ── Customer Profile Card ────────────────────────────────────────── */}
      <div className="p-4 border-b-2 border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 border-2 border-border bg-accent flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-black uppercase text-sm truncate">{displayName(conversation.customer)}</h4>
            <p className="text-[10px] font-bold text-muted-foreground truncate">{conversation.customer?.email || 'No email'}</p>
          </div>
        </div>

        {/* Contact details */}
        <div className="space-y-1.5">
          {conversation.customer?.phone && (
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Phone className="w-3 h-3 shrink-0" />
              <span className="truncate">{conversation.customer.phone}</span>
            </div>
          )}
          {conversation.customer?.country && (
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{conversation.customer.country}</span>
            </div>
          )}
        </div>

        {/* Link to CRM profile */}
        {conversation.customer?.id && (
          <Link
            href={`/customers/${conversation.customer.id}`}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 border-2 border-border bg-card text-xs font-black uppercase tracking-widest hover:bg-accent transition-colors w-full justify-center"
          >
            <ArrowUpRight className="w-3 h-3" />
            View Full Profile
          </Link>
        )}
      </div>

      {/* ── Conversation Meta ────────────────────────────────────────────── */}
      <div className="p-4 border-b-2 border-border space-y-3">
        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Conversation</h5>

        {/* Channel */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Channel</span>
          <span className="text-xs font-bold flex items-center gap-1.5 px-2 py-0.5 bg-muted border border-border/50">
            {channel.emoji} {channel.label}
          </span>
        </div>

        {/* Created */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Created</span>
          <span className="text-xs font-bold text-muted-foreground">
            {format(new Date(conversation.created_at), 'MMM d, HH:mm')}
          </span>
        </div>

        {/* Resolved */}
        {conversation.resolved_at && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Resolved</span>
            <span className="text-xs font-bold text-muted-foreground">
              {format(new Date(conversation.resolved_at), 'MMM d, HH:mm')}
            </span>
          </div>
        )}

        {/* Ticket ID (truncated) */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Ticket ID</span>
          <span className="text-[10px] font-mono font-bold text-muted-foreground">
            {conversation.id.substring(0, 12)}…
          </span>
        </div>

        {/* Related service request */}
        {conversation.related_request_id && (
          <Link
            href={`/orders/${conversation.related_request_id}`}
            className="flex items-center gap-2 px-3 py-1.5 border-2 border-border bg-accent text-xs font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors w-full justify-center"
          >
            <ArrowUpRight className="w-3 h-3" />
            View Related Order
          </Link>
        )}
      </div>

      {/* ── Status Control ───────────────────────────────────────────────── */}
      <div className="p-4 border-b-2 border-border">
        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3" />
          Status
        </h5>
        <div className="grid grid-cols-2 gap-1.5">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              disabled={updatingStatus || conversation.status === s.value}
              className={cn(
                'px-2 py-1.5 text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer',
                'disabled:cursor-default',
                conversation.status === s.value
                  ? cn(s.color, 'border-foreground shadow-[2px_2px_0px_0px_var(--color-border)]')
                  : 'border-border/50 bg-card hover:bg-accent opacity-60 hover:opacity-100'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Priority Control ─────────────────────────────────────────────── */}
      <div className="p-4 border-b-2 border-border">
        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
          <Flag className="w-3 h-3" />
          Priority
        </h5>
        <div className="grid grid-cols-2 gap-1.5">
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              onClick={() => handlePriorityChange(p.value)}
              disabled={updatingPriority || conversation.priority === p.value}
              className={cn(
                'px-2 py-1.5 text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer',
                'disabled:cursor-default',
                conversation.priority === p.value
                  ? cn(p.color, 'border-foreground shadow-[2px_2px_0px_0px_var(--color-border)]')
                  : 'border-border/50 bg-card hover:bg-accent opacity-60 hover:opacity-100'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SLA Timers ───────────────────────────────────────────────────── */}
      {(conversation.first_response_due || conversation.next_response_due) && (
        <div className="p-4 border-b-2 border-border">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            SLA Timers
          </h5>
          <div className="space-y-2">
            {conversation.first_response_due && (
              <div className="flex items-center justify-between p-2 border border-border/50 bg-muted/50">
                <span className="text-[10px] font-bold uppercase opacity-60">First Response</span>
                <span className={cn(
                  'text-xs font-bold',
                  new Date(conversation.first_response_due) < new Date()
                    ? 'text-red-600'
                    : 'text-muted-foreground'
                )}>
                  {format(new Date(conversation.first_response_due), 'MMM d, HH:mm')}
                </span>
              </div>
            )}
            {conversation.next_response_due && (
              <div className="flex items-center justify-between p-2 border border-border/50 bg-muted/50">
                <span className="text-[10px] font-bold uppercase opacity-60">Next Response</span>
                <span className={cn(
                  'text-xs font-bold',
                  new Date(conversation.next_response_due) < new Date()
                    ? 'text-red-600'
                    : 'text-muted-foreground'
                )}>
                  {format(new Date(conversation.next_response_due), 'MMM d, HH:mm')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Assigned Staff ───────────────────────────────────────────────── */}
      {conversation.staff_participants.length > 0 && (
        <div className="p-4">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Assigned Staff
          </h5>
          <div className="space-y-1.5">
            {conversation.staff_participants.map((sp: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 border border-border/30 bg-muted/30">
                <div className="w-6 h-6 border border-border bg-accent flex items-center justify-center shrink-0">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold truncate">
                  {sp.profile?.full_name || sp.profile?.email || 'Staff'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
