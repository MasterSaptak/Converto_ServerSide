// =====================================================
// CONVERTO PLATFORM — Exchange Module Types
// Professional Remittance Architecture
// =====================================================

// -- Transfer Methods --
export type TransferMethodCategory = 'banking' | 'digital_wallets' | 'international' | 'other';

export interface TransferMethod {
  id: string;
  name: string;
  category: TransferMethodCategory;
  icon: string;
  country: string;
  is_active: boolean;
}

// -- Fee Types --
export type FeeType = 'flat' | 'percentage' | 'hybrid';

// -- Transfer Corridor (Replaces ExchangePair) --
export interface TransferCorridor {
  id: string;
  from_country: string;
  to_country: string;
  from_currency: string;
  to_currency: string;
  market_rate: number;
  custom_rate: number;
  fee_type: FeeType;
  fee_flat: number;
  fee_percentage: number;
  minimum_amount: number;
  maximum_amount: number;
  is_active: boolean;
  updated_by?: string;
  updated_at: string;
  notes?: string;
}

// -- Quote Calculation (what the calculator returns) --
export interface ExchangeQuote {
  // Corridor info
  corridor_id: string;
  from_country: string;
  to_country: string;
  from_currency: string;
  to_currency: string;
  preferred_send_method: string;
  preferred_receive_method: string;

  // Rates (snapshot-ready)
  market_rate: number;
  custom_rate: number;

  // Amounts
  send_amount: number;           // What the user enters
  fee_flat: number;              // Flat fee portion
  fee_percentage_amount: number; // Percentage fee portion (calculated)
  total_fee: number;             // fee_flat + fee_percentage_amount
  total_to_pay: number;          // send_amount + total_fee (in from_currency)
  recipient_receives: number;    // send_amount * custom_rate (in to_currency)
}

// -- Order Snapshot (stored permanently with each order) --
export interface ExchangeOrderSnapshot {
  corridor_id: string;
  from_currency: string;
  to_currency: string;

  // Rate snapshots (frozen at order time)
  market_rate_snapshot: number;
  custom_rate_snapshot: number;

  // Fee snapshots
  fee_type: FeeType;
  fee_flat_snapshot: number;
  fee_percentage_snapshot: number;
  total_fee_snapshot: number;

  // Final amounts
  send_amount: number;
  total_paid: number;           // send_amount + total_fee (in from_currency)
  recipient_receives: number;   // send_amount * custom_rate (in to_currency)

  // Payout information
  preferred_send_method: string;
  preferred_receive_method: string;
  payout_details: Record<string, string>;
}

// -- Rate History (audit trail) --
export interface ExchangeRateHistory {
  id: string;
  pair_id: string;
  old_market_rate?: number;
  new_market_rate?: number;
  old_custom_rate?: number;
  new_custom_rate?: number;
  old_fee_flat?: number;
  new_fee_flat?: number;
  old_fee_percentage?: number;
  new_fee_percentage?: number;
  changed_by?: string;
  changed_at: string;
  change_reason?: string;
}

// -- Legacy compat (keep old type for existing references during migration) --
/** @deprecated Use ExchangePair instead */
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

export interface ExchangeMetadata extends ExchangeOrderSnapshot {
  customer_notes?: string;
}
