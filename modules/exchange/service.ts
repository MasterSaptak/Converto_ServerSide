// =====================================================
// CONVERTO PLATFORM — Exchange Module Service
// =====================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { CreateExchangeRequestInput } from './validation';
import { OrderService } from '../core/orders/service';

export class ExchangeService {
  constructor(private supabase: SupabaseClient) {}

  async getExchangeRate(fromCurrency: string, toCurrency: string) {
    const { data, error } = await this.supabase
      .from('exchange_rates')
      .select('rate, margin_percentage')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    // Rate applied with our margin
    const finalRate = data.rate * (1 - (data.margin_percentage / 100));
    return {
      base_rate: data.rate,
      margin: data.margin_percentage,
      final_rate: finalRate,
    };
  }

  async calculateQuote(fromCurrency: string, toCurrency: string, amount: number) {
    const rateData = await this.getExchangeRate(fromCurrency, toCurrency);
    
    // Core pricing engine placeholder for MVP (flat platform fee)
    const baseFees = { service_fee: 5, tax: 0 };

    // Exchange specific fee is implicitly taken via margin, or we could explicitly declare it
    const exchangedAmount = amount * rateData.final_rate;

    return {
      original_amount: amount,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      exchange_rate: rateData.final_rate,
      exchanged_amount: exchangedAmount,
      platform_fee: baseFees.service_fee,
      total_cost: amount + baseFees.service_fee + baseFees.tax,
      total_currency: fromCurrency
    };
  }

  async createExchangeRequest(profileId: string, input: CreateExchangeRequestInput) {
    // 1. Calculate final amounts and rates
    const quote = await this.calculateQuote(input.from_currency, input.to_currency, input.amount);

    // 2. Format metadata
    const metadata = {
      from_currency: input.from_currency,
      to_currency: input.to_currency,
      exchange_rate: quote.exchange_rate,
      payout_method: input.payout_method,
      payout_details: input.payout_details,
    };

    // 3. Delegate to Core Order Service
    // Fetch the service ID for 'exchange'
    const { data: service } = await this.supabase
      .from('services')
      .select('id')
      .eq('code', 'exchange')
      .single();

    if (!service) throw new Error("Exchange service not configured in platform.");

    const order = await OrderService.createOrder({
      service_id: service.id,
      amount: quote.original_amount,
      currency: input.from_currency,
      service_fee: quote.platform_fee,
      tax: 0, // Simplified for now
      total: quote.total_cost,
      metadata: metadata,
      notes: input.customer_notes
    }, profileId);

    return order;
  }
}
