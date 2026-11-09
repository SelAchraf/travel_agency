# Project Progress

Updated by the agent at the end of every workflow. Read this before starting any task.

## Status

| Step                                          | Status        | Notes                                                              |
| --------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| Implementation Plan (/00-implementation-plan) | Plan approved | Saved to /docs/PLAN.md                                             |
| Phase 0 Foundation                            | Completed     | PERN stack, pnpm monorepo, shared schemas, design system, API, tests |
| Phase 1A Auth, RBAC, audit                    | Completed     | Argon2id, rotating refresh tokens, RBAC, lockout, audit log, admin UI |
| Phase 1B Offers, customers, enquiries         | Completed     | Offers CRUD, departures & capacity override, Algerian CRM, inbound enquiries, admin UI |
| Phase 1C Reservations, payments, receipts     | Completed     | Immutable price snapshots, atomic references (TRV, RCP, RFD), row-locking capacity check, server-side balance, cashier journal & printable receipts |
| Phase 1D Public website                       | Not started   |                                                                    |
| Phase 1E Dashboard, documents, reports        | Not started   |                                                                    |
| Phase 2 Operations                            | Not started   |                                                                    |
| Final hardening                               | Not started   |                                                                    |

## Decisions taken

- **Stack Transition to PERN**: Switched from MERN to **PERN** (PostgreSQL 16 with Drizzle ORM + Express + React + Node.js 20, strict TypeScript) per explicit user requirement. Drizzle ORM provides type-safe SQL, clean schema migrations, and native ACID transactions with row-level locking (`FOR UPDATE`) for capacity checks.
- **Financial Representation**: All currency amounts stored strictly as integer centimes (1 DZD = 100 centimes) with explicit currency code "DZD" to prevent floating-point inaccuracies. Formatted as `"12 500 DA"` (FR) and `"12 500 دج"` (AR).
- **Atomic Reference Generation**: Modeled in PostgreSQL using a dedicated `counters` table with atomic upserts (`INSERT INTO counters ... ON CONFLICT (id) DO UPDATE SET seq = counters.seq + 1 RETURNING seq`) for zero-collision human-readable references (`TRV-2026-000001`, `REC-2026-000001`).
- **Security & Authorization**: Argon2id password hashing, rotating refresh tokens with reuse detection, progressive account lockout (15m, 1h, 24h), strict RBAC middleware enforcing permission matrix, and immediate deactivation cut (database-verified on every request).
- **Sensitive Documents**: Private file storage with magic-byte MIME detection, randomized storage UUIDs, authenticated streaming, and append-only audit logging on document access.
- **Design System**: Palette inspired by Algerian culture (Saharan Sand, Mediterranean Indigo, Tassili Terracotta, Desert Saffron, Atlas Mint). Native bi-directional support with dynamic `dir="rtl"` / `dir="ltr"` and `Readex Pro` Arabic typography.
- **Frontend Performance**: Route-level code splitting using `React.lazy` and `<Suspense>` across all admin routes to minimize initial bundle size.

## Deviations from spec

- Transitioned database from MongoDB to PostgreSQL 16 with Drizzle ORM as instructed by the user, while preserving the full architecture, security model, and domain requirements.

## Known issues / technical debt

(none)

## What was built in Phase 0 Foundation

1. **Monorepo Architecture**:
   - `pnpm` workspace orchestrating `apps/web` (public website), `apps/admin` (back-office & portal), `apps/api` (REST API), and `packages/shared` (shared schemas and types).
   - Strict TypeScript configuration (`tsconfig.base.json`), ESLint, Prettier, EditorConfig, and GitHub Actions CI workflow (`.github/workflows/ci.yml`).
   - Docker Compose configuration (`docker-compose.yml`) for PostgreSQL 16 Alpine.

2. **Shared Package (`packages/shared`)**:
   - Zod schemas: `env.schema.ts`, `auth.schema.ts`, `customer.schema.ts`, `enquiry.schema.ts`, `offer.schema.ts`, `reservation.schema.ts`, `payment.schema.ts`.
   - Constants: 58 Algerian Wilayas, User Roles & Permissions Matrix, Offer/Reservation/Payment statuses, DZD Currency definition.
   - Utilities: `money.ts` (`formatDZD`, `parseDZDToCentimes`), `phone.ts` (`normalizeAlgerianPhone`), `dates.ts`.
   - Comprehensive unit tests verified with Vitest.

