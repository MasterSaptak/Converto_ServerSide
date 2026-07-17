import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { MessageSquare, User, Clock, AlertCircle } from 'lucide-react'
import ChatInterface from './components/chat-interface'
import { format } from 'date-fns'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string, filter?: string }>
}) {
  const { id, filter = 'all' } = await searchParams;
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch conversations
  let query = supabase
    .from('conversations')
    .select(`
      *,
      profile:profiles(full_name, email),
      staff:staff(role_id)
    `)
    .order('last_message_at', { ascending: false })

  if (filter === 'assigned') {
    query = query.eq('assigned_staff_id', user.id)
  } else if (filter === 'open') {
    query = query.eq('status', 'open')
  }

  const { data: conversations } = await query

  // Fetch active conversation messages
  let messages: any[] = []
  if (id) {
    const { data: fetchedMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
    
    if (fetchedMessages) {
      messages = fetchedMessages
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase flex items-center gap-3">
            <MessageSquare className="w-8 h-8" />
            Support Inbox
          </h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Manage Customer Inquiries and Order Issues</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden border-4 border-black bg-slate-100">
        {/* Left Sidebar - Conversations List */}
        <div className="w-1/3 min-w-[300px] border-r-4 border-black flex flex-col bg-white">
          <div className="p-4 border-b-4 border-black bg-accent flex gap-2 overflow-x-auto custom-scrollbar">
            <Link 
              href="/messages?filter=open" 
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black ${filter === 'open' ? 'bg-black text-white' : 'bg-white hover:bg-slate-100'}`}
            >
              Open
            </Link>
            <Link 
              href="/messages?filter=assigned" 
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black ${filter === 'assigned' ? 'bg-black text-white' : 'bg-white hover:bg-slate-100'}`}
            >
              My Tickets
            </Link>
            <Link 
              href="/messages?filter=all" 
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black ${filter === 'all' ? 'bg-black text-white' : 'bg-white hover:bg-slate-100'}`}
            >
              All
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {(!conversations || conversations.length === 0) ? (
              <div className="p-8 text-center opacity-50">
                <p className="text-xs font-bold uppercase tracking-widest">No conversations found</p>
              </div>
            ) : (
              conversations.map((conv: any) => (
                <Link
                  key={conv.id}
                  href={`/messages?id=${conv.id}&filter=${filter}`}
                  className={`block p-4 border-b-2 border-black/10 hover:bg-slate-50 transition-colors ${id === conv.id ? 'bg-accent/20 border-l-4 border-l-black' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold truncate text-sm">{conv.profile?.full_name || 'Unknown User'}</span>
                    <span className="text-[10px] font-bold opacity-50">{format(new Date(conv.last_message_at), 'MMM d, HH:mm')}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs font-medium opacity-70 truncate pr-4">
                      {conv.subject || `Ticket #${conv.id.substring(0,8)}`}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 border border-black ${conv.status === 'open' ? 'bg-green-100' : 'bg-slate-200'}`}>
                      {conv.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Area - Chat Interface */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
          {!id ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-16 h-16 opacity-10 mb-4" />
              <p className="font-black uppercase tracking-widest text-lg opacity-40">Select a conversation</p>
              <p className="font-bold text-xs opacity-40 mt-2">Choose a ticket from the left sidebar to view messages and reply.</p>
            </div>
          ) : (
            <ChatInterface 
              conversationId={id} 
              messages={messages} 
              currentUserId={user.id} 
            />
          )}
        </div>
      </div>
    </div>
  )
}
