export interface Ticket {
  ticketQR: string;
  ticketId: string;
  eventName: string;
  seatNumber?: string;
  date: string;
  venue?: string;
  CompanyName?: string | null;
  InstagramLink?: string | null;
  FacebookLink?: string | null;
  XLink?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface TicketEmailContent {
  ticket: Ticket;
}

export interface EventUpdate {
  message: string;
  updatedAt: string;
}

export interface EventUpdateEmailContent {
  eventUpdate: EventUpdate;
}
export interface OtpEmailContent {
  otp: string;
}

export type EmailType = "ticket" | "event-update" | "otp";
