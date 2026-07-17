// =====================================================
// CONVERTO PLATFORM — Core Payment Engine
// =====================================================

import { createClient } from '@/lib/supabase/server'
import type { Payment, Quote } from '@/types/database'

export class PaymentService {
  /**
   * Log a new payment in the system
   */
  static async logPayment(data: {
    order_id: string;
    profile_id: string;
    amount: number;
    currency: string;
    payment_method: string;
    gateway?: string;
    transaction_id?: string;
    reference?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Payment> {
    const supabase = await createClient()

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        ...data,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to log payment: ${error.message}`)
    return payment as Payment
  }

  /**
   * Create a formal quote for an order
   */
  static async createQuote(data: {
    order_id: string;
    profile_id: string;
    amount: number;
    currency: string;
    exchange_rate?: number;
    valid_until?: string;
    notes?: string;
  }): Promise<Quote> {
    const supabase = await createClient()

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        ...data,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to create quote: ${error.message}`)
    
    // Auto-link the quote to the order
    await supabase
      .from('service_requests')
      .update({ quote_id: quote.id })
      .eq('id', data.order_id)
      
    return quote as Quote
  }
}
