export type RequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Quote Sent'
  | 'Waiting Payment'
  | 'Payment Confirmed'
  | 'Assigned'
  | 'Accepted'
  | 'Processing'
  | 'Waiting Customer'
  | 'Waiting Vendor'
  | 'Purchased'
  | 'Booked'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected'
  | 'Refund Requested'
  | 'Refunded'
  | 'Expired';

export type RequestType = 'exchange' | 'buy_for_me' | 'ticket';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_staff: boolean;
  created_at: string;
}

export interface Staff {
  id: string;
  full_name: string;
  email: string;
  role_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  profile_id: string;
  type: RequestType;
  status: RequestStatus;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  assigned_staff_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Join fields
  profile?: Profile;
  assigned_staff?: Staff;
}

export interface Wallet {
  id: string;
  profile_id: string;
  currency_code: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}
