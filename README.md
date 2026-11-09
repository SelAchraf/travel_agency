# Numidia Voyages - Development Setup

Quick guide to launch the application in development mode.

---

## 1. Prerequisites

- **Node.js**: v20+
- **pnpm**: v9+
- **PostgreSQL**: PostgreSQL 16+ running locally OR Docker installed

---

## 2. Setup & Database

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL (if using Docker)
pnpm docker:up

# 3. Migrate and seed initial data
pnpm seed
```

---

## 3. Launch Development Servers

Start all services (Public Web, Admin SPA, and Backend API) concurrently:

```bash
pnpm dev
```

_(Alternatively, launch services separately: `pnpm dev:api`, `pnpm dev:admin`, or `pnpm dev:web`)._

---

## 4. Access URLs

- **Public Website**: [http://localhost:3000](http://localhost:3000)
- **Admin Back-Office**: [http://localhost:3001](http://localhost:3001)
- **API Health Check**: [http://localhost:4000/health](http://localhost:4000/health)