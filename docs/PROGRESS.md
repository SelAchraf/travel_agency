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
| Phase 1D Public website                       | Completed     | Responsive bilingual site (AR/FR), interactive SVG map of Algeria, catalogue, offer details, sticky mobile action bar, booking modal with honeypot & idempotency, SEO JSON-LD |
| Phase 1E Dashboard, documents, reports        | Completed     | Operational KPIs, strict Cash vs Sales separation, magic-byte document vault, audit logs on file access, Excel-ready UTF-8 BOM CSV exports, admin UI |
| Phase 2 Operations                            | Completed     | Departures manifest & capacity override, tokenized Anti-IDOR customer portal, document vault, messaging, Algerian WhatsApp & operational alerts |
| Final hardening                               | Completed     | 110 automated tests passing, end-to-end lifecycle verification, automated backup & restore scripts, 0 audit vulnerabilities, production README |

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

## What was built in Phase 1D Public website

1. **Architecture & Performance**:
   - Built full public website in `apps/web` using Vite + React 18 with TypeScript.
   - Route-level code splitting using `React.lazy` and `<Suspense>` across all 11 pages.
   - Framer Motion animation restricted strictly to `<LazyMotion features={domAnimation}>` for zero bundle bloat.
   - Initial client bundle optimized to ~128 kB gzip.
   - Explicit image dimensions and lazy loading (`loading="lazy"`, `decoding="async"`).
   - Preloaded fonts with `font-display: swap` (`Playfair Display`, `Plus Jakarta Sans`, and `Readex Pro`).

2. **Bilingual RTL/LTR Localization**:
   - Complete i18next configuration (`apps/web/src/i18n/`) with dynamic `dir="rtl"` / `dir="ltr"` and body font switching (`font-arabic` for Readex Pro Arabic, `font-sans` for Plus Jakarta Sans French).
   - Full translation parity across 12 namespaces (`nav`, `common`, `home`, `offers`, `offerDetail`, `destinations`, `services`, `about`, `contact`, `faq`, `bookingModal`, `footer`) in `fr.json` and `ar.json`.
   - `LanguageSwitcher.tsx` with instantaneous language toggling.

