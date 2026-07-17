// =====================================================
// CONVERTO PLATFORM — Exchange Module Validation
// =====================================================

import { z } from 'zod';

export const payoutDetailsSchema = z.record(z.string(), z.string().min(1, 'This field is required'));

export const createExchangeRequestSchema = z.object({
  from_currency: z.string().min(2, 'Currency code is required'),
  to_currency: z.string().min(2, 'Currency code is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  payout_method: z.enum(['bank_transfer', 'crypto_wallet', 'mobile_money', 'cash_pickup']),
  payout_details: payoutDetailsSchema,
  customer_notes: z.string().optional(),
});

export type CreateExchangeRequestInput = z.infer<typeof createExchangeRequestSchema>;
