// =====================================================
// CONVERTO PLATFORM — Shared Database Types
// =====================================================
// This file maps exactly to the schema_v3.sql tables.
// Used by both UserSide and ServerSide applications.
// =====================================================

// ── Profiles ──────────────────────────────────────────
export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  timezone: string | null;
  preferred_currency: string;
  avatar_url: string | null;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
}

// ── Service Registry ──────────────────────────────────
export interface Service {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  requires_quote: boolean;
  supports_wallet: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export type ServiceSlug =
  | 'exchange'
  | 'buy_for_me'
  | 'ticket'
  | 'education'
  | 'global_payments';

// ── Service Requests (Hybrid) ─────────────────────────
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

export type RequestPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface ServiceRequest {
  id: string;
  profile_id: string;
  service_id: string;
  status: RequestStatus;
  priority: RequestPriority;
  amount: number | null;
  currency: string | null;
  assigned_staff_id: string | null;
  quote_id: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  profile?: Profile;
  service?: Service;
  assigned_staff?: StaffWithProfile;
  quote?: Quote;
}

// ── Service-Specific Metadata Shapes ──────────────────
export interface ExchangeMetadata {
  from_currency: string;
  to_currency: string;
  exchange_rate?: number;
  recipient_name?: string;
  recipient_account?: string;
}

export interface BuyForMeMetadata {
  store: string;
  product_name: string;
  product_url?: string;
  product_details?: string;
  quantity: number;
}

export interface TicketMetadata {
  event_name?: string;
  origin?: string;
  destination?: string;
  travel_date?: string;
  return_date?: string;
  ticket_type?: string;
  passengers?: number;
}

export interface EducationMetadata {
  institution: string;
  student_name: string;
  student_id?: string;
  program?: string;
  semester?: string;
}

export interface GlobalPaymentMetadata {
  recipient_name: string;
  recipient_country: string;
  recipient_bank?: string;
  recipient_account?: string;
  purpose?: string;
}

// ── Quotes ────────────────────────────────────────────
export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface Quote {
  id: string;
  request_id: string;
  amount: number;
  currency_code: string;
  margin: number;
  breakdown: Record<string, unknown>;
  valid_until: string | null;
  notes: string | null;
  status: QuoteStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  request?: ServiceRequest;
  created_by_staff?: StaffWithProfile;
}

// ── Payments ──────────────────────────────────────────
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface PaymentMethod {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export interface Payment {
  id: string;
  request_id: string | null;
  quote_id: string | null;
  profile_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
  // Joined relations
  profile?: Profile;
  request?: ServiceRequest;
  quote?: Quote;
}

export interface PaymentAttempt {
  id: string;
  payment_id: string;
  method_id: string | null;
  gateway_reference: string | null;
  gateway_response: Record<string, unknown>;
  status: string;
  created_at: string;
  // Joined relations
  method?: PaymentMethod;
}

export interface PaymentRefund {
  id: string;
  payment_id: string;
  amount: number;
  reason: string | null;
  status: string;
  processed_by: string | null;
  created_at: string;
}

// ── Wallet & Ledger ───────────────────────────────────
export interface Wallet {
  id: string;
  profile_id: string;
  created_at: string;
  // Joined relations
  accounts?: WalletAccount[];
}

export interface WalletAccount {
  id: string;
  wallet_id: string;
  currency_code: string;
  available_balance: number;
  locked_balance: number;
  reserved_balance: number;
  created_at: string;
  updated_at: string;
}

export type WalletTransactionType = 'credit' | 'debit' | 'lock' | 'unlock' | 'reserve' | 'release';
export type WalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface WalletTransaction {
  id: string;
  wallet_account_id: string;
  amount: number;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface WalletLedgerEntry {
  id: string;
  transaction_id: string;
  description: string | null;
  available_balance_after: number;
  locked_balance_after: number;
  reserved_balance_after: number;
  created_at: string;
  // Joined relations
  transaction?: WalletTransaction;
}

// ── Exchange Rates ────────────────────────────────────
export interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  market_rate: number;
  buy_rate: number;
  sell_rate: number;
  margin: number;
  provider: string;
  is_active: boolean;
  updated_at: string;
}

// ── Staff & Permissions ───────────────────────────────
export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  department_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  // Joined relations
  department?: Department;
}

export interface Permission {
  id: string;
  description: string | null;
  category: string | null;
}

export interface Staff {
  id: string;
  role_id: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations
  role?: Role;
  department?: Department;
  permissions?: Permission[];
}

export interface StaffWithProfile extends Staff {
  profile: Profile;
}

export interface StaffPermission {
  staff_id: string;
  permission_id: string;
}

// ── Conversations & Messages ──────────────────────────
export type ConversationContextType = 'support' | 'request' | 'internal' | 'admin';
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed';

export interface Conversation {
  id: string;
  context_type: ConversationContextType;
  context_id: string | null;
  profile_id: string | null;
  assigned_staff_id: string | null;
  status: ConversationStatus;
  subject: string | null;
  last_message_at: string;
  created_at: string;
  // Joined relations
  profile?: Profile;
  assigned_staff?: StaffWithProfile;
  messages?: Message[];
}

export type SenderType = 'user' | 'staff' | 'system' | 'ai';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: SenderType;
  message: string;
  attachments: MessageAttachment[];
  is_internal: boolean;
  is_read: boolean;
  created_at: string;
  // Joined relations
  sender_profile?: Profile;
}

export interface MessageAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// ── Notifications ─────────────────────────────────────
export type NotificationCategory = 'system' | 'request' | 'promo' | 'security' | 'payment' | 'chat';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface Notification {
  id: string;
  profile_id: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  channel: NotificationChannel[];
  title: string;
  message: string;
  action_url: string | null;
  icon: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_by: string | null;
  created_at: string;
}

// ── Campaigns ─────────────────────────────────────────
export type CampaignType = 'promo' | 'ad' | 'announcement' | 'seasonal' | 'maintenance' | 'referral';

export interface Campaign {
  id: string;
  type: CampaignType;
  title: string;
  description: string | null;
  content: Record<string, unknown>;
  icon: string | null;
  color: string | null;
  href: string | null;
  tag: string | null;
  is_active: boolean;
  priority: number;
  starts_at: string;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Settings ──────────────────────────────────────────
export interface Setting {
  key: string;
  value: unknown;
  description: string | null;
  category: string;
  updated_at: string;
  updated_by: string | null;
}

// ── Activity Logs ─────────────────────────────────────
export interface ActivityLog {
  id: string;
  profile_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined relations
  profile?: Profile;
}

// ── Audit Logs ────────────────────────────────────────
export interface AuditLog {
  id: string;
  staff_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  // Joined relations
  staff_profile?: Profile;
}

// ── AI ────────────────────────────────────────────────
export interface AiLog {
  id: string;
  action_type: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  model: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface AiSuggestion {
  id: string;
  entity_type: string;
  entity_id: string | null;
  suggestion_type: string;
  suggestion: Record<string, unknown>;
  confidence: number | null;
  status: string;
  reviewed_by: string | null;
  created_at: string;
}

export interface AiAction {
  id: string;
  suggestion_id: string | null;
  action_type: string;
  input: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  status: string;
  executed_at: string | null;
  created_at: string;
}

// ── Supabase Storage Paths ────────────────────────────
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  REQUESTS: 'requests',
  QUOTES: 'quotes',
  PAYMENTS: 'payments',
  TICKETS: 'tickets',
  PASSPORTS: 'passports',
  RECEIPTS: 'receipts',
  STAFF: 'staff',
  SYSTEM: 'system',
} as const;