3. **Design System & Admin SPA (`apps/admin`)**:
   - Cultural Algerian color tokens in Tailwind CSS: Saharan Sand (`#FAF8F5`, `#E6DFD5`), Mediterranean Indigo (`#0D233A`), Tassili Terracotta (`#C85A32`), Desert Saffron (`#E09F3E`), Mint (`#2A9D8F`).
   - Reusable accessible UI components based on Radix UI and Tailwind CSS: `Button`, `Input`, `Badge`, `Card`, `Table`, `Modal`, `Toast`, and `LanguageSwitcher`.
   - Full bilingual RTL/LTR support (French LTR, Arabic RTL with `Readex Pro` font).
   - Living Design System Showcase page demonstrating typography, interactive buttons, modal dialogs, data tables, and badges.

4. **Express REST API (`apps/api`)**:
   - Drizzle ORM database schema mapping 22 entities matching the spec data model.
   - Schema migration runner (`src/database/migrate.ts`) and realistic Algerian seed data (`src/database/seed.ts` for Numidia Voyages, Djanet, Timimoun, Constantine, Umrah).
   - Atomic counter generator in PostgreSQL.
   - Structured JSON logging with Pino.
   - Centralized error handling and rate limiting middleware.
   - `GET /health` with PostgreSQL health verification.
   - `GET /api/v1/public/agency` returning Algerian agency identity and configuration.
   - Integration tests verifying health, agency endpoints, PostgreSQL ACID rollback, and atomic counter generation.
   - Zero production vulnerabilities verified via `pnpm audit --prod`.

## What was built in Phase 1A Auth, RBAC, audit

1. **Security & Cryptography**:
   - High-security password hashing using **Argon2id** (`argon2.argon2id`, 64 MB memory cost, 3 iterations) via `apps/api/src/utils/password.ts`.
   - Progressive account lockout defense against brute force: 5 failed attempts (15m lock), 10 attempts (1h lock), 15 attempts (24h lock), with HTTP 423 status and remaining lockout duration.
   - Dual-token session management via `apps/api/src/utils/tokens.ts`:
     - Short-lived signed JWT access token (15 minutes).
     - Cryptographic rotating refresh token (7 days) stored as SHA-256 hash in PostgreSQL with family tracking.
     - **Reuse Detection**: Replaying an expired/rotated refresh token invalidates the entire token family and logs `REFRESH_TOKEN_REUSE_DETECTED`.
     - Secure `httpOnly`, `SameSite: strict` cookies for token transport.
   - **Immediate Deactivation Cut**: Auth middleware checks database active status on every request so deactivating an employee account severs all access immediately.
   - Password reset flow with single-use, 1-hour expiring SHA-256 hashed tokens.

2. **RBAC & Authorization Middleware**:
   - `authenticate` middleware enforcing token verification, cookie parsing, and DB active-account checks.
   - `requirePermission(...permissions)` middleware dynamically evaluating permissions against `ROLE_PERMISSIONS` matrix for all 5 roles (`owner`, `manager`, `reservation_agent`, `finance`, `content_editor`).
   - `requireRole(...roles)` helper middleware.

3. **Append-Only AuditLog Service**:
   - `createAuditEntry` in `apps/api/src/services/audit.service.ts` inserting structured, immutable security records to `audit_logs` table (logins, lockouts, deactivations, role updates, reset requests, password updates).
   - `GET /api/v1/admin/audit-logs` endpoint with pagination, action filtering, date filtering, and user search.

