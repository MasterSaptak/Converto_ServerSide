// =====================================================
// CONVERTO PLATFORM — Exchange Module Service
// Professional Remittance Architecture
// =====================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { CreateExchangeRequestInput } from './validation';
import { OrderService } from '../core/orders/service';
import type { TransferCorridor, ExchangeQuote, ExchangeOrderSnapshot, FeeType } from './types';

export class ExchangeService {
  constructor(private supabase: SupabaseClient) {}

  // -----------------------------------------------
  // 1. Get all active corridors (for user dropdowns)
  // -----------------------------------------------
  async getActiveCorridors(): Promise<TransferCorridor[]> {
    const { data, error } = await this.supabase
      .from('transfer_corridors')
      .select('*')
      .eq('is_active', true)
      .order('from_country', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch corridors: ${error.message}`);
    }

    return (data || []) as TransferCorridor[];
  }

  // -----------------------------------------------
  // 2. Get a specific corridor
  // -----------------------------------------------
  async getCorridor(
    fromCurrency: string,
    toCurrency: string
  ): Promise<TransferCorridor> {
    const { data, error } = await this.supabase
      .from('transfer_corridors')
      .select('*')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error(
        `Transfer corridor not available: ${fromCurrency} → ${toCurrency}`
      );
    }

    return data as TransferCorridor;
  }

  // -----------------------------------------------
  // 3. Calculate fee based on fee_type
  // -----------------------------------------------
  private calculateFee(
    amount: number,
    feeType: FeeType,
    feeFlat: number,
    feePercentage: number
  ): { fee_flat: number; fee_percentage_amount: number; total_fee: number } {
    let flatPortion = 0;
    let percentagePortion = 0;

    switch (feeType) {
      case 'flat':
        flatPortion = feeFlat;
        break;
      case 'percentage':
        percentagePortion = (amount * feePercentage) / 100;
        break;
      case 'hybrid':
        flatPortion = feeFlat;
        percentagePortion = (amount * feePercentage) / 100;
        break;
    }

    return {
      fee_flat: Math.round(flatPortion * 100) / 100,
      fee_percentage_amount: Math.round(percentagePortion * 100) / 100,
      total_fee: Math.round((flatPortion + percentagePortion) * 100) / 100,
    };
  }

  // -----------------------------------------------
  // 4. Calculate Quote (Calculator Engine)
  //    Uses ONLY custom_rate, NEVER market_rate
  // -----------------------------------------------
  async calculateQuote(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    preferredSendMethod: string,
    preferredReceiveMethod: string
  ): Promise<ExchangeQuote> {
    const corridor = await this.getCorridor(fromCurrency, toCurrency);

    // Validate limits
    if (amount < corridor.minimum_amount) {
      throw new Error(
        `Minimum send amount is ${corridor.minimum_amount} ${fromCurrency}`
      );
    }
    if (amount > corridor.maximum_amount) {
      throw new Error(
        `Maximum send amount is ${corridor.maximum_amount} ${fromCurrency}`
      );
    }

    // Calculate fee
    const feeCalc = this.calculateFee(
      amount,
      corridor.fee_type,
      corridor.fee_flat,
      corridor.fee_percentage
    );

    // Calculate recipient amount using CUSTOM rate only
    const recipientReceives = Math.round(amount * corridor.custom_rate * 100) / 100;
    const totalToPay = Math.round((amount + feeCalc.total_fee) * 100) / 100;

    return {
      corridor_id: corridor.id,
      from_country: corridor.from_country,
      to_country: corridor.to_country,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      preferred_send_method: preferredSendMethod,
      preferred_receive_method: preferredReceiveMethod,
      market_rate: corridor.market_rate,
      custom_rate: corridor.custom_rate,
      send_amount: amount,
      fee_flat: feeCalc.fee_flat,
      fee_percentage_amount: feeCalc.fee_percentage_amount,
      total_fee: feeCalc.total_fee,
      total_to_pay: totalToPay,
      recipient_receives: recipientReceives,
    };
  }

  // -----------------------------------------------
  // 5. Create Exchange Order (Snapshot Engine)
  //    Freezes ALL rates and fees at order time
  // -----------------------------------------------
  async createExchangeRequest(profileId: string, input: CreateExchangeRequestInput) {
    // 1. Calculate final quote
    const quote = await this.calculateQuote(
      input.from_currency,
      input.to_currency,
      input.amount,
      input.preferred_send_method,
      input.preferred_receive_method
    );

    // 2. Build the immutable snapshot
    const snapshot: ExchangeOrderSnapshot = {
      corridor_id: quote.corridor_id,
      from_currency: quote.from_currency,
      to_currency: quote.to_currency,
      preferred_send_method: quote.preferred_send_method,
      preferred_receive_method: quote.preferred_receive_method,

      // Rate snapshots — frozen forever
      market_rate_snapshot: quote.market_rate,
      custom_rate_snapshot: quote.custom_rate,

      // Fee snapshots — frozen forever
      fee_type: 'flat', // Will be read from corridor
      fee_flat_snapshot: quote.fee_flat,
      fee_percentage_snapshot: quote.fee_percentage_amount,
      total_fee_snapshot: quote.total_fee,

      // Final amounts — frozen forever
      send_amount: quote.send_amount,
      total_paid: quote.total_to_pay,
      recipient_receives: quote.recipient_receives,

      // Payout details
      payout_details: input.payout_details,
    };

    // 3. Get the corridor to store fee_type properly
    const corridor = await this.getCorridor(
      input.from_currency,
      input.to_currency
    );
    snapshot.fee_type = corridor.fee_type;

    // 4. Fetch service ID for 'exchange'
    const { data: service } = await this.supabase
      .from('services')
      .select('id')
      .eq('code', 'exchange')
      .single();

    if (!service) throw new Error('Exchange service not configured in platform.');

    // 5. Create order via Core Order Service with full snapshot as metadata
    const order = await OrderService.createOrder(
      {
        service_id: service.id,
        amount: quote.send_amount,
        currency: input.from_currency,
        service_fee: quote.total_fee,
        exchange_fee: 0,
        tax: 0,
        total: quote.total_to_pay,
        metadata: snapshot as unknown as Record<string, unknown>,
        notes: input.customer_notes,
      },
      profileId
    );

    return order;
  }
}
