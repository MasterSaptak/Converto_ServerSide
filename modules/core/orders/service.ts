// =====================================================
// CONVERTO PLATFORM — Core Order Engine
// =====================================================

import { createClient } from '@/lib/supabase/server'
import type { ServiceRequest } from '@/types/database'
import { getInitialStep, validateTransition } from '../workflows/service'
import type { CreateOrderInput, UpdateOrderInput, OrderFilters, PaginatedResult } from './types'
import { createOrderSchema, updateOrderSchema, orderFiltersSchema } from './validation'

export class OrderService {
  /**
   * Create a new order (Service Request).
   * Automatically sets the initial status based on the workflow.
   */
  static async createOrder(input: CreateOrderInput, customerId: string): Promise<ServiceRequest> {
    const validatedData = createOrderSchema.parse(input)
    const supabase = await createClient()

    // 1. Get initial status for the service workflow
    const initialStep = await getInitialStep(validatedData.service_id)
    if (!initialStep) {
      throw new Error('No workflow defined for this service.')
    }

    // 2. Insert the order
    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        profile_id: customerId,
        service_id: validatedData.service_id,
        status: initialStep.step_key,
        priority: 'Normal', // Default priority
        metadata: validatedData.metadata,
        notes: validatedData.notes,
        amount: validatedData.amount,
        currency: validatedData.currency,
        subtotal: validatedData.subtotal,
        service_fee: validatedData.service_fee,
        exchange_fee: validatedData.exchange_fee,
        discount: validatedData.discount,
        tax: validatedData.tax,
        gateway_fee: validatedData.gateway_fee,
        total: validatedData.total,
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to create order: ${error.message}`)
    return data as ServiceRequest
  }

  /**
   * Update an order. If status is changing, validates against the state machine.
   */
  static async updateOrder(orderId: string, input: UpdateOrderInput): Promise<ServiceRequest> {
    const validatedData = updateOrderSchema.parse(input)
    const supabase = await createClient()

    // 1. Fetch current order to check status
    const { data: currentOrder, error: fetchError } = await supabase
      .from('service_requests')
      .select('service_id, status')
      .eq('id', orderId)
      .single()

    if (fetchError || !currentOrder) {
      throw new Error(`Order not found: ${fetchError?.message}`)
    }

    // 2. If status is changing, validate transition
    if (validatedData.status && validatedData.status !== currentOrder.status) {
      const transitionResult = await validateTransition(
        currentOrder.service_id,
        currentOrder.status,
        validatedData.status
      )

      if (!transitionResult.valid) {
        throw new Error(`Invalid status transition: ${transitionResult.error}`)
      }
    }

    // 3. Perform update (Supabase trigger handles the order_status_history and order_events)
    // Extract transition_remarks so it doesn't try to save to the main table
    const { transition_remarks, ...updatePayload } = validatedData;
    
    // We would ideally want to pass transition_remarks to the trigger, but for now 
    // we'll let the trigger auto-generate the event, and we can add a manual event if needed.

    const { data: updatedOrder, error: updateError } = await supabase
      .from('service_requests')
      .update(updatePayload)
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateError) throw new Error(`Failed to update order: ${updateError.message}`)
    
    // 4. Optionally log a manual event with the remarks if provided
    if (transition_remarks && validatedData.status && validatedData.status !== currentOrder.status) {
        await supabase.from('order_events').insert({
            order_id: orderId,
            event: `Status changed with remarks: ${transition_remarks}`,
            actor_type: 'staff',
            is_customer_visible: true
        })
    }
    
    return updatedOrder as ServiceRequest
  }

  /**
   * Get paginated and filtered orders
   */
  static async getOrders(filters: OrderFilters): Promise<PaginatedResult<ServiceRequest>> {
    const validatedFilters = orderFiltersSchema.parse(filters)
    const supabase = await createClient()
    
    let query = supabase
      .from('service_requests')
      .select('*, profile:profiles(*), service:services(*)', { count: 'exact' })

    if (validatedFilters.service_id) {
      query = query.eq('service_id', validatedFilters.service_id)
    }
    if (validatedFilters.status) {
      query = query.eq('status', validatedFilters.status)
    }
    if (validatedFilters.priority) {
      query = query.eq('priority', validatedFilters.priority)
    }
    if (validatedFilters.customer_id) {
      query = query.eq('profile_id', validatedFilters.customer_id)
    }
    if (validatedFilters.assigned_staff_id) {
      query = query.eq('assigned_staff_id', validatedFilters.assigned_staff_id)
    }

    // Pagination
    const from = (validatedFilters.page - 1) * validatedFilters.per_page
    const to = from + validatedFilters.per_page - 1
    
    query = query.range(from, to).order(validatedFilters.sort_by, { 
      ascending: validatedFilters.sort_order === 'asc' 
    })

    const { data, count, error } = await query

    if (error) throw new Error(`Failed to fetch orders: ${error.message}`)

    const total = count || 0
    return {
      data: data as unknown as ServiceRequest[],
      total,
      page: validatedFilters.page,
      per_page: validatedFilters.per_page,
      total_pages: Math.ceil(total / validatedFilters.per_page)
    }
  }

  /**
   * Get a single order with full relations
   */
  static async getOrder(orderId: string): Promise<ServiceRequest> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        *,
        profile:profiles(*),
        service:services(*),
        assigned_staff:staff(*),
        quote:quotes(*),
        assignments:order_assignments(*, staff:staff(*)),
        status_history:order_status_history(*, changed_by_profile:profiles(*)),
        events:order_events(*, actor_profile:profiles(*)),
        documents:documents(*, document_type:document_types(*))
      `)
      .eq('id', orderId)
      .single()

    if (error || !data) throw new Error(`Failed to fetch order: ${error?.message}`)
    return data as unknown as ServiceRequest
  }
}
