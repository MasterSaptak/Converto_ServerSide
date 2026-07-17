import { SupabaseClient } from '@supabase/supabase-js'
import { OrderService } from '../core/orders/service'
import type { CreateTicketBookingDTO, TicketBookingMetadata } from './types'

export class TicketBookingService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Initializes a new Ticket Booking request
   */
  async createRequest(profileId: string, data: CreateTicketBookingDTO) {
    // 1. Get the service ID for ticket_booking
    const { data: service, error: serviceError } = await this.supabase
      .from('services')
      .select('id')
      .eq('code', 'ticket_booking')
      .single()

    if (serviceError || !service) {
      throw new Error('Ticket Booking service not found')
    }

    // 2. Build the metadata payload
    const metadata: TicketBookingMetadata = {
      ticket_type: data.ticketType,
      departure_city: data.departureCity,
      destination_city: data.destinationCity,
      travel_dates: data.travelStartDate ? {
        start: data.travelStartDate,
        end: data.travelEndDate
      } : undefined,
      event_name: data.eventName,
      passengers: data.passengers,
      passenger_count: data.passengers.length,
      special_requests: data.specialRequests
    }

    let summaryText = `Ticket Booking: ${data.ticketType.toUpperCase()}`;
    if (data.departureCity && data.destinationCity) {
      summaryText += ` | ${data.departureCity} to ${data.destinationCity}`;
    } else if (data.eventName) {
      summaryText += ` | ${data.eventName}`;
    }

    // 3. Dispatch to Order Service
    return await OrderService.createOrder({
      service_id: service.id,
      metadata: metadata as Record<string, any>,
      amount: 0, // Admin will set this during the Quote phase
      currency: 'USD',
      notes: summaryText
    }, profileId)
  }

  /**
   * Admin function: Attach a quote to a ticket request
   */
  async attachQuote(orderId: string, basePrice: number, tax: number, serviceFee: number, currency: string = 'USD') {
    // 1. Fetch current request
    const { data: order, error: orderError } = await this.supabase
      .from('service_requests')
      .select('metadata')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    const currentMetadata = order.metadata as unknown as TicketBookingMetadata
    const totalFee = basePrice + tax + serviceFee

    // 2. Update metadata
    const updatedMetadata: TicketBookingMetadata = {
      ...currentMetadata,
      base_price: basePrice,
      tax: tax,
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
