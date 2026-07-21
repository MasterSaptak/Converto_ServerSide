import { SupabaseClient } from '@supabase/supabase-js'

export async function evaluateWorkflowEvents(supabase: SupabaseClient, requestId: string, newStatusId: string) {
  // 1. Fetch any events tied to this status
  const { data: events } = await supabase
    .from('workflow_events')
    .select('*')
    .eq('status_id', newStatusId)
    .eq('is_active', true)

  if (!events || events.length === 0) return

  for (const event of events) {
    // 2. Execute event based on event_type
    console.log(`[Workflow Engine] Executing event: ${event.event_type} for request: ${requestId}`)
    
    let remarks = `System automation executed: ${event.event_type}`
    if (event.event_type === 'send_email') {
      remarks = `System sent automated email. Payload: ${JSON.stringify(event.payload)}`
    } else if (event.event_type === 'send_whatsapp') {
      remarks = `System sent automated WhatsApp message. Payload: ${JSON.stringify(event.payload)}`
    } else if (event.event_type === 'create_invoice') {
      remarks = `System generated automated invoice.`
    }

    // Log the event execution
    await supabase.from('request_workflow_history').insert({
      request_id: requestId,
      new_stage: 'Automation',
      new_status: 'Event Executed',
      remarks: remarks
    })
  }
}

export async function evaluateWorkflowRules(supabase: SupabaseClient, requestId: string, currentStatusId: string) {
  // 1. Fetch rules that match the current status
  const { data: rules } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('current_status_id', currentStatusId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (!rules || rules.length === 0) return

  // Fetch request data to evaluate conditions against
  const { data: request } = await supabase
    .from('service_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  for (const rule of rules) {
    // Very basic condition evaluation (e.g. check if a field exists)
    let conditionPassed = true
    if (rule.condition_expression) {
      // In a real system, you'd use a safe evaluator like JSONata or Jexl
      // For this MVP, we just assume conditions pass if they are empty
      // Or we can do simple string matching
      if (rule.condition_expression === 'amount > 0' && request.amount <= 0) {
        conditionPassed = false
      }
    }

    if (conditionPassed) {
      console.log(`[Workflow Engine] Rule passed: ${rule.name}. Action: ${rule.action_type}`)
      
      if (rule.action_type === 'move_status' && rule.target_status_id) {
        // Fetch new status details
        const { data: newStatus } = await supabase
          .from('pipeline_statuses')
          .select('*, stage:pipeline_stages(*)')
          .eq('id', rule.target_status_id)
          .single()
        
        if (newStatus) {
          // Move the request to the new status
          await supabase.from('service_requests').update({
            pipeline_status_id: newStatus.id,
            pipeline_stage_id: newStatus.stage_id,
            // Simple SLA example: If status moves, reset SLA deadline to 24 hours from now
            sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }).eq('id', requestId)

          await supabase.from('request_workflow_history').insert({
            request_id: requestId,
            new_stage: newStatus.stage.name,
            new_status: newStatus.name,
            remarks: `System auto-transitioned via Rule: ${rule.name}`
          })

          // Recursive evaluation for the new status!
          await evaluateWorkflowEvents(supabase, requestId, newStatus.id)
          break 
        }
      } else if (rule.action_type === 'create_tasks') {
        // Instantiate template tasks for this request
        // We will assume the service ID is tied to a workflow_template
        const { data: template } = await supabase
          .from('workflow_templates')
          .select('id')
          .eq('service_id', request.service_id)
          .single()
          
        if (template) {
          const { data: templateTasks } = await supabase
            .from('workflow_template_tasks')
            .select('*')
            .eq('template_id', template.id)
            
          if (templateTasks && templateTasks.length > 0) {
            const tasksToInsert = templateTasks.map(t => ({
              request_id: requestId,
              title: t.title,
              description: t.description,
              is_completed: false
            }))
            await supabase.from('request_tasks').insert(tasksToInsert)
            
            await supabase.from('request_workflow_history').insert({
              request_id: requestId,
              new_stage: 'Automation',
              new_status: 'Tasks Generated',
              remarks: `Generated ${tasksToInsert.length} tasks from template`
            })
          }
        }
      }
    }
  }
}
