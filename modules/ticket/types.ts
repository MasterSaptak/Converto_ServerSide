export type TicketType = 'flight' | 'hotel' | 'bus' | 'event' | 'train';

export interface Passenger {
  firstName: string;
  lastName: string;
  passportOrIdNumber?: string;
  documentType?: string;
  documentNumber?: string;
  passportExpiryDate?: string; // YYYY-MM-DD
  gender?: string;
  dob?: string; // YYYY-MM-DD
  nationality?: string;
  nidOrAadhar?: string;
  mealPreference?: boolean;
  mealType?: 'veg' | 'nonveg' | '';
  metadata?: Record<string, any>;
}

export interface TicketBookingMetadata {
  // Request Details
  ticket_type: TicketType;
  departure_city?: string;
  destination_city?: string;
  travel_dates?: {
    start: string; // YYYY-MM-DD
    end?: string;  // YYYY-MM-DD (Optional for one-way/single day)
  };
  event_name?: string; // If ticket_type is 'event'
  
  // Train specific
  coach_class?: string;
  seat_preference?: string;
  train_choice?: string;
  
  // Passenger Details
  passengers: Passenger[];
  passenger_count: number;
  
  special_requests?: string;
  
  // Financials (Populated by Admin during Quote phase)
  base_price?: number;     // The cost of the ticket(s)
  tax?: number;            // Applicable taxes
  service_fee?: number;    // Converto's markup/service fee
  total_fee?: number;      // base + tax + service
  currency?: string;       // E.g., 'USD'
}

export interface CreateTicketBookingDTO {
  ticketType: TicketType;
  departureCity?: string;
  destinationCity?: string;
  travelStartDate?: string;
  travelEndDate?: string;
  eventName?: string;
  passengers: Passenger[];
  specialRequests?: string;
  coachClass?: string;
  seatPreference?: string;
  trainChoice?: string;
}
