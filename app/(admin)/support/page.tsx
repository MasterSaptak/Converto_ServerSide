import { createClient } from '@/lib/supabase/server'
import { SupportInbox } from './components/support-inbox'

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Fetch all non-deleted conversations
  const { data: conversations } = await supabase
    .from('communication_conversations')
    .select('*')
    .eq('is_deleted', false)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  // 2. Fetch participants for all conversations
  const conversationIds = (conversations || []).map((c: any) => c.id)
  let participants: any[] = []
  if (conversationIds.length > 0) {
    const { data } = await supabase
      .from('communication_participants')
      .select('*')
      .in('conversation_id', conversationIds)
    participants = data || []
  }

  // 3. Fetch profiles for all unique participant user IDs
  const userIds = [...new Set(participants.map((p: any) => p.user_id))]
  let profiles: any[] = []
  if (userIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, phone, country')
      .in('id', userIds)
    profiles = data || []
  }

  // 4. Enrich conversations with participant and profile data
  const enrichedConversations = (conversations || []).map((conv: any) => {
    const convParticipants = participants.filter((p: any) => p.conversation_id === conv.id)
    const customerParticipant = convParticipants.find((p: any) => p.user_type === 'customer')
    const customerProfile = customerParticipant
      ? profiles.find((p: any) => p.id === customerParticipant.user_id)
      : null
    const myParticipation = convParticipants.find((p: any) => p.user_id === user.id)

    return {
      ...conv,
      customer: customerProfile || null,
      customer_participant: customerParticipant || null,
      staff_participants: convParticipants
        .filter((p: any) => p.user_type === 'staff')
        .map((sp: any) => ({
          ...sp,
          profile: profiles.find((p: any) => p.id === sp.user_id) || null,
        })),
      my_participation: myParticipation || null,
    }
  })

  return (
    <SupportInbox
      initialConversations={enrichedConversations}
      currentUserId={user.id}
    />
  )
}
