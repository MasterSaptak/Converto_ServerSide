// =====================================================
// CONVERTO PLATFORM — Exchange Module Types
// =====================================================

export type PayoutMethod = 'bank_transfer' | 'crypto_wallet' | 'mobile_money' | 'cash_pickup';

export interface ExchangeMetadata {
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  payout_method: PayoutMethod;
  payout_details: Record<string, string>;
  customer_notes?: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  margin_percentage: number;
  is_active: boolean;
  updated_at: string;
  updated_by?: string;
}
