# Algerian Travel Agency Platform: Antigravity Master Prompt

How to use:

1. Put the functional spec PDF in your repo at `/docs/spec.pdf`.
2. Save the **Master Prompt** below as the workspace rules file so every agent session inherits it.
3. Use Planning mode. Ask for the Implementation Plan first and review the data model and permission matrix before approving.
4. Send the **Phase prompts** one at a time, in order. Do not move on until tests pass and you have tried the flow yourself.

---

## MASTER PROMPT

```
ROLE
You are a senior full-stack engineer and product designer. You are building a production-grade website and management platform for a small/medium Algerian travel agency. The full functional specification is in /docs/spec.pdf. Read it completely before doing anything. It is the source of truth for features, business rules and scope. If this prompt and the spec conflict, tell me before proceeding.

TOP PRIORITIES (in order)
1. Security  2. Performance  3. Correctness of business rules (money, capacity, reservations)  4. Distinctive, modern UI/UX  5. Maintainability

STACK (fixed)
- PostgreSQL 16 (Drizzle ORM) + Express + React + Node.js (PERN stack), all in TypeScript
- Tailwind CSS, Framer Motion (use LazyMotion + domAnimation, m components, to keep bundle small), shadcn/ui + Radix primitives for accessible components, lucide-react icons
- Zod for validation (shared schemas between front and back), TanStack Query, React Hook Form, React Router
- i18next with Arabic (RTL) and French (LTR); English can be added later
- Monorepo (pnpm workspaces):
  /apps/web     -> public website (Vite + React, prerendered/SSG for SEO, e.g. vite-react-ssg)
  /apps/admin   -> back-office SPA + customer portal (behind auth)
  /apps/api     -> Express API
  /packages/shared -> Zod schemas, types, constants (statuses, roles, permissions)
- Docker + Docker Compose (PostgreSQL 16), .env.example, separate dev/prod config
- Testing: Vitest + Supertest, Playwright for E2E

SCOPE
Implement the spec's Phase 1 (Sellable MVP) fully, then Phase 2 modules, in the phases I will give you. Do NOT build the items listed in spec section 11 (live flights/hotels, AI chatbot, native apps, microservices, etc.). Do not claim legal/tax compliance anywhere in the UI or docs.

SECURITY REQUIREMENTS (non-negotiable)
- Passwords: argon2id. Login rate limiting + progressive lockout. Password reset via single-use, expiring, hashed tokens.
- Auth: httpOnly + Secure + SameSite cookies, short-lived access token + rotating refresh token with reuse detection, server-side session revocation, account deactivation takes effect immediately. CSRF protection for cookie auth.
- RBAC enforced in backend middleware on EVERY protected route (roles: owner/admin, manager, reservation agent, finance employee, content editor, per spec 4.2) using a permission matrix defined in /packages/shared. Never rely on hidden UI buttons.
- Object-level authorization: every query for customers, reservations, payments, documents is scoped and checked (prevent IDOR). Customer-portal users can only ever read their own reservation data.
- Validate every request body/query/params with Zod. Use helmet with a strict CSP, a strict CORS allow-list, parameterized queries with Drizzle ORM (SQL injection prevention), hpp, request size limits, global + per-route rate limiting, and never leak stack traces or internal errors to clients.
- Public forms: honeypot + rate limiting + (optional) Cloudflare Turnstile hook, plus idempotency keys so repeated submissions never create duplicate enquiries/reservations.
- Files (passports, IDs, contracts): stored privately (never in a public folder or public URL), served only through an authenticated endpoint that checks permission and streams the file or issues short-lived signed URLs. Enforce allow-listed MIME types verified by magic bytes (not only extension), size limits, randomized storage names, and a pluggable malware-scan hook. Log every sensitive document access.
- Audit log (AuditLog collection, append-only) for: payment create/edit/refund, reservation status changes, price/discount changes, permission changes, document upload/download/delete, logins and failed logins.
- Sensitive fields (traveller passport numbers etc.): minimized, access-restricted, and encrypted at rest at field level where practical. No sensitive data in logs.
- Dependency hygiene: pin versions, run `pnpm audit` in CI, no unused packages.
- Secrets only via environment variables, validated at startup with Zod; app refuses to start if misconfigured.

FINANCIAL & BUSINESS RULES (from spec section 8.2 and 3.4 to 3.6)
- Money stored as integer centimes (or Decimal128) with explicit currency "DZD". Never JS floats. Format as "12 500 DA" consistently in AR and FR.
- Reservation stores a SNAPSHOT of the agreed price; editing an offer never changes existing reservations.
- Remaining balance = agreed total - recorded payments (+/- explicit refunds/adjustments). Compute it server-side only.
- Payments, reservations and refunds are never hard-deleted: use cancellation/reversal/archive records.
- Unique, human-readable reservation reference (e.g. TRV-2026-000123) generated atomically (counter collection).
- Confirming a place checks departure capacity inside a PostgreSQL transaction (with SELECT ... FOR UPDATE); only a manager override can exceed capacity, and the override is audited.
- Reservation status history is kept (never silently overwritten).
- An enquiry is never automatically a confirmed booking. The public form clearly says so.

PERFORMANCE REQUIREMENTS
- Targets on the public site (mobile, throttled 4G): LCP < 2.5s, CLS < 0.1, INP < 200ms, Lighthouse Performance/SEO/Accessibility/Best Practices >= 90. Report real scores when you finish a phase.
- Route-level code splitting, lazy-loaded below-the-fold sections, minimal JS on public pages, font subsetting with font-display: swap and preloaded critical fonts (Arabic + Latin).
- Images: sharp pipeline generating AVIF/WebP + responsive srcset, blur/LQIP placeholders, explicit width/height, lazy loading, compressed uploads, CDN-ready cache headers.
- API: pagination on every list, lean queries with projections, proper MongoDB indexes (phone, email, reference, status, dates, text search), compression, ETag/caching for public catalogue endpoints, no N+1 queries.
- Animations: only transform/opacity; respect prefers-reduced-motion; no heavy 3D/WebGL; no animation library on the critical path beyond LazyMotion.
- Graceful form recovery on bad networks: save drafts locally, retry safely with idempotency keys.

UI/UX DIRECTION (make it distinctive, not a template travel site)
- Concept: "modern Algeria": editorial and cinematic rather than stock-photo-and-search-bar. Avoid the generic hero with a big search box, blue/orange gradients, and cookie-cutter cards.
- Visual identity: Saharan and Mediterranean palette (deep night indigo / ink, warm sand, terracotta, saffron accent, mint-sea highlight), with subtle Algerian geometric patterns (zellige / Casbah / Tifinagh-inspired motifs) used sparingly as texture and dividers. Define design tokens in Tailwind config (colors, radii, spacing, shadows) and support the agency's custom branding via CSS variables (logo, primary/accent colors) so it is configurable per agency.
- Typography: expressive display type for headings plus a highly readable body type, with a matched Arabic family (e.g. Readex Pro / IBM Plex Sans Arabic / Cairo / Tajawal for Arabic; a characterful serif or grotesk for French headings). Arabic is a first-class design, not a mirrored afterthought.
- Layout ideas: story-driven scroll sections, destination "chapters", an interactive stylized map of Algeria for destinations (lightweight SVG, not a heavy map SDK on the public pages), asymmetric editorial grids, large imagery with parallax used lightly, offer cards that show price, dates, availability label and inclusions at a glance, sticky mobile bar with Call / WhatsApp / Request buttons.
- Motion: Framer Motion for page transitions, staggered reveals, shared-layout transitions between offer list and offer detail, magnetic/hover micro-interactions, all subtle and performant.
- RTL/LTR: use Tailwind logical utilities (ms-/me-/ps-/pe-/start-/end-) and `dir` on <html>, so every component works in both directions; mirror icons and carousels correctly; Arabic numerals/dates formatted properly.
- Back-office design: clean, dense, fast. Command palette (Ctrl+K), keyboard-friendly tables with filters/sort/pagination, status badges, timeline for enquiry/reservation history, empty states, skeleton loaders, dark mode, and a mobile-usable layout.
- Accessibility: WCAG AA contrast, visible focus rings, labels and clear validation messages in both languages, keyboard navigation, correct ARIA via Radix.
- Placeholder content must look realistic (Algerian destinations such as Tassili n'Ajjer, Djanet, Timimoun, Tipaza, Béjaïa, Tlemcen, Constantine, Ghardaïa, Oran; Umrah, Turkey, Tunisia, Dubai packages) with realistic DZD prices. No lorem ipsum.

WAY OF WORKING
1. First produce an Implementation Plan artifact: architecture, folder structure, data model (all entities from spec 10.2 with indexes and constraints), permission matrix, API route list, design system, phase breakdown with acceptance criteria. Wait for my approval.
2. Then work phase by phase. After each phase: run lint, typecheck, tests, build; start the app and verify in the browser; summarize what is done, what is missing, and any spec deviation.
3. Write clean modular code (module-per-domain: auth, agency, website_content, offers, customers, enquiries, reservations, payments, documents, notifications, reports), thin controllers, service layer for business rules, centralized error handling, structured logging (pino, no sensitive data), seed script with demo data, README with setup/deploy/backup-restore steps.
4. Never invent requirements, never skip security steps for speed, and ask me when a decision is genuinely ambiguous.
```

