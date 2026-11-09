import { pool } from "./connection.js";
import { logger } from "../utils/logger.js";

const DDL = `
CREATE TABLE IF NOT EXISTS agency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,
  licence_number VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  phone_numbers JSONB NOT NULL,
  whatsapp_number VARCHAR(50) NOT NULL,
  social_links JSONB,
  branding JSONB NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,
  wilaya_code INT NOT NULL,
  address JSONB NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  is_headquarters BOOLEAN DEFAULT FALSE NOT NULL,
  coordinates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  role VARCHAR(50) NOT NULL,
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  failed_login_attempts INT DEFAULT 0 NOT NULL,
  lockout_until TIMESTAMPTZ,
  password_reset_token_hash VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  refresh_token_family_id VARCHAR(255),
  current_refresh_token_hash VARCHAR(255),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name JSONB NOT NULL,
  category VARCHAR(50) NOT NULL,
  wilaya_or_country VARCHAR(100) NOT NULL,
  description JSONB NOT NULL,
  cover_image_url TEXT NOT NULL,
  gallery_images JSONB DEFAULT '[]'::jsonb NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS travel_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(150) NOT NULL UNIQUE,
  title JSONB NOT NULL,
  destination_id UUID REFERENCES destinations(id) NOT NULL,
  trip_type VARCHAR(50) NOT NULL,
  duration_days INT NOT NULL,
  duration_nights INT NOT NULL,
  base_price_centimes BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'DZD' NOT NULL,
  pricing_basis VARCHAR(50) DEFAULT 'per_person' NOT NULL,
  availability_status VARCHAR(50) DEFAULT 'available' NOT NULL,
  hotel_details JSONB NOT NULL,
  transport_details JSONB NOT NULL,
  itinerary JSONB NOT NULL,
  inclusions JSONB NOT NULL,
  exclusions JSONB NOT NULL,
  photos JSONB DEFAULT '[]'::jsonb NOT NULL,
  brochure_doc_id UUID,
  is_published BOOLEAN DEFAULT FALSE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES travel_offers(id) NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ NOT NULL,
  max_capacity INT NOT NULL,
  booked_places INT DEFAULT 0 NOT NULL,
  waiting_list_count INT DEFAULT 0 NOT NULL,
  status VARCHAR(50) DEFAULT 'open' NOT NULL,
  manager_overrides JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  wilaya_code INT,
  preferred_language VARCHAR(10) DEFAULT 'fr' NOT NULL,
  internal_notes TEXT,
  portal_access_token_hash VARCHAR(255),
  portal_access_expires TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS travellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth TIMESTAMPTZ,
  gender VARCHAR(10),
  passport_number_encrypted TEXT,
  passport_expiry_date TIMESTAMPTZ,
  nationality VARCHAR(10) DEFAULT 'DZ' NOT NULL,
  special_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  offer_id UUID REFERENCES travel_offers(id),
  departure_date_preferred TIMESTAMPTZ,
  travellers_count INT DEFAULT 1 NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  contact_email VARCHAR(255),
  message TEXT NOT NULL,
  source VARCHAR(50) DEFAULT 'website_form' NOT NULL,
  status VARCHAR(50) DEFAULT 'new' NOT NULL,
  assigned_to_user_id UUID REFERENCES users(id),
  follow_up_date TIMESTAMPTZ,
  privacy_consent BOOLEAN DEFAULT TRUE NOT NULL,
  idempotency_key VARCHAR(100) UNIQUE,
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS enquiry_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES enquiries(id) NOT NULL,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(50) NOT NULL UNIQUE,
  enquiry_id UUID REFERENCES enquiries(id),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  offer_id UUID REFERENCES travel_offers(id) NOT NULL,
  departure_id UUID REFERENCES departures(id),
  offer_snapshot JSONB NOT NULL,
  passenger_count INT NOT NULL,
  agreed_total_centimes BIGINT NOT NULL,
  discount_centimes BIGINT DEFAULT 0 NOT NULL,
  discount_authorized_by UUID REFERENCES users(id),
  current_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  status_history JSONB DEFAULT '[]'::jsonb NOT NULL,
  special_requirements TEXT,
  cancellation_reason TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  reservation_id UUID REFERENCES reservations(id) NOT NULL,
  amount_centimes BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'DZD' NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  method VARCHAR(50) NOT NULL,
  reference_or_slip_number VARCHAR(100),
  recorded_by_user_id UUID REFERENCES users(id),
  notes TEXT,
  is_reversed BOOLEAN DEFAULT FALSE NOT NULL,
  reversal_reason TEXT,
  reversal_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number VARCHAR(50) NOT NULL UNIQUE,
  reservation_id UUID REFERENCES reservations(id) NOT NULL,
  original_payment_id UUID REFERENCES payments(id),
  amount_centimes BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'DZD' NOT NULL,
  refund_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reason TEXT NOT NULL,
  approved_by_user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS reservation_travellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
  traveller_id UUID REFERENCES travellers(id),
  full_name VARCHAR(255) NOT NULL,
  date_of_birth TIMESTAMPTZ,
  is_primary_contact BOOLEAN DEFAULT FALSE NOT NULL,
  passport_number_encrypted TEXT,
  passport_expiry_date TIMESTAMPTZ,
  room_allocation VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  ip_address VARCHAR(100) NOT NULL,
  user_agent TEXT NOT NULL,
  diff_summary JSONB
);

CREATE TABLE IF NOT EXISTS counters (
  id VARCHAR(50) PRIMARY KEY,
  seq INT DEFAULT 0 NOT NULL
);

-- Indexes for performance and quick searches
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_destinations_slug ON destinations(slug);
CREATE INDEX IF NOT EXISTS idx_travel_offers_slug ON travel_offers(slug);
CREATE INDEX IF NOT EXISTS idx_travel_offers_destination ON travel_offers(destination_id);
CREATE INDEX IF NOT EXISTS idx_travel_offers_status ON travel_offers(is_published, is_archived);
CREATE INDEX IF NOT EXISTS idx_departures_offer ON departures(offer_id);
CREATE INDEX IF NOT EXISTS idx_departures_date ON departures(departure_date);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_enquiries_number ON enquiries(enquiry_number);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_idempotency ON enquiries(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_enquiry_activities_enquiry ON enquiry_activities(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_reservations_reference ON reservations(reference);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_departure ON reservations(departure_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(current_status);
CREATE INDEX IF NOT EXISTS idx_reservation_travellers_res ON reservation_travellers(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt ON payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_refunds_receipt ON refunds(refund_number);
CREATE INDEX IF NOT EXISTS idx_refunds_reservation ON refunds(reservation_id);
`;

export async function migrateDatabase() {
  logger.info("Executing PostgreSQL schema migration...");
  await pool.query(DDL);
  logger.info("PostgreSQL schema migration completed successfully.");
}

if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  migrateDatabase()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ msg: "Migration failed", err });
      process.exit(1);
    });
}

