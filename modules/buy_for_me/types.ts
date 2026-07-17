export interface BuyForMeMetadata {
  // Product Details
  product_url: string;
  product_name?: string;
  specifications: {
    color?: string;
    size?: string;
    quantity: number;
    special_instructions?: string;
  };
  
  // Fulfillment Details
  shipping_address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  
  // Financials (Populated by Admin during Quote phase)
  base_price?: number;     // The cost of the item itself
  shipping_fee?: number;   // The cost to ship to the customer
  service_fee?: number;    // Converto's markup/service fee
  total_fee?: number;      // base + shipping + service
  currency?: string;       // E.g., 'USD'
}

export interface CreateBuyForMeDTO {
  productUrl: string;
  quantity: number;
  color?: string;
  size?: string;
  specialInstructions?: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
}
