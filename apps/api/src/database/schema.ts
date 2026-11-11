import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// 1. Agency Profile & Settings
export const agency = pgTable("agency", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: jsonb("name").$type<{ ar: string; fr: string }>().notNull(),
  licenceNumber: varchar("licence_number", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  phoneNumbers: jsonb("phone_numbers").$type<string[]>().notNull(),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }).notNull(),
  socialLinks: jsonb("social_links").$type<{ facebook?: string; instagram?: string; linkedin?: string }>(),
  branding: jsonb("branding").$type<{
    primaryColor: string;
    accentColor: string;
    saffronColor: string;
  }>().notNull(),
  settings: jsonb("settings").$type<{
    currency: "DZD";
    defaultLanguage: "ar" | "fr";
    supportedLanguages: ("ar" | "fr")[];
    enquiryNotificationEmail?: string;
    maxUploadSizeBytes?: number;
  }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Physical Branches
export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: jsonb("name").$type<{ ar: string; fr: string }>().notNull(),
  wilayaCode: integer("wilaya_code").notNull(),
  address: jsonb("address").$type<{ ar: string; fr: string }>().notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  isHeadquarters: boolean("is_headquarters").default(false).notNull(),
  coordinates: jsonb("coordinates").$type<{ lat: number; lng: number }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Users (Staff Members)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // 'owner' | 'manager' | 'reservation_agent' | 'finance' | 'content_editor'
  branchId: uuid("branch_id").references(() => branches.id),
  isActive: boolean("is_active").default(true).notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockoutUntil: timestamp("lockout_until", { withTimezone: true }),
  passwordResetTokenHash: varchar("password_reset_token_hash", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true }),
  refreshTokenFamilyId: varchar("refresh_token_family_id", { length: 255 }),
  currentRefreshTokenHash: varchar("current_refresh_token_hash", { length: 255 }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Destinations
export const destinations = pgTable("destinations", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: jsonb("name").$type<{ ar: string; fr: string }>().notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'domestic' | 'international' | 'religious'
  wilayaOrCountry: varchar("wilaya_or_country", { length: 100 }).notNull(),
  description: jsonb("description").$type<{ ar: string; fr: string }>().notNull(),
  coverImageUrl: text("cover_image_url").notNull(),
  galleryImages: jsonb("gallery_images").$type<string[]>().default([]).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Travel Offers
export const travelOffers = pgTable("travel_offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  title: jsonb("title").$type<{ ar: string; fr: string }>().notNull(),
  destinationId: uuid("destination_id").references(() => destinations.id).notNull(),
  tripType: varchar("trip_type", { length: 50 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  durationNights: integer("duration_nights").notNull(),
  basePriceCentimes: bigint("base_price_centimes", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 10 }).default("DZD").notNull(),
  pricingBasis: varchar("pricing_basis", { length: 50 }).default("per_person").notNull(),
  availabilityStatus: varchar("availability_status", { length: 50 }).default("available").notNull(),
  hotelDetails: jsonb("hotel_details").$type<{ ar: string; fr: string }>().notNull(),
  transportDetails: jsonb("transport_details").$type<{ ar: string; fr: string }>().notNull(),
  itinerary: jsonb("itinerary").$type<Array<{ dayNumber: number; title: { ar: string; fr: string }; description: { ar: string; fr: string } }>>().notNull(),
  inclusions: jsonb("inclusions").$type<{ ar: string[]; fr: string[] }>().notNull(),
  exclusions: jsonb("exclusions").$type<{ ar: string[]; fr: string[] }>().notNull(),
  photos: jsonb("photos").$type<Array<{ url: string; caption?: { ar: string; fr: string } | undefined; isCover: boolean }>>().default([]).notNull(),
  brochureDocId: uuid("brochure_doc_id"),
  isPublished: boolean("is_published").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Departures & Capacity Allocation
export const departures = pgTable("departures", {
  id: uuid("id").defaultRandom().primaryKey(),
  offerId: uuid("offer_id").references(() => travelOffers.id).notNull(),
  departureDate: timestamp("departure_date", { withTimezone: true }).notNull(),
  returnDate: timestamp("return_date", { withTimezone: true }).notNull(),
  maxCapacity: integer("max_capacity").notNull(),
  bookedPlaces: integer("booked_places").default(0).notNull(),
  waitingListCount: integer("waiting_list_count").default(0).notNull(),
  status: varchar("status", { length: 50 }).default("open").notNull(),
  managerOverrides: jsonb("manager_overrides").$type<Array<{
    overriddenByUserId: string;
    extraPlaces: number;
    reason: string;
    timestamp: string;
  }>>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Customers (CRM)
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  wilayaCode: integer("wilaya_code"),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("fr").notNull(),
  internalNotes: text("internal_notes"),
  portalAccessTokenHash: varchar("portal_access_token_hash", { length: 255 }),
  portalAccessExpires: timestamp("portal_access_expires", { withTimezone: true }),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Travellers
export const travellers = pgTable("travellers", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  gender: varchar("gender", { length: 10 }),
  passportNumberEncrypted: text("passport_number_encrypted"),
  passportExpiryDate: timestamp("passport_expiry_date", { withTimezone: true }),
  nationality: varchar("nationality", { length: 10 }).default("DZ").notNull(),
  specialRequirements: text("special_requirements"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Enquiries
export const enquiries = pgTable("enquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  enquiryNumber: varchar("enquiry_number", { length: 50 }).notNull().unique(),
  customerId: uuid("customer_id").references(() => customers.id),
  offerId: uuid("offer_id").references(() => travelOffers.id),
  departureDatePreferred: timestamp("departure_date_preferred", { withTimezone: true }),
  travellersCount: integer("travellers_count").default(1).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }),
  message: text("message").notNull(),
  source: varchar("source", { length: 50 }).default("website_form").notNull(),
  status: varchar("status", { length: 50 }).default("new").notNull(),
  assignedToUserId: uuid("assigned_to_user_id").references(() => users.id),
  followUpDate: timestamp("follow_up_date", { withTimezone: true }),
  privacyConsent: boolean("privacy_consent").default(true).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 100 }).unique(),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9b. Enquiry Activities & History
export const enquiryActivities = pgTable("enquiry_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  enquiryId: uuid("enquiry_id").references(() => enquiries.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // 'created' | 'assigned' | 'status_changed' | 'note_added' | 'call_logged' | 'converted'
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  notes: text("notes"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

// 10. Reservations & Price Snapshots
export const reservations = pgTable("reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: varchar("reference", { length: 50 }).notNull().unique(),
  enquiryId: uuid("enquiry_id").references(() => enquiries.id),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  offerId: uuid("offer_id").references(() => travelOffers.id).notNull(),
  departureId: uuid("departure_id").references(() => departures.id),
  offerSnapshot: jsonb("offer_snapshot").$type<{
    title: { ar: string; fr: string };
    destinationName: { ar: string; fr: string };
    departureDate: string;
    returnDate: string;
    durationDays: number;
    unitPriceCentimes: number;
    currency: "DZD";
  }>().notNull(),
  passengerCount: integer("passenger_count").notNull(),
  agreedTotalCentimes: bigint("agreed_total_centimes", { mode: "number" }).notNull(),
  discountCentimes: bigint("discount_centimes", { mode: "number" }).default(0).notNull(),
  discountAuthorizedBy: uuid("discount_authorized_by").references(() => users.id),
  currentStatus: varchar("current_status", { length: 50 }).default("pending").notNull(),
  statusHistory: jsonb("status_history").$type<Array<{
    status: string;
    changedByUserId: string;
    reason?: string;
    timestamp: string;
  }>>().default([]).notNull(),
  specialRequirements: text("special_requirements"),
  cancellationReason: text("cancellation_reason"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 10b. Reservation Travellers
export const reservationTravellers = pgTable("reservation_travellers", {
  id: uuid("id").defaultRandom().primaryKey(),
  reservationId: uuid("reservation_id").references(() => reservations.id, { onDelete: "cascade" }).notNull(),
  travellerId: uuid("traveller_id").references(() => travellers.id),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  isPrimaryContact: boolean("is_primary_contact").default(false).notNull(),
  passportNumberEncrypted: text("passport_number_encrypted"),
  passportExpiryDate: timestamp("passport_expiry_date", { withTimezone: true }),
  roomAllocation: varchar("room_allocation", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 11. Payments & Receipts
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  reservationId: uuid("reservation_id").references(() => reservations.id).notNull(),
  amountCentimes: bigint("amount_centimes", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 10 }).default("DZD").notNull(),
  paymentDate: timestamp("payment_date", { withTimezone: true }).defaultNow().notNull(),
  method: varchar("method", { length: 50 }).notNull(),
  referenceOrSlipNumber: varchar("reference_or_slip_number", { length: 100 }),
  recordedByUserId: uuid("recorded_by_user_id").references(() => users.id),
  notes: text("notes"),
  isReversed: boolean("is_reversed").default(false).notNull(),
  reversalReason: text("reversal_reason"),
  reversalTimestamp: timestamp("reversal_timestamp", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 12. Refunds
export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  refundNumber: varchar("refund_number", { length: 50 }).notNull().unique(),
  reservationId: uuid("reservation_id").references(() => reservations.id).notNull(),
  originalPaymentId: uuid("original_payment_id").references(() => payments.id),
  amountCentimes: bigint("amount_centimes", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 10 }).default("DZD").notNull(),
  refundDate: timestamp("refund_date", { withTimezone: true }).defaultNow().notNull(),
  reason: text("reason").notNull(),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 13. Audit Log (Append-Only)
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  userId: uuid("user_id").references(() => users.id),
  userEmail: varchar("user_email", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  ipAddress: varchar("ip_address", { length: 100 }).notNull(),
  userAgent: text("user_agent").notNull(),
  diffSummary: jsonb("diff_summary"),
});

// 14. Atomic Counters (Sequences)
export const counters = pgTable("counters", {
  id: varchar("id", { length: 50 }).primaryKey(), // e.g. "TRV-2026", "RCP-2026", "DOC-2026"
  seq: integer("seq").default(0).notNull(),
});

// 15. Documents & Files Vault (Private Storage)
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentNumber: varchar("document_number", { length: 50 }).notNull().unique(), // e.g. "DOC-2026-000001"
  customerId: uuid("customer_id").references(() => customers.id),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  travellerId: uuid("traveller_id").references(() => travellers.id),
  documentType: varchar("document_type", { length: 50 }).notNull(), // 'passport' | 'national_id' | 'visa' | 'contract' | 'payment_receipt' | 'itinerary' | 'insurance'
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  storageFilename: varchar("storage_filename", { length: 255 }).notNull().unique(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  fileSha256: varchar("file_sha256", { length: 64 }).notNull(),
  isPrivate: boolean("is_private").default(true).notNull(),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 16. Customer Portal Messages / Questions
export const customerMessages = pgTable("customer_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  reservationId: uuid("reservation_id").references(() => reservations.id).notNull(),
  senderType: varchar("sender_type", { length: 20 }).notNull(), // 'customer' | 'staff'
  senderId: uuid("sender_id"), // userId if staff, null if customer
  senderName: varchar("sender_name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 17. Operational Notifications Queue
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // 'payment_due' | 'departure_reminder' | 'missing_documents' | 'new_enquiry' | 'customer_message' | 'capacity_alert'
  channel: varchar("channel", { length: 50 }).default("in_app").notNull(), // 'in_app' | 'email' | 'whatsapp'
  recipientType: varchar("recipient_type", { length: 50 }).notNull(), // 'staff' | 'customer'
  recipientId: uuid("recipient_id"), // userId or customerId
  recipientContact: varchar("recipient_contact", { length: 255 }), // phone or email
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, any>>(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending' | 'sent' | 'read' | 'failed'
  sentAt: timestamp("sent_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});


