export interface BuyForMeMetadata {
  // Product Details
  website: string;
  product_url: string;
  product_name: string;
  product_image?: string;
  variant?: string;
  notes?: string;
  
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
  tax?: number;            // Applicable taxes
  discount?: number;       // Any applied discounts
  total_fee?: number;      // base + shipping + service + tax - discount
  currency?: string;       // E.g., 'USD'
}

export interface CreateBuyForMeDTO {
  website: string;
  productUrl: string;
  productName: string;
  productImage?: string;
  quantity: number;
  variant?: string;
  notes?: string;
  color?: string;
  size?: string;
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
}
