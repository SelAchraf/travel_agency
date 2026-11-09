export const RESERVATION_STATUSES = [
  "pending",
  "awaiting_documents",
  "awaiting_payment",
  "confirmed",
  "cancelled",
  "completed",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const ENQUIRY_STATUSES = [
  "new",
  "contacted",
  "waiting_customer",
  "converted",
  "rejected",
  "closed",
] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "bank_transfer", "cheque", "cib_edahabia_manual"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DOCUMENT_TYPES = [
  "passport",
  "national_id",
  "visa",
  "contract",
  "payment_receipt",
  "itinerary",
  "insurance",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const TRIP_TYPES = [
  "guided_tour",
  "trekking",
  "beach_stay",
  "umrah",
  "custom_group",
] as const;

export type TripType = (typeof TRIP_TYPES)[number];

export const PRICING_BASIS = ["per_person", "per_room_double", "per_family", "on_request"] as const;

export type PricingBasis = (typeof PRICING_BASIS)[number];

export const AVAILABILITY_STATUSES = ["available", "limited", "request_only", "sold_out"] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];
