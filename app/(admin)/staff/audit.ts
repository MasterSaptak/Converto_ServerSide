import { SupabaseClient } from '@supabase/supabase-js'

export async function logAudit(
  supabase: SupabaseClient,
  payload: {
    action: string,
    actor_id: string,
    target_staff_id?: string,
    entity_type: string,
    entity_id: string,
    old_data?: any,
    new_data?: any,
    ip_address?: string,
    user_agent?: string,
  }
) {
  try {
    await supabase.from('audit_logs').insert({
      staff_id: payload.actor_id, // Backward compatibility with existing structure
      actor_id: payload.actor_id,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      old_data: payload.old_data,
      new_data: payload.new_data,
      ip_address: payload.ip_address,
      user_agent: payload.user_agent,
    })
  } catch (error) {
    console.error("Failed to insert audit log:", error)
  }
}