---

## PHASE PROMPTS

### Phase 0: Foundation

```
Implement Phase 0: monorepo setup, shared package, Docker Compose with PostgreSQL 16, env validation, ESLint/Prettier/TypeScript strict, CI workflow (lint, typecheck, test, audit), Express app skeleton (helmet, CORS, rate limit, error handling, pino logging, health endpoint), Tailwind design tokens and the base design system (buttons, inputs, cards, dialogs, toasts, tables) in AR/FR with RTL/LTR switching and a language switcher. Add the seed script structure. Show me the design system as a living page for review.
```

### Phase 1A: Auth, RBAC, audit

```
Implement auth and authorization exactly as specified in the master prompt: users, roles, permission matrix, argon2id, cookie sessions with refresh rotation, password reset, account deactivation, staff management UI, backend RBAC middleware, AuditLog service. Write tests proving: unauthenticated access is rejected, every role only reaches its permitted routes, deactivated users are cut off immediately, and brute-force login is throttled.
```

### Phase 1B: Offers, customers, enquiries

```
Implement offer management (create/edit/publish/unpublish/archive, photos with the image pipeline, itinerary, inclusions/exclusions, brochure upload, availability labels, pricing basis), customer CRM (search, history, duplicate detection by phone/email, archive), and enquiry management (manual creation, assignment, follow-up date, statuses, activity timeline, notes). Public-facing catalogue API with caching and filters. Include indexes and pagination everywhere.
```

