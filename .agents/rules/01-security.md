---
trigger: always_on
description: Non-negotiable security requirements for all code
---

# Security requirements (non-negotiable)

## Authentication and sessions

- Passwords hashed with argon2id. Login rate limiting plus progressive lockout.
- Password reset: single-use, expiring, hashed tokens.
- httpOnly + Secure + SameSite cookies; short-lived access token + rotating refresh token with reuse detection; server-side session revocation.
- Deactivating an account cuts access immediately.
- CSRF protection for cookie-based auth.

## Authorization

- RBAC enforced in backend middleware on EVERY protected route, using the permission matrix in `/packages/shared`. Roles: owner/admin, manager, reservation agent, finance employee, content editor (spec 4.2). Never rely on hidden UI buttons.
- Object-level authorization: every query on customers, reservations, payments and documents is scoped and checked (prevent IDOR). Customer-portal users can only read their own reservation data.

## Input and transport

- Validate every body, query and param with Zod.
- helmet with a strict CSP, strict CORS allow-list, parameterized queries with Drizzle ORM (SQL injection prevention), hpp, request size limits, global and per-route rate limits.
- Never leak stack traces or internal errors to clients.
- HTTPS-only in production.

## Public forms

- Honeypot + rate limiting + optional Cloudflare Turnstile hook.
- Idempotency keys so repeated submissions never create duplicate enquiries or reservations.

## Files (passports, IDs, contracts)

- Stored privately, never in a public folder or public URL.
- Served only through an authenticated endpoint that checks permission and streams the file, or via short-lived signed URLs.
- Allow-listed MIME types verified by magic bytes (not just extension), size limits, randomized storage names, pluggable malware-scan hook.
- Log every sensitive document access.

## Audit and data protection

- Append-only AuditLog for: payment create/edit/refund, reservation status changes, price/discount changes, permission changes, document upload/download/delete, logins and failed logins.
- Sensitive fields (traveller passport numbers etc.): minimize collection, restrict access, encrypt at rest at field level where practical. No sensitive data in logs.
- Secrets only via environment variables, validated at startup with Zod; the app refuses to start if misconfigured.
- Pin dependency versions, run `pnpm audit` in CI, no unused packages.
