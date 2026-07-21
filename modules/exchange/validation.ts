// =====================================================
// CONVERTO PLATFORM — Exchange Module Validation
// Professional Remittance Architecture
// =====================================================

import { z } from 'zod';

// Removed hardcoded payout methods - we now use transfer_methods lookup table

// -- Payout details (key-value pairs like account name, number, etc.) --
export const payoutDetailsSchema = z.record(z.string(), z.string().min(1, 'This field is required'));

// -- Create Exchange Request (from user) --
export const createExchangeRequestSchema = z.object({
  from_currency: z.string().min(2, 'Currency code is required'),
  to_currency: z.string().min(2, 'Currency code is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  preferred_send_method: z.string().min(1, 'Please select how you will pay'),
  preferred_receive_method: z.string().min(1, 'Please select how the recipient should receive'),
  payout_details: payoutDetailsSchema,
  customer_notes: z.string().optional(),
});

export type CreateExchangeRequestInput = z.infer<typeof createExchangeRequestSchema>;

// Legacy pairs removed
