---
trigger: always_on
description: Performance targets and techniques
---

# Performance requirements

## Targets (public site, mobile, throttled 4G)

- LCP < 2.5s, CLS < 0.1, INP < 200ms.
- Lighthouse Performance, SEO, Accessibility, Best Practices all >= 90.
- Report real measured scores at the end of every front-end phase and fix anything below target.

## Front end

- Route-level code splitting, lazy-load below-the-fold sections, minimal JS on public pages.
- Fonts: subset (Arabic + Latin), `font-display: swap`, preload critical fonts.
- Images: sharp pipeline producing AVIF/WebP + responsive srcset, blur/LQIP placeholders, explicit width/height, lazy loading, compressed uploads, CDN-ready cache headers.
- Animations: transform and opacity only, respect `prefers-reduced-motion`, no heavy 3D/WebGL, Framer Motion via LazyMotion only.
- Graceful form recovery on slow networks: local draft saving, safe retries with idempotency keys.

## API and database

- Pagination on every list endpoint. Lean queries with projections. No N+1 queries.
- Indexes for commonly searched fields: phone, email, reference, status, dates, text search.
- Response compression; ETag/Cache-Control for public catalogue endpoints.
- Analyze bundles (visualizer) and keep dependency count low.
