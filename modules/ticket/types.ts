export type TicketType = 'flight' | 'hotel' | 'bus' | 'event';

export interface Passenger {
  firstName: string;
  lastName: string;
  passportOrIdNumber?: string;
  dob?: string; // YYYY-MM-DD
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
}
