export interface Ticket {
  ticketQR: string;
  ticketId: string;
  eventName: string;
  seatNumber?: string;
  date: string;
  venue?: string;
  CompanyName?: string | null;
  instagramLink?: string | null;
  facebookLink?: string | null;
  xLink?: string | null;
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
  imageUrl?: string;
  eventName?: string;
  eventDate?: string;
  eventVenue?: string;
  updateType?: "venue" | "time" | "cancellation" | "general" | "important";
  actionRequired?: boolean;
  actionUrl?: string;
  actionText?: string;
}

export interface EventUpdateEmailContent {
  eventUpdate: EventUpdate;
}

export interface OtpEmailContent {
  otp: string;
  message?: string;
}

export interface Promotion {
  eventTitle: string; // Event being promoted
  eventDescription?: string; // Event description
  eventDate: string; // Event date
  eventTime: string; // Event time
  eventLocation: string; // Event location/venue
  eventBanner?: string; // Event banner image URL
  customContent?: string; // Custom promotional message
  listerName: string; // Lister/organizer name
  eventLink: string; // Link to event page
  listerWebsite?: string; // Lister website
  listerInstagram?: string; // Instagram link
  listerFacebook?: string; // Facebook link
  listerX?: string; // X/Twitter link
  chips?: string[]; // Event tags/categories
  tags?: string[]; // Additional tags
}

export interface PromotionEmailContent {
  promotion: Promotion;
}

export type EmailType = "ticket" | "event-update" | "otp" | "promotion";
