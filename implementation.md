# MahberConnect Frontend — Implementation Specification

> **This is the master reference document for the frontend build.**
> The full specification is split into 4 parts for readability. Each part is also available as an artifact for detailed review.

---

## Part 1 — Overview, Routes, Components
See: [implementation-part1.md](../../.gemini/antigravity/brain/15257b75-2c62-4bc2-b7ec-926eb9645589/implementation-part1.md)

**Sections:**
1. **Application Overview** — Purpose, target users, core features
2. **Page & Route Map** — 35+ routes covering auth, dashboard, mahber management, events, financial, communication, and admin
3. **Component Inventory** — 24 UI primitives, 8 layout components, 40+ feature components

**Key decisions:**
- Mobile-first responsive layout with bottom nav (mobile) + sidebar (desktop)
- Route groups: `(auth)` for login/register, `(dashboard)` for all protected routes
- All Mahber-specific routes nested under `/mahbers/[id]/...`

---

## Part 2 — Data Models, API Map
See: [implementation-part2.md](../../.gemini/antigravity/brain/15257b75-2c62-4bc2-b7ec-926eb9645589/implementation-part2.md)

**Sections:**
4. **Data Models** — 20+ TypeScript interfaces covering all entities (User, Mahber, Membership, Payment, Event, Poll, etc.) plus API response wrappers
5. **API Integration Map** — Complete table of 50+ endpoints with method, path, request shape, response shape, and auth requirements

**Key decisions:**
- All decimal amounts typed as `string` (Prisma Decimal serialization)
- `PaginatedResponse<T>` wrapper for all list endpoints with `{ data, meta }` shape
- Separate interfaces for DTOs vs entities

---

## Part 3 — Mock Strategy, State, Auth, PWA, Notifications, Payments, Design Tokens
See: [implementation-part3.md](../../.gemini/antigravity/brain/15257b75-2c62-4bc2-b7ec-926eb9645589/implementation-part3.md)

**Sections:**
6. **Mock Data Strategy** — `src/lib/mock/` with typed data + services, delay/error simulation, `NEXT_PUBLIC_USE_MOCK` toggle
7. **State Management** — TanStack Query v5 for server state, Zustand for auth/UI/notification client state
8. **Auth Flow** — JWT in localStorage, Axios interceptors, 401 → logout redirect, middleware.ts route protection
9. **PWA Plan** — next-pwa, manifest.json, offline fallback, service worker caching
10. **Notification Strategy** — Firebase conditional import, permission prompt, foreground message handler, graceful no-op
11. **Payment UI Flow** — Initiate → Chapa redirect → return page → status polling; mock flow with simulated states
12. **Design System Tokens** — Tailwind config for colors, glass utilities, glow effects, animations, typography (Inter font)

---

## Part 4 — File Structure, Dependencies
See: [implementation-part4.md](../../.gemini/antigravity/brain/15257b75-2c62-4bc2-b7ec-926eb9645589/implementation-part4.md)

**Sections:**
13. **File & Folder Structure** — Complete directory tree for the Next.js project (~120 files)
14. **Dependency List** — 22 packages with version recommendations:
    - Core: Next.js 14, React 18, TypeScript 5
    - State: TanStack Query 5, Zustand 4
    - Forms: react-hook-form 7, Zod 3
    - UI: Tailwind 3.4, lucide-react, framer-motion 11
    - PWA: next-pwa 5.6
    - Notifications: firebase 10

---

## Quick Reference — Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.4 |
| Styling | Tailwind CSS 3.4 + custom glass utilities |
| Server State | TanStack Query v5 |
| Client State | Zustand |
| Forms | react-hook-form + Zod |
| HTTP | Axios with JWT interceptors |
| PWA | next-pwa |
| Notifications | Firebase Cloud Messaging |
| Icons | lucide-react |
| Animations | framer-motion |
| Date | date-fns |

## Design System Quick Reference

| Token | Value |
|-------|-------|
| Background | `#0A0F0A` → `#142814` → `#140A0A` gradient |
| Gold Accent | `#EEBD2B` |
| Glass Surface | `rgba(255,255,255,0.03)` + `blur(16px)` |
| Glass Border | `rgba(255,255,255,0.08)` |
| Text Primary | `#F8F8F8` |
| Text Secondary | `#94A3B8` |
| Card Radius | 12px |
| Input Radius | 8px |
| Pill Radius | 999px |
| Base Transition | `all 0.2s ease` |
| Font | Inter (600-700 headings, 400 body) |
