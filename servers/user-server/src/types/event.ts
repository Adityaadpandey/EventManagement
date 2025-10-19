export interface TicketTypeRequest {
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  discountReason?: string;
  quantity: number;
  salesCutoff?: string; // ISO date string
}

export interface CustomFieldRequest {
  label: string;
  fieldType: string; // 'text', 'number', 'dropdown', 'email', etc.
  required: boolean;
  options?: string | null; // JSON or comma-separated for dropdown options
}

export interface CreateEventRequest {
  title: string;
  description: string;
  banner_horizontal: string;
  banner_vertical: string;
  banner_square: string;
  date: string; // ISO date string
  time: string; // ISO time string
  tags: string[];
  chips: string[];
  restrictions?: string;
  location: string;
  longitude?: number;
  latitude?: number;
  capacity?: number;
  samplePoster?: string;
  socialMediaGraphic?: string;
  eventFormat?: string;
  requestedVenue?: string;
  termsConditions?: string;
  rulesRegulations?: string;
  policies?: string;
  dutyLeavesDetails?: string;
  ticketTypes: TicketTypeRequest[];
  customFields?: CustomFieldRequest[];
}
