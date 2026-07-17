import { SupabaseClient } from '@supabase/supabase-js'
import { OrderService } from '../core/orders/service'
import type { CreateEducationPaymentDTO, EducationPaymentMetadata } from './types'

export class EducationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Initializes a new Education Payment request
   */
  async createRequest(profileId: string, data: CreateEducationPaymentDTO) {
    const { data: service, error: serviceError } = await this.supabase
      .from('services')
      .select('id')
      .eq('code', 'education')
      .single()

    if (serviceError || !service) {
      throw new Error('Education service not found')
    }

    const metadata: EducationPaymentMetadata = {
      institution_name: data.institutionName,
      country: data.country,
      student_name: data.studentName,
      student_id: data.studentId,
      payment_purpose: data.paymentPurpose,
      requested_currency: data.currency,
      requested_amount: data.amountToPay,
      payment_deadline: data.paymentDeadline,
      additional_notes: data.additionalNotes
    }

    let summaryText = `Education: ${data.institutionName} | ${data.studentId}`

    return await OrderService.createOrder({
      service_id: service.id,
      metadata: metadata as Record<string, any>,
      amount: 0,
      currency: data.currency,
      notes: summaryText
    }, profileId)
  }

  /**
   * Admin function: Attach a quote to an education request
   */
  async attachQuote(orderId: string, basePrice: number, tax: number, serviceFee: number, currency: string = 'USD') {
    const { data: order, error: orderError } = await this.supabase
      .from('service_requests')
      .select('metadata')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    const currentMetadata = order.metadata as unknown as EducationPaymentMetadata
    const totalFee = basePrice + tax + serviceFee

    const updatedMetadata: EducationPaymentMetadata = {
      ...currentMetadata,
      base_price: basePrice,
      tax: tax,
      service_fee: serviceFee,
      total_fee: totalFee,
      quote_currency: currency
    }

    const { error: updateError } = await this.supabase
      .from('service_requests')
      .update({
        metadata: updatedMetadata as any,
        amount: basePrice,
        tax: tax,
        service_fee: serviceFee,
        total: totalFee,
        currency,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      throw new Error(`Failed to update quote: ${updateError.message}`)
    }

    return true
  }
}
