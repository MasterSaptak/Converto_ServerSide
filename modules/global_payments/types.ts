export interface CreateGlobalPaymentDTO {
  recipientName: string
  country: string
  bankName: string
  accountNumber: string
  swiftCode: string
  transferCurrency: string
  amountToTransfer: number
  purposeOfTransfer: string
  paymentReference?: string
}

export interface GlobalPaymentMetadata {
  recipient_name: string
  country: string
  bank_name: string
  account_number: string
  swift_code: string
  requested_currency: string
  requested_amount: number
  purpose_of_transfer: string
  payment_reference?: string
  
  // Fields populated during quote phase
  base_price?: number
  tax?: number
  service_fee?: number
  total_fee?: number
  quote_currency?: string
}
