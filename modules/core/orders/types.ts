// =====================================================
// CONVERTO PLATFORM — Core Order Types
// =====================================================

export interface CreateOrderInput {
  service_id: string;
  metadata: Record<string, unknown>;
  notes?: string;
  // Pricing fields (optional — can be set by admin later)
  amount?: number;
  currency?: string;
  subtotal?: number;
  service_fee?: number;
  exchange_fee?: number;
  discount?: number;
  tax?: number;
  gateway_fee?: number;
  total?: number;
}

export interface UpdateOrderInput {
  status?: string;
  priority?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  // Pricing
  subtotal?: number;
  service_fee?: number;
  exchange_fee?: number;
  discount?: number;
  tax?: number;
  gateway_fee?: number;
  total?: number;
  // Transition
  transition_remarks?: string;
}

export interface OrderFilters {
  service_id?: string;
  status?: string;
  priority?: string;
  assigned_staff_id?: string;
  customer_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
