# Numidia Voyages - Algerian Travel Agency Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v9+-orange.svg)](https://pnpm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-110%20Passing-brightgreen.svg)]()
[![Security Audit](https://img.shields.io/badge/Security-0%20Vulnerabilities-success.svg)]()

Production-grade bilingual travel agency website, private back-office ERP, and customer self-service portal designed specifically for Algerian travel agencies (domestic tourism, Sahara expeditions, and international/Umrah tours).

---

## Table of Contents

1. [Architecture & Monorepo Structure](#1-architecture--monorepo-structure)
2. [Prerequisites](#2-prerequisites)
3. [Quick Start & Local Development](#3-quick-start--local-development)
4. [Demo Accounts & RBAC Roles](#4-demo-accounts--rbac-roles)
5. [Automated Backup & Restore](#5-automated-backup--restore)
6. [Security & Protection Architecture](#6-security--protection-architecture)
7. [Financial & Business Rules](#7-financial--business-rules)
8. [Testing & Quality Verification](#8-testing--quality-verification)
9. [Production Deployment Guide](#9-production-deployment-guide)
10. [License & Disclaimers](#10-license--disclaimers)

---

## 1. Architecture & Monorepo Structure

Built on the **PERN stack** (PostgreSQL 16, Drizzle ORM, Express, React, and Node.js 20) with 100% strict TypeScript across a high-performance `pnpm` monorepo.

```
travel_agency/
├── apps/
│   ├── web/               # Public website (Vite + React, bilingual AR/FR, interactive SVG Algeria map, SEO)
│   ├── admin/             # Back-office SPA + Customer Self-Service Portal (behind auth & magic links)
│   └── api/               # Express REST API (module-per-domain, Drizzle ORM, Argon2id, RBAC, audit logs)
├── packages/
│   └── shared/            # Shared Zod schemas, types, Algerian wilayas, money & phone formatting
├── scripts/
│   ├── backup.sh          # Production PostgreSQL dump & private documents archive script
│   └── restore.sh         # Atomic restore verification script with table count validation
├── backups/               # Automated backup archives directory
├── docker-compose.yml     # PostgreSQL 16 Alpine container configuration
├── .env.example           # Validated environment variable blueprint
└── docs/
    ├── spec.pdf           # Product specification & requirements
    ├── PLAN.md            # Architectural implementation plan & RBAC matrix
    └── PROGRESS.md        # Real-time implementation log & status
```

---

## 2. Prerequisites

- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v9.0.0` or higher (`corepack enable && corepack prepare pnpm@latest --activate`)
- **PostgreSQL**: PostgreSQL 16+ running locally **OR** Docker & Docker Compose
- **Tools**: `pg_dump` and `psql` (for backup and restore scripts)

---

## 3. Quick Start & Local Development

### 1. Clone & Install Dependencies

```bash
git clone <repository-url> travel_agency
cd travel_agency
pnpm install
```

### 2. Environment Configuration

Copy the example environment file and configure credentials:

```bash
cp .env.example .env
```

Key environment settings in `.env`:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://travel_user:travel_password_secure_2026@127.0.0.1:5432/travel_agency
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
RATE_LIMIT_MAX=300
PRIVATE_STORAGE_DIR=./storage/private
```

### 3. Start Database & Seed Demo Data

Launch the PostgreSQL container and seed the database with realistic Algerian travel data:

```bash
# Start PostgreSQL via Docker Compose
pnpm docker:up

# Run schema migrations and populate demo data
pnpm seed
```

The seed script initializes:
- **Agency Profile**: Numidia Voyages & Tourisme (Licence N° 16/0421/AVT, Alger HQ & Oran Branch).
- **5 Staff Accounts**: Pre-configured accounts across all RBAC roles with Argon2id passwords.
- **Iconic Destinations**: Djanet (Tassili N'Ajjer), Timimoun (L'Oasis Rouge), Constantine, and Umrah.
- **Rich Offers & Departures**: Complete pricing in integer centimes, itinerary, and hotel/transport details.

### 4. Launch Development Servers

Start the API, Public Website, and Admin Back-Office concurrently:

```bash
pnpm dev
```

| Application | URL | Description |
| :--- | :--- | :--- |
| **Public Website** | [http://localhost:3000](http://localhost:3000) | Public catalogue, SVG interactive map, enquiry modal |
| **Admin Back-Office** | [http://localhost:3001](http://localhost:3001) | Staff ERP, reservations, cashier journal, reports |
| **Customer Portal** | [http://localhost:3001/portal](http://localhost:3001/portal) | Self-service reservation dossier & document upload |
| **Backend REST API** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | REST API endpoints |
| **API Health Check** | [http://localhost:4000/health](http://localhost:4000/health) | PostgreSQL connectivity & uptime status |

---

## 4. Demo Accounts & RBAC Roles

All demo accounts share the password: `PasswordSecure2026!`

| Email | Role | Permissions Scope |
| :--- | :--- | :--- |
| `admin@numidiavoyages.dz` | `owner` | Full agency administration, user management, audit logs, capacity overrides |
| `manager@numidiavoyages.dz` | `manager` | Reservation approvals, discounts, overrides, operations & reports |
| `agent@numidiavoyages.dz` | `reservation_agent` | Customer CRM, enquiry management, reservation creation, portal links |
| `finance@numidiavoyages.dz` | `finance` | Payment collection, receipts, cashier journal, refunds, financial reports |
| `editor@numidiavoyages.dz` | `content_editor` | Destinations and travel offer catalogue management |

---

## 5. Automated Backup & Restore

### Backup Procedure

The platform includes an automated backup script that exports the entire PostgreSQL database and archives private customer documents (passports, IDs):

```bash
# Database dump + private documents archive
pnpm backup
# Or run directly with custom retention:
./scripts/backup.sh --with-files --keep 30
```

- Backups are timestamped and compressed: `backups/db_backup_YYYYMMDD_HHMMSS.sql.gz` and `backups/storage_backup_YYYYMMDD_HHMMSS.tar.gz`.
- Gzip stream integrity is verified automatically upon creation.
- Automated retention policy purges archives older than N days.

### Restore Procedure

To restore the database and private storage from a backup archive:

```bash
# Interactive restore with safety confirmation
./scripts/restore.sh backups/db_backup_20261111_015914.sql.gz --with-files backups/storage_backup_20261111_015914.tar.gz

# Automated / CI non-interactive restore
./scripts/restore.sh backups/db_backup_20261111_015914.sql.gz --force
```

The script restores the schema and data, unpacks private documents, and executes an automated integrity query checking table counts across `users`, `travel_offers`, `customers`, `reservations`, and `payments`.

---

## 6. Security & Protection Architecture

The platform is engineered according to strict security requirements:

- **Authentication & Progressive Lockout**: Passwords hashed using **Argon2id** (64MB memory, 3 iterations). Progressive account lockout triggers on brute-force attempts: 5 failed attempts (15m lockout), 10 attempts (1h), 15 attempts (24h).
- **Session Security**: Short-lived JWT access token (15m) + rotating refresh token (7d) stored as SHA-256 hash in PostgreSQL. Reuse detection revokes the token family immediately upon breach. Cookies are `httpOnly`, `Secure`, and `SameSite: strict`.
- **Immediate Deactivation Cut**: Authentication middleware verifies account active status directly in the database on every request, terminating access immediately upon employee deactivation.
- **Strict RBAC & Object-Level Authorization (Anti-IDOR)**: Role-based permissions enforced on every backend endpoint. Customer portal sessions strictly scope all queries to `WHERE customer_id = req.portalCustomer.id`.
- **Private Document Vault & Magic-Byte Verification**: Passports and national IDs are stored in an unexposed directory with randomized UUID filenames. Uploaded files are verified by inspecting binary magic bytes (`%PDF`, `\xFF\xD8\xFF`, etc.), blocking disguised executables. Every document access is audited.
- **Append-Only Audit Log**: Security-critical actions (payments, status modifications, overrides, document downloads, logins) are permanently recorded in the immutable `audit_logs` table.
- **Anti-Spam & Public Idempotency**: Public enquiry and reservation forms include honeypot traps (`websiteUrl_hp`) and support client-generated UUID idempotency keys to eliminate duplicate submissions on slow mobile networks.

---

## 7. Financial & Business Rules

- **Zero Floating-Point Math**: All money is represented strictly as integer centimes (1 DZD = 100 centimes) with explicit currency `"DZD"`. Formatted consistently as `"12 500 DA"` in French and `"12 500 دج"` in Arabic.
- **Immutable Price Snapshot**: Reservations freeze the offer price at the moment of booking (`offerSnapshot`). Subsequent catalogue price edits never alter existing bookings.
- **Atomic Sequential References**: Generated using a dedicated PostgreSQL sequence table with atomic updates (`TRV-2026-000001`, `RCP-2026-000001`, `RFD-2026-000001`, `DOC-2026-000001`, `ENQ-2026-000001`).
- **Row-Level Locked Capacity Checks**: Confirming a reservation locks the departure row (`SELECT ... FOR UPDATE`) inside a PostgreSQL transaction to prevent race conditions. Overbooking requires an authorized manager override with a mandatory audited reason.
- **Cash Received vs Booked Sales**: Reports and dashboards strictly distinguish actual cash collected in hand from total contracted sales.

---

## 8. Testing & Quality Verification

The test suite runs with Vitest and Supertest across all packages:

```bash
# Run all 110 automated tests
pnpm test

# Run strict TypeScript typechecking
pnpm typecheck

# Run production asset bundling
pnpm build

# Run dependency vulnerability audit
pnpm audit --prod
```

### Monorepo Test Breakdown (110 Tests Passing):
- **`apps/api` (100 tests)**:
  - `auth.test.ts` (14 tests): Argon2id, lockout, refresh token rotation, token reuse revocation, RBAC matrix, deactivation cut.
  - `offers_crm_enquiry.test.ts` (19 tests): Offers CRUD, departures, customer CRM, duplicate detection, Algerian phone normalization, enquiry management.
  - `reservations_payments.test.ts` (16 tests): Atomic TRV generation, price snapshots, row-locking capacity check, cashier payments, receipts, server balance.
  - `dashboard_documents_reports.test.ts` (18 tests): Magic-byte document validation, file download streaming, audit logs, KPIs, UTF-8 BOM CSV exports.
  - `operations_portal.test.ts` (17 tests): Departure manifests, manager capacity overrides, magic links, Anti-IDOR customer portal, customer messaging, system alert scanner.
  - `e2e_full_lifecycle.test.ts` (12 tests): Complete visitor-to-booking lifecycle, honeypot anti-spam, idempotency, deposit collection, portal verification.
  - `health.test.ts` (4 tests): Health check, PostgreSQL rollback, atomic counters, agency profile.
- **`packages/shared` (5 tests)**: Currency formatting, DZD centimes parsing, Algerian phone validator.
- **`apps/admin` (1 test)**: Design system tokens and styling parity.
- **`apps/web` (4 tests)**: Public site translations, legal disclaimers, contact details, currency display.

---

## 9. Production Deployment Guide

### Option A: Docker Compose (Recommended)

1. Set production environment variables in `.env`:
   ```bash
   NODE_ENV=production
   DATABASE_URL=postgresql://travel_user:<secure_password>@postgres:5432/travel_agency
   JWT_ACCESS_SECRET=<64_char_random_hex>
   JWT_REFRESH_SECRET=<64_char_random_hex>
   ```

2. Build and run containers:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

### Option B: Bare Metal / Virtual Machine with PM2 & Nginx

1. **Build Monorepo**:
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```

2. **Run Schema Migrations**:
   ```bash
   pnpm --filter @travel-agency/api run seed
   ```

3. **Start Node.js API with PM2**:
   ```bash
   pm2 start apps/api/dist/server.js --name "numidia-api" -i max
   ```

4. **Nginx Reverse Proxy Configuration**:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name agency.dz www.agency.dz;

       ssl_certificate /etc/letsencrypt/live/agency.dz/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/agency.dz/privkey.pem;

       # Security Headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;

       # Public Website Static Files
       location / {
           root /var/www/travel_agency/apps/web/dist;
           try_files $uri $uri/ /index.html;
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }

       # Admin Back-Office & Portal
       location /admin {
           alias /var/www/travel_agency/apps/admin/dist;
           try_files $uri $uri/ /admin/index.html;
       }

       location /portal {
           alias /var/www/travel_agency/apps/admin/dist;
           try_files $uri $uri/ /admin/index.html;
       }

       # Backend API Proxy
       location /api/ {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           client_max_body_size 15M;
       }
   }
   ```

---

## 10. License & Disclaimers

- **Intellectual Property**: Proprietary software developed for Algerian travel agency operations.
- **Regulatory Notice**: This platform is a management and operations tool. It does not provide legal, tax, or official regulatory advice. Agencies must configure their own licence numbers, terms, and tax records in accordance with Algerian tourism ministry standards.
