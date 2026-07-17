// =====================================================
// CONVERTO PLATFORM — Core Order Validation
// =====================================================

import { z } from 'zod'

export const createOrderSchema = z.object({
  service_id: z.string().uuid('Invalid service ID'),
  metadata: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  subtotal: z.number().min(0).optional(),
  service_fee: z.number().min(0).optional(),
  exchange_fee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  gateway_fee: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
})

export const updateOrderSchema = z.object({
  status: z.string().optional(),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  subtotal: z.number().min(0).optional(),
  service_fee: z.number().min(0).optional(),
  exchange_fee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  gateway_fee: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  transition_remarks: z.string().optional(),
})

export const orderFiltersSchema = z.object({
  service_id: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigned_staff_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.string().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})
