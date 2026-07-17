import { SupabaseClient } from '@supabase/supabase-js'
import { OrderService } from '../core/orders/service'
import type { CreateGlobalPaymentDTO, GlobalPaymentMetadata } from './types'

export class GlobalPaymentsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Initializes a new Global Payment request
   */
  async createRequest(profileId: string, data: CreateGlobalPaymentDTO) {
    const { data: service, error: serviceError } = await this.supabase
      .from('services')
      .select('id')
      .eq('code', 'global_payments')
      .single()

    if (serviceError || !service) {
      throw new Error('Global Payments service not found')
    }

    const metadata: GlobalPaymentMetadata = {
      recipient_name: data.recipientName,
      country: data.country,
      bank_name: data.bankName,
      account_number: data.accountNumber,
      swift_code: data.swiftCode,
      requested_currency: data.transferCurrency,
      requested_amount: data.amountToTransfer,
      purpose_of_transfer: data.purposeOfTransfer,
      payment_reference: data.paymentReference
    }

    let summaryText = `Global Payment: ${data.recipientName} | ${data.bankName}`

    return await OrderService.createOrder({
      service_id: service.id,
      metadata: metadata as Record<string, any>,
      amount: 0,
      currency: data.transferCurrency,
      notes: summaryText
    }, profileId)
  }

  /**
   * Admin function: Attach a quote to a global payment request
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

    const currentMetadata = order.metadata as unknown as GlobalPaymentMetadata
    const totalFee = basePrice + tax + serviceFee

    const updatedMetadata: GlobalPaymentMetadata = {
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
