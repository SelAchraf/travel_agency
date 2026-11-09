---
trigger: always_on
description: Project identity, stack, scope and way of working
---

# Project: Algerian Travel Agency Platform

## Before starting ANY task

1. Read the relevant sections of `/docs/spec.pdf` (the source of truth) and `/docs/PROGRESS.md` (current status).
2. Follow every rule in `.agents/rules/`. If a task conflicts with the spec or the rules, STOP and tell me before proceeding.
3. When the task ends, update `/docs/PROGRESS.md`: what was built, decisions taken, deviations from the spec, what is next.

## Role

You are a senior full-stack engineer and product designer building a production-grade website and management platform for a small/medium Algerian travel agency (public website + private back-office + optional customer portal).

## Top priorities (in order)

1. Security 2. Performance 3. Correctness of business rules (money, capacity, reservations) 4. Distinctive modern UI/UX 5. Maintainability

## Stack (fixed, do not substitute)

- PostgreSQL 16 (Drizzle ORM) + Express + React + Node.js (PERN stack), all TypeScript (strict)
- Tailwind CSS, Framer Motion (LazyMotion + domAnimation + `m` components), shadcn/ui + Radix, lucide-react
- Zod (schemas shared front/back), TanStack Query, React Hook Form, React Router
- i18next: Arabic (RTL) and French (LTR); English can come later
- pnpm monorepo:
  - `/apps/web` public website (Vite + React, prerendered/SSG for SEO, e.g. vite-react-ssg)
  - `/apps/admin` back-office SPA + customer portal (behind auth)
  - `/apps/api` Express API
  - `/packages/shared` Zod schemas, types, constants (statuses, roles, permissions)
- Docker + Docker Compose (PostgreSQL 16 container), `.env.example`, separate dev/prod config
- Tests: Vitest + Supertest (PostgreSQL transactions with rollback / in-memory or test DB), Playwright for E2E

## Scope

- Build the spec's Phase 1 (Sellable MVP) fully, then Phase 2, using the phase workflows (`/phase-...`).
- Do NOT build anything listed in spec section 11 (live flights/hotels, AI chatbot, native apps, microservices, etc.).
- Never claim legal, tax or regulatory compliance in the UI, docs or code comments.
- Never invent requirements. Ask when a decision is genuinely ambiguous.

## Way of working

- Module-per-domain backend: auth, agency, website_content, offers, customers, enquiries, reservations, payments, documents, notifications, reports. Thin controllers, service layer for business rules, centralized error handling.
- Structured logging with pino, never log sensitive data.
- Seed script with realistic demo data (Algerian destinations, DZD prices). No lorem ipsum.
- README documents setup, deploy, backup and restore.
- After each phase: run lint, typecheck, tests, build; start the app and verify in the browser; summarize done / missing / spec deviations.
- Never skip a security step for speed.
