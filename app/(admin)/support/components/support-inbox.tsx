'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ConversationList } from './conversation-list'
import { ChatPanel } from './chat-panel'
import { ConversationSidebar } from './conversation-sidebar'
import { deleteConversation } from '../actions'

// ─────────────────────────────────────────────────────────────────────────────
// Shared Types
// ─────────────────────────────────────────────────────────────────────────────
export type ConversationData = {
  id: string
  subject: string | null
  channel: string
  status: string
  priority: string
  related_request_id: string | null
  last_message_id: string | null
  last_message_at: string | null
  first_response_due: string | null
  next_response_due: string | null
  resolved_at: string | null
  ai_summary: string | null
  created_at: string
  updated_at: string
  customer: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    phone: string | null
    country: string | null
  } | null
  customer_participant: any
  staff_participants: any[]
  my_participation: any
}

export type MessageData = {
  id: string
  conversation_id: string
  sender_id: string | null
  sender_type: string
  visibility: string
  text: string
  reply_to_id: string | null
  is_deleted: boolean
  created_at: string
  avatar_url?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface SupportInboxProps {
  initialConversations: ConversationData[]
  currentUserId: string
}

export function SupportInbox({ initialConversations, currentUserId }: SupportInboxProps) {
  const [conversations, setConversations] = useState<ConversationData[]>(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const selectedConversation = conversations.find(c => c.id === selectedId) || null

  // ── Sync URL ?id= with selectedId or default to first conversation ──
  useEffect(() => {
    const urlId = searchParams.get('id')
    if (urlId && conversations.some(c => c.id === urlId)) {
      if (selectedId !== urlId) {
        setSelectedId(urlId)
      }
    } else if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id)
    }
  }, [searchParams, conversations, selectedId])

  // ── Fetch messages for selected conversation ────────────────────────────
  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      const { data } = await supabase
        .from('communication_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((m: any) => m.sender_id).filter(Boolean))];
        let avatarMap: Record<string, string> = {};
        
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, avatar_url').in('id', senderIds);
          avatarMap = (profiles || []).reduce((acc: any, p: any) => {
            if (p.avatar_url) acc[p.id] = p.avatar_url;
            return acc;
          }, {});
        }

        const enrichedMessages = data.map((m: any) => ({
          ...m,
          avatar_url: m.sender_id ? (avatarMap[m.sender_id] || null) : null
        }));
        
        setMessages(enrichedMessages);
      } else {
        setMessages([]);
      }
    } finally {
      setLoadingMessages(false)
    }
  }, [supabase])

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId)
    } else {
      setMessages([])
    }
  }, [selectedId, fetchMessages])

  // ── Realtime: new messages in selected conversation ─────────────────────
  useEffect(() => {
    if (!selectedId) return

    const channel = supabase
      .channel(`support-msgs-${selectedId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'communication_messages',
        filter: `conversation_id=eq.${selectedId}`,
      }, async (payload: any) => {
        const newMsg = payload.new as MessageData;
        let avatarUrl = null;
        if (newMsg.sender_id) {
          const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', newMsg.sender_id).maybeSingle();
          if (profile?.avatar_url) avatarUrl = profile.avatar_url;
        }

        setMessages(prev => {
          // Deduplicate (in case we already have it from our own insert)
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, { ...newMsg, avatar_url: avatarUrl }]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedId, supabase])

  // ── Realtime: conversation metadata updates ─────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('support-conv-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'communication_conversations',
      }, (payload: any) => {
        setConversations(prev =>
          prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
        )
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'communication_conversations',
      }, async (payload: any) => {
        // New conversation created (e.g. by a customer) — fetch participant & profile then prepend
        const newConv = payload.new as ConversationData
        
        let customerProfile = null
        let custPart = null
        try {
          const { data: partData } = await supabase
            .from('communication_participants')
            .select('*')
            .eq('conversation_id', newConv.id)
            .eq('user_type', 'customer')
            .maybeSingle()

          if (partData?.user_id) {
            custPart = partData
            const { data: profData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', partData.user_id)
              .maybeSingle()
            if (profData) customerProfile = profData
          }
        } catch (e) {
          console.error("Failed to enrich realtime conversation:", e)
        }

        const enrichedConv: ConversationData = {
          ...newConv,
          customer: customerProfile,
          customer_participant: custPart,
          staff_participants: [],
          my_participation: null
        }

        setConversations(prev => {
          if (prev.some(c => c.id === enrichedConv.id)) return prev
          return [enrichedConv, ...prev]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSelectConversation = (id: string) => {
    setSelectedId(id)
    router.replace(`/support?id=${id}`, { scroll: false })
  }

  const handleMessageSent = async (msg: MessageData) => {
    let myAvatar = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
      if (profile?.avatar_url) myAvatar = profile.avatar_url;
    }
    // Optimistic add — realtime will deduplicate
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev
      return [...prev, { ...msg, avatar_url: myAvatar }]
    })
  }

  const handleConversationUpdated = (updatedFields: Partial<ConversationData>) => {
    if (!selectedId) return
    setConversations(prev =>
      prev.map(c => c.id === selectedId ? { ...c, ...updatedFields } : c)
    )
  }

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chat conversation?')) return
    try {
      await deleteConversation(id)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  // ── Filter conversations ───────────────────────────────────────────────
  const filteredConversations = conversations.filter(conv => {
    if (filter === 'open' && conv.status !== 'open') return false
    if (filter === 'waiting' && conv.status !== 'waiting_on_customer') return false
    if (filter === 'resolved' && conv.status !== 'resolved' && conv.status !== 'closed') return false
    if (filter === 'mine' && !conv.my_participation) return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchSubject = conv.subject?.toLowerCase().includes(q)
      const matchCustomer = conv.customer?.full_name?.toLowerCase().includes(q)
        || conv.customer?.email?.toLowerCase().includes(q)
      const matchId = conv.id.toLowerCase().startsWith(q)
      if (!matchSubject && !matchCustomer && !matchId) return false
    }
    return true
  })

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col max-w-[1800px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
            <MessageSquare className="w-7 h-7" />
            Support Hub
          </h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-0.5">
            Real-Time Customer Communication Center
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-border bg-emerald-50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Live</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {filteredConversations.length} Tickets
          </span>
        </div>
      </div>

      {/* 3-Pane Layout */}
      <div className="flex flex-1 overflow-x-auto border-2 border-border bg-card custom-scrollbar">

        {/* LEFT — Conversation List */}
        <div className="w-[340px] min-w-[280px] border-r-2 border-border flex flex-col">
          <ConversationList
            conversations={filteredConversations}
            selectedId={selectedId}
            onSelect={handleSelectConversation}
            onDelete={handleDeleteConversation}
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentUserId={currentUserId}
          />
        </div>

        {/* CENTER — Chat Panel */}
        <div className="flex-1 flex flex-col min-w-[320px] bg-background">
          {selectedConversation ? (
            <ChatPanel
              conversation={selectedConversation}
              messages={messages}
              currentUserId={currentUserId}
              loading={loadingMessages}
              onMessageSent={handleMessageSent}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
              <div className="w-20 h-20 border-2 border-border bg-muted flex items-center justify-center mb-5 opacity-20">
                <MessageSquare className="w-10 h-10" />
              </div>
              <p className="font-black uppercase tracking-widest text-lg opacity-20">Select a Conversation</p>
              <p className="font-bold text-xs opacity-20 mt-2 max-w-xs">
                Choose a ticket from the left panel to view the message timeline and reply.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — Conversation Details Sidebar */}
        {selectedConversation && (
          <div className="w-[300px] min-w-[260px] border-l-2 border-border flex flex-col overflow-y-auto custom-scrollbar bg-card">
            <ConversationSidebar
              conversation={selectedConversation}
              onConversationUpdated={handleConversationUpdated}
              onDelete={handleDeleteConversation}
            />
          </div>
        )}
      </div>
    </div>
  )
}