4. **Staff Management & Auth APIs**:
   - `/api/v1/auth/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `/me`.
   - `/api/v1/admin/users`: List staff, create employee account with Argon2id, retrieve profile, deactivate account, reactivate account, and change role (with self-modification locks).

5. **Back-Office UI (`apps/admin`)**:
   - `LoginPage`: Algerian editorial styling (Warm Parchment, Mediterranean Indigo, Saharan Terracotta), bilingual RTL/LTR toggle, show/hide password, error banners, progressive lockout timer, and quick demo-account filler pills.
   - `ForgotPasswordPage` & `ResetPasswordPage`: Single-use token reset flow with password strength validation.
   - `StaffUsersPage`: Full staff management table with search, role filtering, role badges, active/inactive indicators, "Add Staff" modal dialog, and deactivation confirmation dialogs.
   - `AuditLogsPage`: Searchable, filterable audit event explorer with color-coded badges and expandable JSON diff summaries.
   - `AdminLayout`: Dynamic navigation menu rendering links based on active user's permissions, user profile badge, language switcher, and logout button.
   - `ProtectedRoute`: Authentication and permission guard redirecting unauthenticated users to login or displaying access restriction notices.
   - **Route-level Code Splitting**: Implemented with `React.lazy` and `<Suspense>` across all admin routes.

6. **Quality & Test Verification**:
   - 18 Vitest integration tests in `apps/api/tests/auth.test.ts` verifying all login scenarios, progressive lockout, token rotation, reuse detection, RBAC permissions, immediate deactivation, and audit trail queryability.
   - Zero production vulnerabilities verified with `pnpm audit --prod`.
   - Monorepo builds and typechecks cleanly.

## What was built in Phase 1B Offers, customers, enquiries

1. **Travel Offers & Departures Management**:
   - Back-office CRUD for travel offers (`apps/api/src/services/offer.service.ts`) with bilingual titles, destinations, trip types, day/night duration, integer centime pricing in DZD, hotel details, transport details, day-by-day itineraries, inclusions, exclusions, and photos.
   - Departures & live capacity scheduling (`departures` table) with `maxCapacity`, `bookedPlaces`, and computed `availablePlaces`.
   - Manager Capacity Override (`departures:capacity_override`): strict RBAC permission restriction forbidding reservation agents from exceeding capacity without authorization; records manager overrides with extra places, audited reason, and timestamp in `departures.manager_overrides`.
   - Offer publishing/unpublishing (`offers:publish`) and archiving (`offers:write`).
   - Image upload & processing pipeline (`apps/api/src/utils/media.ts`): magic-byte verification (JPEG, PNG, WebP, AVIF), automated Sharp processing producing WebP and AVIF formats (max 1920px), 320px thumbnail, and base64 blur LQIP placeholders.

2. **Public Catalogue API & Caching**:
   - `GET /api/v1/public/destinations`: List published destinations with filtering by category and featured status.
   - `GET /api/v1/public/offers`: Paginated catalogue endpoint with search, trip type, destination, and price filters. Returns ETag headers and `304 Not Modified` on `If-None-Match`.
   - `GET /api/v1/public/offers/:slug`: Detailed offer itinerary with live departure dates and calculated `availablePlaces`.

3. **Inbound Public Enquiries & Lead Triage**:
   - Anti-bot defense via honeypot field `websiteUrl_hp` (silently rejected or HTTP 400 validation failure).
   - Idempotency key replay protection (`Idempotency-Key` header / body): duplicate submissions return previous response with `idempotentReplay: true` without duplicating rows.
   - Atomic sequential reference generation via PostgreSQL `counters` table: format `ENQ-2026-XXXXXX`.
   - Lead capture and customer matching: matches existing customer by normalized Algerian phone number (`+213...`) or creates a new CRM prospect record.
   - Legal/regulatory disclaimer included on every enquiry: *"Cette demande ne constitue pas une réservation confirmée tant qu'elle n'a pas été validée par un conseiller de l'agence."*
   - Enquiry timeline tracking in `enquiry_activities` table (actions: `created`, `assigned`, `status_changed`, `note_added`, `converted`).
   - Back-office triage endpoints: `GET /admin/enquiries`, `GET /admin/enquiries/:id`, `PATCH /admin/enquiries/:id/status`, `PATCH /admin/enquiries/:id/assign`, `POST /admin/enquiries/:id/notes`.

4. **Customer CRM & Linked Travellers Registry**:
   - Customer profile management (`apps/api/src/services/customer.service.ts`) with Algerian phone normalization (`normalizeAlgerianPhone`), Wilaya codes (1 to 58), preferred language (`ar`/`fr`), and internal notes.
   - Real-time duplicate detection endpoint (`GET /admin/customers/duplicates?phone=...&email=...`).
   - Linked Travellers registry (`travellers` table): encrypted passport numbers, dates of birth, nationality, and special travel requirements.
   - Full customer profile view aggregating linked travellers, enquiries history, and reservations history.

5. **Back-Office UI (`apps/admin`)**:
   - `OffersListPage.tsx`: Offers table with status badges, DZD price formatting (`formatDZD`), trip type badges, search and filters, "New Offer" modal dialog, departures manager modal, and manager capacity override modal.
   - `CustomersListPage.tsx`: CRM customer directory with Algerian phone search, wilaya filter, real-time duplicate warning alert banner in modal, and "New Customer" creation form.
   - `CustomerDetailPage.tsx`: Detailed client card with direct WhatsApp/call shortcuts, linked travellers table with encrypted passport indicators, "Add Traveller" modal, linked enquiries history, and linked reservations history.
   - `EnquiriesListPage.tsx`: Lead triage dashboard with status tabs, customer contact details, interested offer, "Changer le statut" modal, "Affecter un agent" modal with follow-up date, and "Chronologie & Notes" activity timeline modal.
   - Updated navigation in `AdminLayout.tsx` with role-based link visibility for `offers:read`, `customers:read`, and `enquiries:read`.
   - Bilingual localization keys added to `fr.json` and `ar.json` for all new domains.
   - Route-level code splitting using `React.lazy` across all new routes.

6. **Quality & Verification**:
   - 19 Vitest integration tests in `apps/api/tests/offers_crm_enquiry.test.ts` covering catalogue caching, departure capacity overrides, anti-bot honeypot, idempotency key replay, Algerian CRM duplicate detection, linked travellers, and enquiry triage activity timeline.
   - Total test count across monorepo: 43 tests (37 API + 5 shared + 1 admin), all passing.
   - Zero production vulnerabilities verified with `pnpm audit --prod`.
   - Clean monorepo typecheck and build across `shared`, `api`, `admin`, and `web`.

## What was built in Phase 1C Reservations, payments, receipts

1. **Atomic Sequences & Identifiers**:
   - Sequential, collision-free reference generation in PostgreSQL via dedicated `counters` table with atomic upserts (`INSERT ... ON CONFLICT DO UPDATE SET seq = seq + 1 RETURNING seq`).
   - Format: `TRV-2026-XXXXXX` for reservations, `RCP-2026-XXXXXX` for payment receipts, and `RFD-2026-XXXXXX` for refunds.

2. **Immutable Offer & Price Snapshots**:
   - Implemented snapshot freezing upon reservation creation (`offerSnapshot` JSONB column storing title, destination name in AR & FR, departure/return dates, duration in days, unit price in integer centimes, and currency "DZD").
   - Strict business rule compliance: future edits or price changes to the travel offer never alter agreed terms of existing reservations.

3. **Transactional Capacity Checking & Row-Level Locking**:
   - Seat booking wrapped inside strict PostgreSQL ACID transactions (`db.transaction`).
   - Row-level lock acquired via `SELECT ... FOR UPDATE` (`for("update")` on departures) preventing concurrent race conditions and overbooking.
   - Rejects bookings exceeding departure capacity with HTTP 409 Conflict, unless explicit manager override is authorized (`departures:capacity_override`).
   - Cancellation transaction safely releases booked places back to the departure.

4. **Financial Model & Server-Side Balance Computation**:
   - Integer centimes in DZD everywhere (`formatDZD`, `dinarsToCentimes`, `centimesToDinars`). Zero JavaScript floating-point contamination.
   - Balance computed server-side only: `balanceCentimes = agreedTotalCentimes - totalPaidCentimes + totalRefundedCentimes`.
   - Dynamic payment statuses: `unpaid`, `partially_paid`, `paid`, `overpaid`, `refunded`.
   - Authorized discount support (`reservations:discount`), updating agreed total and audited in append-only log.

5. **Payments, Reversals, and Refunds**:
   - Payment recording (`payments` table) supporting Algerian payment methods (`cash`, `bank_transfer`, `cheque`, `cib_edahabia_manual`), bank name, cheque/slip numbers, and cashier user tracking.
   - Non-destructive payment reversals (`isReversed = true`, reversal reason, timestamp).
   - Authorized refunds (`payments:refund`) generating `RFD-2026-XXXXXX`, capped at net collected payments.

6. **Status Progression Lifecycle & RBAC**:
   - Status progression: `pending` -> `awaiting_documents` -> `awaiting_payment` -> `confirmed` -> `completed` / `cancelled`.
   - Status transitions strictly logged with timestamp and author in `statusHistory` JSONB.
   - Confirmation is guarded by `reservations:confirm` (owners and managers only), verifying sales conditions and documents before marking as confirmed.

7. **Linked Travellers Registry**:
   - Support for multiple passengers per reservation via `reservation_travellers` table (full name, date of birth, gender, nationality, encrypted passport number, expiry date, special requests).

8. **Back-Office UI (`apps/admin`)**:
   - `ReservationsListPage.tsx`:
     - Reservation directory with search (reference, customer name, phone), status tabs, payment status filter, and pagination.
     - "Nouvelle réservation" modal dialog with live customer and offer selectors, departure date picking with live remaining seats counter, overcapacity detection requiring manager override with justification, discount calculation in DZD, and dynamic passenger traveller inputs.
   - `ReservationDetailPage.tsx`:
     - Detailed booking dossier with workflow action buttons based on RBAC permissions (`reservations:confirm`, `reservations:discount`, `payments:write`, `payments:refund`).
     - Frozen offer snapshot banner with clear legal guarantee badge.
     - Financial summary card with visual progress bar of paid percentage.
     - Cashier journal table with receipt numbers, amounts in DZD, payment methods, and reversal actions.
     - Official printable Algerian payment receipt modal dialog formatted for print (`window.print()`).
     - Travellers registry table and chronological status progression history.
   - `PaymentsListPage.tsx`:
     - Cash desk & treasury journal with 5 top metric cards: Net Total Encaissé, Espèces en Caisse, Virements Bancaires, Chèques, and Cartes CIB / Edahabia.
     - Filterable by payment method and date range.
     - Reversal modal dialog for cancelled entries.
     - Quick print button for official payment receipts.
   - Route-level code splitting using `React.lazy` and `<Suspense>` for all three pages.
   - Dynamic navigation integration in `AdminLayout.tsx` with `CalendarCheck` and `Receipt` icons guarded by `reservations:read` and `payments:read`.
   - Full bilingual localization in French and Arabic (`fr.json` & `ar.json`).

9. **Quality & Verification**:
   - 16 new Vitest integration tests in `apps/api/tests/reservations_payments.test.ts` testing snapshot immutability, row-locking capacity check, overcapacity rejection, discount authorization, confirmation permissions, cancellation capacity release, atomic receipt generation, server-side balance calculation, payment reversals, and refunds.
   - Total test count across monorepo: 59 passing tests (53 API + 5 shared + 1 admin).
   - Clean monorepo typecheck passed (`pnpm typecheck`).
   - Clean monorepo build passed (`pnpm build`).
   - Zero production vulnerabilities verified with `pnpm audit --prod`.

## Next step

Ready to proceed with **Phase 1D: Public website** (`apps/web`):
- Prerendered/SSG Vite + React with SEO meta tags (OpenGraph, Twitter, canonical, schema.org JSON-LD).
- Homepage with hero section, Algerian destination showcases, featured offers, value propositions, and agency credibility markers.
- Offers listing & search catalogue with filters (destinations, trip types, dates, price in DZD).
- Offer detail pages with day-by-day itineraries, inclusions/exclusions, departure dates & availability indicators, and interactive inquiry form (with honeypot and idempotency keys).
- Contact & Agency about pages with bilingual RTL/LTR switcher (Arabic & French) and responsive mobile design (Core Web Vitals target: LCP < 2.5s, CLS < 0.1, INP < 200ms).
