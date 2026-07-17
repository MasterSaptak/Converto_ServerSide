export interface CreateEducationPaymentDTO {
  institutionName: string
  country: string
  studentName: string
  studentId: string
  paymentPurpose: string
  currency: string
  amountToPay: number
  paymentDeadline?: string
  additionalNotes?: string
}

export interface EducationPaymentMetadata {
  institution_name: string
  country: string
  student_name: string
  student_id: string
  payment_purpose: string
  requested_currency: string
  requested_amount: number
  payment_deadline?: string
  additional_notes?: string
  
  // Fields populated during quote phase
  base_price?: number
  tax?: number
  service_fee?: number
  total_fee?: number
  quote_currency?: string
}
