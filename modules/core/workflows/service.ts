// =====================================================
// CONVERTO PLATFORM — Core Workflow Engine (State Machine)
// =====================================================
// Validates status transitions against the database-defined
// workflow for each service. No hardcoded status transitions.
// =====================================================

import { createClient } from '@/lib/supabase/server'
import type { ServiceWorkflow } from '@/types/database'
import type { WorkflowValidationResult, WorkflowStep } from './types'

/**
 * Fetch the complete workflow (all steps) for a given service.
 */
export async function getServiceWorkflow(serviceId: string): Promise<WorkflowStep[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_workflows')
    .select('*')
    .eq('service_id', serviceId)
    .order('step_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch workflow: ${error.message}`)
  return (data as ServiceWorkflow[]).map(row => ({
    step_key: row.step_key,
    step_name: row.step_name,
    step_order: row.step_order,
    color: row.color,
    icon: row.icon,
    is_initial: row.is_initial,
    is_final: row.is_final,
    can_customer_view: row.can_customer_view,
    requires_staff: row.requires_staff,
    requires_documents: row.requires_documents,
    allowed_next_steps: row.allowed_next_steps,
  }))
}

/**
 * Get the initial step for a service workflow.
 */
export async function getInitialStep(serviceId: string): Promise<WorkflowStep | null> {
  const steps = await getServiceWorkflow(serviceId)
  return steps.find(s => s.is_initial) ?? steps[0] ?? null
}

/**
 * Validate whether a status transition is allowed by the workflow.
 * This is the core of the state machine.
 */
export async function validateTransition(
  serviceId: string,
  currentStatus: string,
  newStatus: string
): Promise<WorkflowValidationResult> {
  const steps = await getServiceWorkflow(serviceId)
  
  if (steps.length === 0) {
    // No workflow defined — allow any transition (backwards compat)
    return { valid: true }
  }

  const currentStep = steps.find(s => s.step_key === currentStatus)
  const nextStep = steps.find(s => s.step_key === newStatus)

  if (!currentStep) {
    return {
      valid: false,
      error: `Current status "${currentStatus}" is not a valid workflow step for this service.`,
    }
  }

  if (!nextStep) {
    return {
      valid: false,
      error: `Target status "${newStatus}" is not a valid workflow step for this service.`,
    }
  }

  if (currentStep.is_final) {
    return {
      valid: false,
      error: `Cannot transition from final status "${currentStep.step_name}".`,
      current_step: currentStep,
    }
  }

  if (!currentStep.allowed_next_steps.includes(newStatus)) {
    return {
      valid: false,
      error: `Transition from "${currentStep.step_name}" to "${nextStep.step_name}" is not allowed. Allowed transitions: ${currentStep.allowed_next_steps.join(', ')}`,
      current_step: currentStep,
      next_step: nextStep,
    }
  }

  return {
    valid: true,
    current_step: currentStep,
    next_step: nextStep,
  }
}

/**
 * Get all allowed next statuses from a given status for a service.
 */
export async function getAllowedTransitions(
  serviceId: string,
  currentStatus: string
): Promise<WorkflowStep[]> {
  const steps = await getServiceWorkflow(serviceId)
  const currentStep = steps.find(s => s.step_key === currentStatus)
  
  if (!currentStep) return []

  return steps.filter(s => currentStep.allowed_next_steps.includes(s.step_key))
}

/**
 * Get the customer-visible workflow steps for tracking display.
 */
export async function getCustomerVisibleWorkflow(serviceId: string): Promise<WorkflowStep[]> {
  const steps = await getServiceWorkflow(serviceId)
  return steps.filter(s => s.can_customer_view)
}
