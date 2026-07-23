'use client'

import { Search, User, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConversationData } from './support-inbox'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'resolved', label: 'Done' },
  { key: 'mine', label: 'Mine' },
] as const

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  waiting_on_customer: 'bg-amber-100 text-amber-800 border-amber-300',
  resolved: 'bg-blue-100 text-blue-800 border-blue-300',
  closed: 'bg-muted text-muted-foreground border-border',
}

const PRIORITY_INDICATOR: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  normal: 'bg-transparent',
  low: 'bg-transparent',
}

const CHANNEL_EMOJI: Record<string, string> = {
  general: '💬',
  exchange: '💱',
  medical: '🏥',
  education: '🎓',
  ticket: '🎫',
  buy_for_me: '🛒',
  payment: '💳',
  support: '🛟',
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
interface ConversationListProps {
  conversations: ConversationData[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: string
  onFilterChange: (f: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  currentUserId: string
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: ConversationListProps) {
  return (
    <>
      {/* Filter Tabs */}
      <div className="p-2 border-b-2 border-border bg-accent/40 flex gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={cn(
              'px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border-2 border-border transition-all whitespace-nowrap cursor-pointer',
              filter === f.key
                ? 'bg-foreground text-background shadow-none'
                : 'bg-card hover:bg-accent'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border/50 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, email, subject..."
            className="w-full border-2 border-border bg-background pl-8 pr-3 py-1.5 text-xs font-bold placeholder:text-muted-foreground/50 placeholder:uppercase placeholder:tracking-widest focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Conversation Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="p-8 text-center">
            <Hash className="w-8 h-8 mx-auto mb-3 opacity-15" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No conversations found</p>
          </div>
        ) : (
          conversations.map(conv => {
            const isSelected = selectedId === conv.id
            const priorityDot = PRIORITY_INDICATOR[conv.priority] || ''
            const statusLabel = conv.status.replace(/_/g, ' ')

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full text-left p-3 border-b border-border/30 transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-accent/60 border-l-4 border-l-foreground'
                    : 'hover:bg-accent/30 border-l-4 border-l-transparent'
                )}
              >
                {/* Row 1: Customer Name + Time */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Priority dot */}
                    {priorityDot && priorityDot !== 'bg-transparent' && (
                      <span className={cn('w-2 h-2 rounded-full shrink-0', priorityDot)} />
                    )}
                    <div className="w-6 h-6 border border-border bg-muted flex items-center justify-center shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-sm truncate">{displayName(conv.customer)}</span>
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground shrink-0 pt-0.5">
                    {formatRelativeTime(conv.last_message_at)}
                  </span>
                </div>

                {/* Row 2: Subject */}
                <p className="text-xs font-medium opacity-60 truncate pl-8 mb-1.5">
                  {conv.subject || `Ticket #${conv.id.substring(0, 8)}`}
                </p>

                {/* Row 3: Badges */}
                <div className="flex items-center gap-1.5 pl-8">
                  {/* Channel */}
                  <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-muted border border-border/50">
                    {CHANNEL_EMOJI[conv.channel] || '💬'} {conv.channel}
                  </span>
                  {/* Status */}
                  <span className={cn(
                    'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 border',
                    STATUS_COLORS[conv.status] || STATUS_COLORS.closed
                  )}>
                    {statusLabel}
                  </span>
                  {/* Priority (only if elevated) */}
                  {(conv.priority === 'high' || conv.priority === 'urgent') && (
                    <span className={cn(
                      'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 border',
                      conv.priority === 'urgent'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-orange-100 text-orange-800 border-orange-300'
                    )}>
                      {conv.priority}
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </>
  )
}
