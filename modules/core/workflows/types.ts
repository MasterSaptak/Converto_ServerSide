// =====================================================
// CONVERTO PLATFORM — Core Workflow Types
// =====================================================

export interface WorkflowStep {
  step_key: string;
  step_name: string;
  step_order: number;
  color: string;
  icon: string | null;
  is_initial: boolean;
  is_final: boolean;
  can_customer_view: boolean;
  requires_staff: boolean;
  requires_documents: boolean;
  allowed_next_steps: string[];
}

export interface WorkflowTransition {
  from_status: string;
  to_status: string;
  actor: string;
  remarks?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  error?: string;
  current_step?: WorkflowStep;
  next_step?: WorkflowStep;
}