3. **Homepage & Interactive Algeria SVG Map (`HomePage.tsx`, `AlgeriaMap.tsx`)**:
   - Saharan hero section with atmospheric backdrop, compelling bilingual slogan, and quick search bar (destinations & trip types).
   - Stylized lightweight SVG Map of Algeria with interactive pins and hover cards for iconic regions: Djanet (Tassili), Timimoun (Gourara), Constantine (Ponts Suspendus), Tipaza (Ruines), Oran (Santa Cruz), Taghit (Saoura), Ghardaïa (M'Zab), Tamanrasset (Hoggar), and Alger. Accessible with keyboard controls and direct offer links.
   - Featured offers grid with real DZD prices formatted via `formatDZD`.
   - 4 Algerian Trust Pillars: Licence d'État N° 16/0423/AVT, Guides touaregs & locaux, Tarifs transparents en Dinars sans frais cachés, Matériel bivouac & 4x4 grand confort.

4. **Offers Catalogue & Deep Itinerary (`OffersPage.tsx`, `OfferDetailPage.tsx`)**:
   - Searchable, filterable catalogue with live filters: search keyword, destination picker, trip type (trekking, guided tour, beach stay, Umrah), and maximum price slider.
   - Detailed trip dossier with hero photo banner, accommodation & 4x4 transport details, day-by-day expandable itinerary, inclusions & exclusions checklists.
   - Sticky booking card with guaranteed price banner ("Prix ferme garanti à la réservation"), departure date picker with live remaining seat counts, and direct WhatsApp / Phone shortcuts.

5. **Destinations Showcase (`DestinationsPage.tsx`, `DestinationDetailPage.tsx`)**:
   - Categorized destination directory (Sahara, Circuits Nationaux, Omra & Pèlerinage).
   - Dedicated destination detail pages with historical context, best travel period, and dynamically linked active departures.

6. **Agency Services, About & FAQ (`ServicesPage.tsx`, `AboutPage.tsx`, `FAQPage.tsx`)**:
   - Services page covering the 6 pillars of Algerian travel: Saharan treks, cultural circuits, coastal stays, Umrah/Hajj, ticketing/hotels, and visa/permit assistance.
   - About page presenting the 10+ years story, official accreditation notice (Licence N° 16/0423/AVT, Registre de Commerce 16/00-098234B24), and branch locations in Alger-Centre and Oran.
   - FAQ accordion answering top questions regarding booking steps, accepted Algerian payment modes (cash, CCP, bank transfer BNA/BEA, CIB), travel permits in the South, bivouac comfort, and cancellation terms.

7. **Contact & Lead Capture Form (`ContactPage.tsx`, `BookingModal.tsx`)**:
   - Contact coordinates with direct phone, WhatsApp link with prefilled bilingual messages, office address, and opening hours.
   - Contact form with honeypot field (`websiteUrl_hp`) and local draft auto-save.
   - Global accessible Booking Modal (`BookingModal.tsx`) supporting preselected offers and departure dates, Zod-compatible validation, local draft recovery (`localStorage`), unique client idempotency key generation, and mandatory legal disclaimer: *"L'envoi de ce formulaire constitue une demande de réservation préalable. Votre réservation ne sera définitivement confirmée qu'après validation de votre dossier par un conseiller de l'agence et versement de l'acompte convenu."*

8. **Sticky Mobile Action Bar (`StickyMobileBar.tsx`)**:
   - Fixed bottom action bar on mobile viewports with direct one-tap calling (`tel:`), WhatsApp chat with prefilled trip inquiry, and primary booking button.

9. **SEO & Structured Data (`SEOHead.tsx`)**:
   - Dynamic document titles, meta descriptions, canonical links, OpenGraph, and Twitter Cards.
   - Google-compliant JSON-LD structured data for `TravelAgency` and `TouristTrip` with prices in DZD.

10. **Legal Pages (`TermsPage.tsx`, `PrivacyPage.tsx`)**:
    - Conditions Générales de Vente (CGV) and Privacy Policy protecting sensitive traveler data and passports without claiming legal compliance.

11. **Quality & Verification**:
    - 4 Vitest unit tests in `apps/web/src/publicWebsite.test.ts` verifying DZD money formatting, translation parity, Algerian licence/contact data, and legal disclaimers.
    - Total test suite across monorepo: 63 tests (53 API + 5 shared + 1 admin + 4 web), all passing.
    - Full monorepo typecheck passed cleanly (`pnpm typecheck`).
    - Full monorepo build passed cleanly (`pnpm build`).
    - Zero production vulnerabilities verified via `pnpm audit --prod`.

## What was built in Phase 1E Dashboard, documents, reports

1. **Database Schema & Migration**:
   - Added `documents` table in PostgreSQL with fields: `id` (UUID), `documentNumber` (`DOC-2026-XXXXXX`), `customerId`, `reservationId`, `travellerId`, `documentType` (`passport`, `national_id`, `visa`, `contract`, `payment_receipt`, `itinerary`, `insurance`), `originalFilename`, `storageFilename` (UUID), `mimeType`, `fileSizeBytes`, `fileSha256`, `isPrivate`, `uploadedByUserId`, `expiryDate`, `notes`, `createdAt`, `updatedAt`.
   - Indexed on `documentNumber`, `customerId`, `reservationId`, `documentType`.
   - Atomic counter support for `DOC` prefix generating sequential references (`DOC-2026-000001`).

2. **Private Document Vault (`apps/api/src/utils/fileVault.ts`, `apps/api/src/services/document.service.ts`)**:
   - Isolated disk storage in non-public directory `storage/private/` with randomized UUID storage filenames (never exposing original filenames or public URLs).
   - **Magic Byte Defense**: Strict inspection of file binary headers (PDF: `%PDF`, JPEG: `0xFF 0xD8 0xFF`, PNG: `0x89 0x50 0x4E 0x47`, WebP: `RIFF...WEBP`), immediately rejecting disguised `.exe` / scripts renamed with innocent extensions.
   - Cryptographic SHA-256 integrity hash calculated and stored for every uploaded document.
   - Authenticated streaming endpoint (`GET /api/v1/admin/documents/:id/download`) guarded by permission `documents:read_sensitive`.
   - **Audit Trail on Every Access**: Records `DOCUMENT_ACCESS`, `DOCUMENT_UPLOAD`, and `DOCUMENT_DELETE` events in the append-only `audit_logs` table.

3. **Operational & Financial Dashboard (`apps/api/src/services/dashboard.service.ts`, `apps/api/src/routes/admin/dashboard.routes.ts`)**:
   - `GET /api/v1/admin/dashboard/summary` endpoint guarded by `reports:operational`.
   - **Strict Financial Distinction** (mandated by rule `02-business-rules.md` and spec 4.3):
     - **Cash Received (Encaissements réels)**: Actual cash collected in DZD centimes from active payments net of refunds.
     - **Booked Sales (Ventes engagées)**: Contracted reservation values from active bookings.
     - **Outstanding Balances (Créances)**: Balance remaining to be collected from customers.
   - Operational KPIs: New enquiries requiring follow-up, active reservations count, upcoming departures in next 30 days, reservations missing documents.
   - Daily Alerts: Departures nearing capacity (occupancy ≥ 80%), unassigned inquiries, bookings awaiting identity documents.
   - Upcoming departures list with occupancy progress bar and recent payments/enquiries.

4. **Financial & Operational Reporting (`apps/api/src/services/report.service.ts`, `apps/api/src/routes/admin/report.routes.ts`)**:
   - `GET /api/v1/admin/reports/financial` guarded by `reports:financial`: date-range filtering, gross cash, refunds, net cash collected, payment method breakdown (cash, bank transfer, cheque, CIB), and monthly collections trend.
   - `GET /api/v1/admin/reports/operational` guarded by `reports:operational`: departures occupancy and passenger counts, enquiry conversion funnel (total received, in progress, converted, conversion rate %), reservations status breakdown.
   - `GET /api/v1/admin/reports/export-csv`: CSV exports with **UTF-8 Byte Order Mark (`\uFEFF`)** ensuring instant, uncorrupted rendering in Microsoft Excel for Arabic and French characters. Supports:
     1. `reservations`: References, customer names, phones, agreed totals, discounts, statuses.
     2. `payments`: Official receipt numbers (RCP), reservation references, payment methods, slip numbers, amounts.
     3. `enquiries`: Prospect details, destinations requested, passenger counts, statuses.
     4. `passengers`: Departure manifests with full traveler names, dates of birth, room allocations, and primary contacts.

5. **Back-Office UI (`apps/admin`)**:
   - `DashboardPage.tsx`: Top KPI cards with Cash Received vs Booked Sales distinction, alert cards, quick action buttons (New Customer, New Offer, New Booking, Record Payment), next departures with occupancy progress bars, recent enquiries and payments. Default landing page after login.
   - `DocumentsPage.tsx`: Document vault table with type filtering, search, magic-byte upload modal dialog, secure direct download, and delete confirmation dialog.
   - `ReportsPage.tsx`: Tabbed view with Financial Report (date picker, method distribution, monthly trend), Operational Report (enquiry funnel, departure occupancy), and Excel-ready CSV Export triggers.
   - Navigation updated in `AdminLayout.tsx` with `LayoutDashboard`, `FileText`, and `BarChart3` links.

6. **Quality & Verification**:
   - 18 Vitest integration tests in `apps/api/tests/dashboard_documents_reports.test.ts` covering magic byte verification, disguised script rejection, atomic document reference generation, secure download streaming, access audit logging, RBAC checks on reports and file operations, and UTF-8 BOM CSV exports.
   - Total test suite across monorepo: **81 tests** (71 API + 5 shared + 1 admin + 4 web), all passing.
   - Full monorepo typecheck passed cleanly (`pnpm typecheck`).
   - Full monorepo build passed cleanly (`pnpm build`).
   - Zero production vulnerabilities verified via `pnpm audit --prod`.

## What was built in Phase 2 Operations & Customer Portal

1. **Group Departures & Passenger Manifests (`apps/api/src/services/departure.service.ts`, `apps/admin/src/pages/DeparturesPage.tsx`)**:
   - Departure lifecycle management (`open`, `closed`, `completed`, `cancelled`) with live occupancy tracking and progress bars.
   - Comprehensive passenger manifest endpoint (`GET /api/v1/admin/departures/:id/manifest`) returning full traveler names, dates of birth, room allocation, primary contact indicator, passport deposit verification, contact phones, reservation reference, and payment balance.
   - Printable manifest dialog with formatted passenger list, room breakdown, and quick Excel CSV export trigger.
   - **Manager Capacity Override**: Modal and endpoint (`PATCH /api/v1/admin/departures/:id/override`) requiring `departures:capacity_override` permission, updating departure max capacity inside a PostgreSQL transaction, and recording an explicit audit log entry (`CAPACITY_OVERRIDE`).

2. **Customer Self-Service Portal (`/portal` & `/api/v1/portal`)**:
   - **Passwordless Magic Link Generation** (`POST /api/v1/admin/customers/:id/portal-link`): Generates 32-byte cryptographic random tokens with SHA-256 hash storage and 30-day expiration.
   - Direct Magic Link sharing from CRM (`apps/admin/src/pages/CustomerDetailPage.tsx`) with one-tap copy and WhatsApp prefilled greeting.
   - Magic link verification (`POST /api/v1/portal/auth/verify-link`) issuing 7-day secure `httpOnly`, `SameSite: strict` portal session cookies (`portalToken`).
   - **CRITICAL ANTI-IDOR SECURITY ENFORCEMENT**: `portalAuth` middleware extracts and verifies the customer identity from the authenticated JWT. All portal queries strictly enforce `WHERE customer_id = req.portalCustomer.id`. Any attempt by Customer A to query Customer B's reservation or document returns a strict 404/403.
   - Self-service reservation dossier (`/portal/reservations/:id`): Complete trip itinerary, agreed price snapshot, recorded payments, remaining balance due in DZD centimes, status progress timeline, traveler list with document deposit badges.
   - Self-service document vault (`POST /api/v1/portal/documents/upload` & `GET /api/v1/portal/documents/:id/download`): Direct upload of traveler passports and IDs with magic-byte MIME validation (PDF, JPEG, PNG) and secure streaming download.
   - Direct customer messaging thread (`POST /api/v1/portal/messages` & `GET /api/v1/portal/messages`): Allows customers to submit inquiries, questions, and change requests directly to agency staff.

3. **Operational Alerts & Notifications Queue (`apps/api/src/services/notification.service.ts`, `apps/admin/src/components/layout/NotificationBell.tsx`)**:
   - PostgreSQL `notifications` table tracking overdue balance collection alerts, upcoming departure reminders (≤ 7 days), missing traveler document alerts, and new incoming customer messages.
   - Automated system alerts scan engine (`POST /api/v1/admin/notifications/scan`) checking all active departures and bookings with deduplication.
   - **Algerian WhatsApp Deep Links**: Formats Algerian numbers (`0550...` / `0770...`) into international format (`https://wa.me/213...?text=...`) for one-tap WhatsApp payment reminders and customer communication.
   - Header notification bell (`NotificationBell.tsx`) in back-office layout with real-time unread badge, quick WhatsApp launch buttons, mark-as-read action, and manual alert refresh.

4. **Quality & Verification**:
   - 17 Vitest integration tests in `apps/api/tests/operations_portal.test.ts` verifying:
     - Departure listing, status updates, and manifest generation.
     - Manager capacity override and audit trail creation.
     - Magic link generation, verification, and portal session authentication.
     - Anti-IDOR enforcement: Customer A accessing Customer B's reservation or document returns 404.
     - Magic-byte document upload and validation.
     - Customer message submission and notification creation.
     - Automated system alert scanning and WhatsApp deep link formatting.
   - Total test suite across monorepo: **98 tests** (88 API + 5 shared + 1 admin + 4 web), all passing!
   - Full monorepo typecheck passed cleanly (`pnpm typecheck`).
   - Full monorepo build passed cleanly (`pnpm build`).
   - Zero production vulnerabilities verified via `pnpm audit --prod`.

## What was built in Final Hardening Pass

1. **End-to-End Lifecycle & Security Audit Suite (`apps/api/tests/e2e_full_lifecycle.test.ts`)**:
   - 12 comprehensive end-to-end integration tests validating the full traveler journey and security boundaries:
     - Public honeypot spam bot trapping (`websiteUrl_hp`).
     - Client-side UUID idempotency key enforcement for repeated submissions on slow Algerian networks.
     - Staff CRM customer creation, prospect assignment, and field-level encrypted traveler passport entry.
     - Confirmed reservation creation with atomic snapshot pricing and row-level locked capacity updates.
     - Cashier payment collection with sequential receipt generation (`RCP-2026-XXXXXX`) and server-side balance computation.
     - Strict financial separation of gross cash received vs booked sales in reports.
     - 30-day tokenized magic link generation and secure portal session issuance.
     - Anti-IDOR customer isolation guarantee (Customer A cannot access Customer B's reservation or documents).
     - Group departure passenger manifest extraction with balances and room allocations.
     - Manager capacity override with mandatory audited reason in the append-only `audit_logs` table.

2. **Automated Backup & Restore Infrastructure (`scripts/backup.sh`, `scripts/restore.sh`)**:
   - Production PostgreSQL database dump (`pg_dump`) + private documents archive (`apps/api/storage/private`).
   - Gzip stream integrity verification on backup creation.
   - Automated retention policy purges archives older than N days (`--keep 14`).
   - Safe restoration script with interactive overwrite confirmation and `--force` flag for CI.
   - Post-restore database verification query validating table counts across `users`, `travel_offers`, `customers`, `reservations`, and `payments`.
   - Integrated root commands: `pnpm backup` and `pnpm restore`.

3. **Production Documentation & Deployment Architecture (`README.md`)**:
   - Comprehensive production guide covering monorepo structure, prerequisites, quick start, demo credentials for all 5 RBAC roles, backup/restore procedures, security architecture, financial rules, and Nginx reverse-proxy setup.

4. **Quality & Verification**:
   - Total test suite across monorepo: **110 tests** (100 API + 5 shared + 1 admin + 4 web), all passing!
   - Full monorepo typecheck passed cleanly (`pnpm typecheck`).
   - Full monorepo build passed cleanly (`pnpm build`).
   - Zero production vulnerabilities verified via `pnpm audit --prod`.

## Project Completion Summary

All development phases outlined in `spec.pdf` and `docs/PLAN.md` are **100% completed, hardened, and verified**:
- **Phase 0 Foundation**: PERN stack, pnpm monorepo, cultural Algerian design system tokens, PostgreSQL schema & atomic sequence counters.
- **Phase 1A Auth & RBAC**: Argon2id password hashing, progressive lockout, rotating refresh tokens with reuse detection, RBAC permission matrix, and append-only audit logging.
- **Phase 1B Offers, CRM & Enquiries**: Travel offers catalogue, group departures, Algerian CRM with 58 wilayas, duplicate detection, and inbound enquiries.
- **Phase 1C Reservations & Payments**: Immutable price snapshots, row-locking capacity check, cashier journal, sequential receipts, and printable voucher views.
- **Phase 1D Public Website**: Bilingual (AR/FR) responsive site, interactive SVG map of Algeria, mobile sticky action bar, accessible booking modal with honeypot & idempotency, SEO JSON-LD.
- **Phase 1E Dashboard & Reports**: Operational KPIs, strict Cash vs Sales separation, private magic-byte document vault, audit logs on file access, Excel-ready UTF-8 BOM CSV exports.
- **Phase 2 Operations & Customer Portal**: Group departure manifests, manager capacity overrides, passwordless magic-link customer portal, Anti-IDOR security guarantees, and Algerian WhatsApp deep links.
- **Final Hardening**: Full lifecycle E2E tests, automated backup & restore scripts, 110/110 passing tests, zero vulnerabilities, production README.

