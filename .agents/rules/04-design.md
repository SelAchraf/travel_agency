---
trigger: glob
globs: apps/web/**,apps/admin/**,packages/ui/**
description: UI/UX direction for public website and back-office
---

# UI/UX direction (distinctive, not a template travel site)

## Concept

"Modern Algeria": editorial and cinematic. Avoid the generic hero with a big search box, blue/orange gradients and cookie-cutter cards.

## Visual identity

- Saharan and Mediterranean palette: deep night indigo/ink, warm sand, terracotta, saffron accent, mint-sea highlight.
- Subtle Algerian geometric patterns (zellige, Casbah, Tifinagh-inspired) used sparingly as texture and dividers.
- Design tokens in the Tailwind config (colors, radii, spacing, shadows). Agency branding (logo, primary/accent colors) configurable through CSS variables.

## Typography

- Expressive display type for headings plus a highly readable body type.
- Matched Arabic family (Readex Pro, IBM Plex Sans Arabic, Cairo or Tajawal). Arabic is a first-class design, not a mirrored afterthought.

## Public site layout ideas

- Story-driven scroll sections and destination "chapters".
- Lightweight stylized SVG map of Algeria for destinations (no heavy map SDK on public pages).
- Asymmetric editorial grids, large imagery, light parallax.
- Offer cards showing price, dates, availability label and inclusions at a glance.
- Sticky mobile bar with Call / WhatsApp / Request actions.

## Motion (Framer Motion)

Page transitions, staggered reveals, shared-layout transitions between offer list and detail, subtle hover micro-interactions. Always performant and reduced-motion aware.

## RTL / LTR

- Tailwind logical utilities (ms-, me-, ps-, pe-, start-, end-) and `dir` on `<html>`.
- Mirror icons and carousels correctly; format Arabic dates and numbers properly.

## Back-office

- Clean, dense, fast. Command palette (Ctrl+K), keyboard-friendly tables with filters/sort/pagination, status badges, timelines for enquiry/reservation history, empty states, skeleton loaders, dark mode, mobile-usable layout.

## Accessibility

- WCAG AA contrast, visible focus rings, labels and clear validation messages in both languages, keyboard navigation, correct ARIA via Radix.

## Content

Realistic placeholder content: Tassili n'Ajjer, Djanet, Timimoun, Tipaza, Béjaïa, Tlemcen, Constantine, Ghardaïa, Oran; Umrah, Turkey, Tunisia and Dubai packages, with realistic DZD prices. No lorem ipsum.
