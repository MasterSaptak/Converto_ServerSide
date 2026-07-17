import { SupabaseClient } from '@supabase/supabase-js'
import { OrderService } from '../core/orders/service'
import type { CreateBuyForMeDTO, BuyForMeMetadata } from './types'

export class BuyForMeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Initializes a new Buy For Me request
   */
  async createRequest(profileId: string, data: CreateBuyForMeDTO) {
    // 1. Get the service ID for buy_for_me
    const { data: service, error: serviceError } = await this.supabase
      .from('services')
      .select('id')
      .eq('code', 'buy_for_me')
      .single()

    if (serviceError || !service) {
      throw new Error('Buy For Me service not found')
    }

    // 2. Build the metadata payload
    const metadata: BuyForMeMetadata = {
      product_url: data.productUrl,
      specifications: {
        quantity: data.quantity,
        color: data.color,
        size: data.size,
        special_instructions: data.specialInstructions
      },
      shipping_address: data.shippingAddress
    }

    // 3. Dispatch to Order Service
    return await OrderService.createOrder({
      service_id: service.id,
      metadata: metadata as Record<string, any>,
      amount: 0, // Admin will set this during the Quote phase
      currency: 'USD',
      notes: `Buy For Me Request: ${data.productUrl}`
    }, profileId)
  }

  /**
   * Admin function: Attach a quote to a request
   */
  async attachQuote(orderId: string, basePrice: number, shippingFee: number, serviceFee: number, currency: string = 'USD') {
    // 1. Fetch current request to get existing metadata
    const { data: order, error: orderError } = await this.supabase
      .from('service_requests')
      .select('metadata')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    const currentMetadata = order.metadata as unknown as BuyForMeMetadata
    const totalFee = basePrice + shippingFee + serviceFee

    // 2. Update the metadata and total amount
    const updatedMetadata: BuyForMeMetadata = {
      ...currentMetadata,
      base_price: basePrice,
      shipping_fee: shippingFee,
      service_fee: serviceFee,
      total_fee: totalFee,
      currency
    }

    // 3. Update the request
    const { error: updateError } = await this.supabase
      .from('service_requests')
      .update({
        metadata: updatedMetadata as any,
        amount: basePrice,
        service_fee: serviceFee + shippingFee, // We bundle shipping into service fee for the base columns
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