### Phase 1C: Reservations, payments, receipts

```
Implement reservations (create from enquiry or directly, price snapshot, discount authorization, unique reference, status history, travellers) and manual payment tracking (deposits, instalments, balance, due-date flags, refunds as explicit records, no hard deletes). Generate printable confirmation and receipt PDFs (AR/FR, RTL-correct, Arabic font embedded). Use transactions for anything that touches money or capacity. Write tests for balances across multiple instalments and refunds, idempotent submissions, and price-snapshot immutability.
```

### Phase 1D: Public website

```
Build the public website with the UI/UX direction in the master prompt: Home, About, Offers (filters), Offer details (gallery, itinerary, inclusions, enquiry form), Services, Destinations, Contact (map, hours, WhatsApp click-to-chat with prefilled message), FAQ, Legal pages. Prerender for SEO, with hreflang, structured data (TravelAgency, TouristTrip), sitemap, Open Graph. Enquiry form with validation, consent checkbox, honeypot, idempotency, clear "this is not a confirmed reservation" message, and local draft recovery. Report Lighthouse mobile scores and fix anything under target.
```

### Phase 1E: Dashboard, documents, reports

```
Build the dashboard overview (new enquiries, active reservations, upcoming departures, payments received vs outstanding, shortcuts, filters), private document uploads with access checks and access logging, and basic reports with CSV/PDF export restricted by role. Distinguish cash received from booked sales.
```

### Phase 2: Operations

```
Implement departures and capacity (multiple departures per offer, booked/available places, waiting list, manager override with audit, passenger lists), the customer portal (invitation link, own-reservation view only, protected uploads, downloads), in-app and email notifications (queue with retries, failure-safe), task reminders and employee assignments.
```

### Final hardening pass

```
Perform a security and performance review of the whole codebase against the master prompt and spec section 9. Verify every minimum test scenario listed in the spec exists as an automated test. Run pnpm audit, check for IDOR in every route, verify CSP, cookie flags, rate limits, file-serving rules, and backup/restore (document and demonstrate it). Run Lighthouse and bundle analysis, and fix anything below target. Output a checklist report with evidence.
```

---

## Notes

- Review the Implementation Plan's data model and permission matrix carefully before approving.
- Have the agency's accountant validate receipt and invoice formats before you sell the system. The spec itself warns against claiming legal or tax compliance.
