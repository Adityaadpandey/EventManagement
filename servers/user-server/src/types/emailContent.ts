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

// Shared shape for event publish / review emails
export interface EventReviewEmailContent {
  eventTitle: string;
  eventLocation?: string | null;
  eventDate?: string | null; // pre-formatted date string
  eventId?: string;
  listerName?: string;
}

export interface PayoutEmailContent {
  amount: string; // pre-formatted e.g. ₹10,000
  payoutId: string;
  type?: string;
  approvedAmount?: string;
  remark?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  listerName?: string;
  listerEmail?: string;
  paidAt?: string;
}

export type EmailType =
  | "ticket"
  | "event-update"
  | "otp"
  | "promotion"
  | "event-publish-lister" // lister submits for review
  | "event-publish-admin" // admin notified of new submission
  | "event-approved" // admin approved the event
  | "event-rejected" // admin rejected the event
  | "payout-requested-lister"
  | "payout-requested-admin"
  | "payout-approved"
  | "payout-completed"
  | "payout-rejected";
