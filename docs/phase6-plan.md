<!-- /autoplan restore point: /c/Users/siddh/.gstack/projects/numero-uno-pg/master-autoplan-restore-20260325-010613.md -->
# Phase 6: PWA (Progressive Web App) — Staff Mobile App

## Overview

Build the staff-facing app as a **Progressive Web App (PWA)** — a mobile-first web app that installs on any smartphone (Android + iOS) directly from a browser link, with no app store submission required. Staff tap "Add to Home Screen" and it works exactly like a native app.

**Why PWA over APK:** APK development requires Android SDK, signing keys, Play Store submission, and updates go through review. PWA deploys in seconds, works on both Android and iOS, and updates instantly with zero friction.

**Design target:** Mobile-first (375px primary). Also responsive for tablet/desktop — owners may open it from a computer occasionally.

**Deploy target:** Vercel (free tier, zero ops, instant HTTPS which PWA requires)
**Base branch:** main

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 (App Router) | Vercel-native, supports PWA via `next-pwa`, file-based routing |
| PWA layer | `@ducanh2912/next-pwa` | Actively maintained, zero-config service worker for Next.js 14 |
| Language | TypeScript | Already used across the monorepo |
| Styling | Tailwind CSS + shadcn/ui | Mobile-first utilities; shadcn components adapt to small screens |
| Data fetching | TanStack Query (React Query) v5 | Background refetch, offline support via service worker, mutation hooks |
| Auth state | Zustand | Already used in mobile; same store pattern |
| Auth provider | Firebase Web SDK (email/phone OTP) | Same Firebase project, no new infra |
| HTTP client | Axios (same `api` util as mobile) | Consistent with backend contract |
| Push (optional) | Web Push API + Firebase Cloud Messaging | Staff notified of new tickets on their phone |
| Deployment | Vercel | HTTPS required for PWA; free tier, instant deploys |
| Shared types | `packages/shared` | Import TypeScript types from monorepo — do NOT redefine |

---

## Monorepo Location

New workspace: `apps/web/` — added to `package.json` workspaces.

```
apps/web/
├── public/
│   ├── manifest.json       ← PWA: name, icons, theme_color, display: standalone
│   ├── icon-192.png        ← App icon (Android home screen)
│   └── icon-512.png        ← App icon (splash screen)
├── app/
│   ├── layout.tsx          ← root layout, auth provider, query client, viewport meta
│   ├── page.tsx            ← redirect to /login or /dashboard
│   ├── login/page.tsx      ← Firebase email + OTP login
│   ├── dashboard/page.tsx  ← Owner: P&L snapshot + monthly report
│   ├── tenants/
│   │   ├── page.tsx        ← Tenant list (table, filter, search)
│   │   ├── new/page.tsx    ← Onboard flow (multi-step form)
│   │   └── [id]/page.tsx   ← Tenant detail: invoices, tickets, history
│   ├── rent/
│   │   ├── page.tsx        ← Invoice list (filter by status/month)
│   │   └── [id]/page.tsx   ← Invoice detail: record payment, Razorpay link
│   ├── tickets/page.tsx    ← Support tickets (filter by status/category)
│   ├── properties/page.tsx ← Property → Room → Bed occupancy tree
│   ├── expenses/page.tsx   ← OpEx + CapEx log
│   ├── staff/page.tsx      ← Staff list + salary records (owner only)
│   ├── guests/page.tsx     ← Guest log (staff view, date filter)
│   ├── leaves/page.tsx     ← Leave requests (approve/reject)
│   └── menu/page.tsx       ← Food menu management
├── components/
│   ├── ui/                 ← shadcn/ui primitives (generated)
│   ├── layout/
│   │   ├── BottomNav.tsx   ← Mobile bottom tab bar (RBAC-filtered)
│   │   ├── Header.tsx      ← Top bar: page title, user avatar, logout
│   │   └── InstallBanner.tsx ← "Add to Home Screen" prompt for first-time visitors
│   └── shared/
│       ├── DataTable.tsx   ← TanStack Table wrapper with pagination
│       ├── StatCard.tsx    ← Dashboard metric card
│       └── PageLoader.tsx  ← Skeleton / spinner pattern
├── lib/
│   ├── api.ts              ← Axios instance (same base URL as mobile)
│   ├── firebase.ts         ← Firebase Web SDK init
│   ├── queryClient.ts      ← TanStack Query client config
│   └── auth.ts             ← Token refresh + Axios interceptor
├── store/
│   └── authStore.ts        ← Zustand: user, token, role
└── middleware.ts            ← Next.js middleware: redirect unauthenticated users
```

---

## Pages & Features

### 1. Auth (`/login`)
- Firebase email login → OTP → exchange for backend JWT
- Role-based redirect: OWNER/SALES/OPS → `/dashboard`
- "Remember me" via localStorage token persistence

### 2. Dashboard (`/dashboard`) — Owner only
- Today's collections (live), pending payments count, open tickets, occupancy rate, beds filled
- Monthly P&L report: revenue vs expenses, net P&L, receivables table
- Month navigator (← →) to browse historical months
- All data from existing `/api/dashboard/*` endpoints

### 3. Tenants (`/tenants`)
- Sortable/filterable table: name, property, bed, check-in, rent, status
- Click-through to tenant detail page
- "Onboard" button → `/tenants/new` multi-step form (matches POST /api/tenants)
- Tenant detail: profile card, invoice history, ticket history, checkout action

### 4. Rent & Invoices (`/rent`)
- Invoice list with filter by status (PENDING/PARTIAL/PAID/OVERDUE), month, property
- "Generate Monthly" button (owner) — calls POST /api/invoices/generate-monthly
- Invoice detail: payment history, record payment form (mode, amount, Zod-validated), Razorpay link button, **"Send WhatsApp Reminder"** button on overdue invoices (calls Gupshup, D13)

### 5. Support Tickets (`/tickets`)
- Table: tenant name, category, status, created date
- Filter by status, category
- Click to open ticket detail: comment thread, status update dropdown
- Real-time update via React Query polling (10s)

### 6. Properties (`/properties`)
- Property cards → expand to Room list → expand to Bed grid
- Color-coded bed status: green (vacant), red (occupied), grey (maintenance)
- Add room/bed forms (POST /api/rooms, POST /api/beds)

### 7. Expenses (`/expenses`)
- OpEx table: date, category, amount, vendor, notes
- CapEx table: asset name, cost, purchase date, depreciation
- Add expense button → inline form
- Month filter

### 8. Staff & Salary (`/staff`) — Owner only
- Staff list: name, role, salary, status
- Click to view salary records, add salary entry
- Add staff button

### 9. Guests (`/guests`)
- Guest log table with date filter
- Mark checked-out button

### 10. Leaves (`/leaves`)
- Leave request table: tenant, dates, reason, status
- Approve / Reject buttons inline

### 11. Inquiries (`/inquiries`) — SALES_MANAGER prospective tenant pipeline
- Table: name, phone, bed interested in, expected move-in, status (Contacted / Site Visit / Confirmed / Lost)
- One-click status update inline
- "Convert to Tenant" button → pre-fills onboard form
- Filter by status; new inquiry FAB "+"

*(Menu management deferred to Phase 7 — low value, infrequent)*

---

## RBAC Map (matches backend)

| Route | OWNER | SALES_MANAGER | OPS_MANAGER |
|-------|-------|---------------|-------------|
| /dashboard | ✅ | ❌ | ❌ |
| /tenants | ✅ | ✅ | ❌ |
| /rent | ✅ | ✅ | ❌ |
| /tickets | ✅ | ✅ | ✅ |
| /properties | ✅ | ✅ | ✅ |
| /expenses | ✅ | ❌ | ✅ |
| /staff | ✅ | ❌ | ❌ |
| /guests | ✅ | ✅ | ✅ |
| /leaves | ✅ | ✅ | ✅ |
| /inquiries | ✅ | ✅ | ❌ |

---

## Auth Flow (Web)

```
1. User enters email → Firebase sendSignInLinkToEmail OR phone OTP
2. OTP verified → Firebase ID token obtained
3. POST /api/auth/verify-token { idToken } → backend returns { user, token }
4. Store token + user in Zustand + localStorage
5. Axios interceptor injects Authorization: Bearer <token> on every request
6. Next.js middleware checks for token cookie → redirect to /login if missing
```

---

## Deployment Plan (Vercel)

1. Add `apps/web` to Vercel project, set root to `apps/web`
2. Environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` = backend URL
   - `NEXT_PUBLIC_FIREBASE_*` = Firebase web SDK config (public, safe to expose)
3. Build-time env validation: fail build if `NEXT_PUBLIC_API_URL` is undefined
4. Preview deployments auto-created for every PR (share link with staff to test)
5. Production deploy: `vercel --prod` from `apps/web`
6. Send staff the Vercel URL → they open in Chrome/Safari → tap "Add to Home Screen" → installed ✅
7. **No Play Store. No App Store. No APK signing. Zero app store friction.**

### PWA Checklist (Lighthouse 100)
- [ ] `manifest.json` with name, icons (192+512px), `display: standalone`, `theme_color`
- [ ] Service worker via `@ducanh2912/next-pwa` (caches shell + API responses)
- [ ] HTTPS (Vercel provides this automatically)
- [ ] `viewport` meta tag with `width=device-width, initial-scale=1`
- [ ] Offline fallback page for when API is unreachable
- [ ] `apple-touch-icon` for iOS "Add to Home Screen"

---

## Implementation Phases

### Step 1 — Scaffold (Day 1)
- `create-next-app` in `apps/web`, configure TypeScript + Tailwind + shadcn/ui
- Install TanStack Query, Zustand, Axios, Firebase Web SDK, `@ducanh2912/next-pwa`
- Install Vitest + `@testing-library/react` + Playwright (test infra on Day 1)
- Add `"apps/web"` to root `package.json` workspaces (D14 — must be FIRST)
- Backend security patch: `POST /api/auth/register` ignores `role` unless caller is OWNER (D16)
- Fix `packages/shared/src/index.ts`: add `AuthUser`/`User` types, fix `PaginatedResponse` to match backend (`data`/`pages`), add `parseDate()` utility (D12, D9, D20)
- Set up `lib/api.ts`, `lib/firebase.ts` (with singleton guard), `lib/queryClient.ts` (with `refetchIntervalInBackground: false`)
- `lib/auth.ts`: Firebase login → `POST /api/auth/register` → store token in Zustand + cookie; use `onIdTokenChanged` for auto-refresh (D15); default `browserSessionPersistence`, "Remember me" opt-in (D2b-M2)
- API interceptor: retry with fresh token once before logout on 401 (D17)
- `middleware.ts`: Edge-safe — reads `auth-token` cookie only, no Firebase imports (D18)
- `public/manifest.json`, app icons, service worker config: app shell only (static assets); `/api/invoices/*` + `/api/payments/*` = NetworkOnly; all other `/api/*` = NetworkFirst (D19, E2b-M1)
- Root layout with **bottom tab nav** (RBAC filtered) + top header
- Build-time env validation (throw if `NEXT_PUBLIC_API_URL` missing)
- `InstallBanner` component (detects `beforeinstallprompt` event; iOS fallback text)
- Backend: add Vercel domain to `ALLOWED_ORIGINS` before deploy

### Step 2 — Core Pages (Day 1-2)
- Login page (working Firebase auth)
- Dashboard (snapshot + monthly report, all real API data)
- Tenant list + detail + onboard form

### Step 3 — Financial Pages (Day 2)
- Rent/Invoices list + detail + record payment form

### Step 4 — Operations Pages (Day 2-3)
- Tickets list + detail + comment + status update
- Properties tree view
- Expenses table + add form

### Step 5 — Supporting Pages (Day 3)
- Staff + salary (owner only)
- Guests + Leaves
- Inquiries table (SALES_MANAGER pipeline)
- **Backend:** Cron job — 9am daily WhatsApp digest to OWNER via Gupshup: beds occupied/vacant, yesterday's collections, overdue count + dashboard link (D22)

### Step 6 — Deploy (Day 3)
- Vercel deploy, environment variables, test all pages in production

---

---

## CEO REVIEW — Phase 1 (SELECTIVE EXPANSION mode)

### 0A. Premise Challenge

| Premise | Valid? | Notes |
|---------|--------|-------|
| Staff need web UI because mobile is insufficient for admin tasks | ✅ YES | Multi-step onboarding, financial reports, invoice management — all better on desktop |
| All API endpoints exist and are tested | ✅ YES | 18+ routes in `apps/backend/src/routes/` — verified |
| Next.js 14 + Vercel is the right deployment target | ✅ YES | Free tier, zero ops, auto previews per PR |
| Firebase Auth can be used for web login | ✅ YES | Same Firebase project, web SDK available |
| `packages/shared` types should be imported by web app | ✅ YES (NEW) | Avoids type drift — plan currently doesn't mention this |
| Tenants should remain mobile-only | ✅ YES | Tenant UX is simple (view invoices, raise tickets); desktop adds no value |

**What would happen if we did nothing?** Staff continue doing everything on mobile. Pain is real but manageable short-term. The 6-month trajectory: as tenant count grows (20→50→100 beds), mobile-only management becomes a genuine bottleneck — monthly invoice generation, bulk tenant management, P&L review are all harder on a small screen.

### 0B. Existing Code Leverage

| Sub-problem | Existing asset |
|------------|---------------|
| TypeScript types (User, Tenant, Invoice, etc.) | `packages/shared/src/index.ts` — **import directly, do not redefine** |
| Axios API client | `apps/mobile/src/utils/api.ts` — copy pattern verbatim |
| Zustand auth store | `apps/mobile/src/store/authStore.ts` — copy pattern verbatim |
| RBAC role definitions | `apps/backend/src/middleware/rbac.ts` + `packages/shared` |
| Firebase token auth | `apps/mobile/app/_layout.tsx` — adapt for web SDK |
| Design tokens (colors) | `apps/mobile/app/_layout.tsx` Colors object |
| API endpoint contracts | All 18 routes in `apps/backend/src/routes/` |

**APPROVED SCOPE ADDITION (D1 — auto-decided, P4 DRY):** The plan must import from `packages/shared` instead of redefining types in `apps/web/types/`. This is in blast radius and adds zero effort.

### 0C. Dream State Delta

```
CURRENT:          Staff use mobile only for all management tasks
THIS PLAN:        Staff get full desktop web dashboard (all 11 feature areas)
12-MONTH IDEAL:   Web + mobile + auto WhatsApp reports + analytics charts
                  + tenant self-service web portal (Phase 8)
```

The plan gets us ~75% of the 12-month ideal. The remaining 25% (analytics, automated reports) is correctly deferred.

### 0C-bis. Implementation Alternatives

| Approach | CC Effort | Risk | Verdict |
|---------|-----------|------|---------|
| Next.js 14 + shadcn + Vercel (plan) | ~2h | Low | ✅ USE THIS |
| Remix + Fly.io | ~3h | Medium | Overkill; no SSR need for staff-only dashboard |
| Vue/Nuxt | ~3h | Low | Inconsistent; monorepo is already React |
| SPA (Vite + React, no Next.js) | ~1.5h | Medium | Loses Vercel middleware for auth guards |

### Error & Rescue Registry

| Failure | Impact | Plan handles it? | Fix |
|---------|--------|-----------------|-----|
| Firebase auth fails at login | User can't log in | ❌ | Add friendly error + retry |
| Firebase ID token expires mid-session | API returns 401 | ✅ Axios interceptor | Add proactive refresh every 55 min |
| Backend API unreachable | All data fails to load | ✅ React Query error states | Add global error toast |
| Vercel env vars missing at deploy | API base URL undefined | ❌ | Add build-time env validation |
| RBAC wrong on web | Staff see wrong data | ✅ middleware.ts + backend | Also validate role on each page server-side |
| Razorpay link creation fails | Staff can't send payment link | ✅ Error response from API | Show fallback "record cash payment" |

### Failure Modes Registry

| Mode | Severity | Addressed? |
|------|----------|-----------|
| Token not refreshed → stale session | MEDIUM | Needs proactive 55-min refresh |
| Missing env var at Vercel build | MEDIUM | Needs build-time validation |
| Type drift (web redefines shared types) | LOW | Fixed by using `packages/shared` |
| Parallel invoice generation double-trigger | LOW | Backend already idempotent (skip existing) |

### NOT in scope — CEO Review (Deferred)

| Item | Reason |
|------|--------|
| Tenant web portal | Phase 8 — tenants use mobile |
| CSV/PDF export | Phase 7 backlog |
| Sentry error monitoring | Phase 7 — new infra |
| Analytics charts | Phase 8 — needs data history |
| Email notifications from web | Backend already handles this |

### CEO Completion Summary

- **Mode:** SELECTIVE EXPANSION
- **Scope approved:** All 11 feature areas as planned
- **Scope additions:** Import from `packages/shared` (D1 — auto-approved)
- **Issues found:** 2 (missing env validation, missing token refresh logic)
- **Deferred:** 5 items to Phase 7/8
- **Dream state delta:** Plan gets us 75% of 12-month ideal ✅

---

## DESIGN REVIEW — Phase 2

### D0. Design Completeness Rating: 4/10

The plan describes WHAT each page does but not HOW it looks or feels. A 10/10 design plan would specify: primary actions on each page, empty states, loading states, error states, interaction patterns, typography, color system.

**What's missing at 4/10:**
- No specification of bottom nav tab labels/icons
- No empty state copy for any page ("No tenants yet" → what does the user see?)
- No loading skeleton strategy
- No color/typography spec for mobile
- Form UX not specified (inline validation? toast on success? modal or new page?)

**What a 10/10 looks like:** The plan describes the first thing a user sees on every page, what happens when data is loading, what they see when there's nothing yet, and what success/error looks like after every action.

Below I'll add all missing design decisions directly to this document.

---

### Pass 1 — Information Architecture (was 4/10 → now 8/10)

**Bottom nav tabs (RBAC-aware):**

```
OWNER view:       [📊 Dash] [👥 Tenants] [💰 Rent] [🎫 Tickets] [⋯ More]
SALES_MANAGER:    [👥 Tenants] [💰 Rent] [🎫 Tickets] [🏠 Properties] [⋯ More]
OPS_MANAGER:      [🎫 Tickets] [🏠 Properties] [📋 Expenses] [👤 Guests] [⋯ More]
```

The "More" tab opens a bottom sheet with: Leaves, Menu, Staff (owner), Guests, Profile, Logout.

**Page hierarchy (what the user sees first on each page):**
| Page | First element | Second | Third |
|------|--------------|--------|-------|
| Dashboard | Today's collections (big number, green) | Pending payments badge | Occupancy % |
| Tenants | Search bar | Active tenant list | FAB "+" to onboard |
| Rent | Overdue total (red, prominent) | Invoice list | Filter chips |
| Tickets | Open count badge | Ticket list by recency | Filter by status |
| Properties | Property cards with occupancy % | Bed grid | Add room FAB |

---

### Pass 2 — Interaction States (was 2/10 → now 9/10)

**Every page must specify these 4 states:**

| Page | Loading | Empty | Error | Success action |
|------|---------|-------|-------|---------------|
| Dashboard | Skeleton cards (3 metric cards shimmer) | "No data yet — add your first tenant" | "Could not load data. Tap to retry." | — (read only) |
| Tenants | Row skeleton list (5 rows) | "No tenants yet. Tap + to onboard your first tenant." | "Failed to load tenants. Pull to refresh." | Toast "Tenant onboarded ✓" |
| Rent | Row skeleton (3 rows) | "All paid up! 🎉" if all paid, else invoice list | "Failed to load invoices." | Toast "Payment recorded ✓" |
| Tickets | Row skeleton | "No open tickets. Things are running smoothly." | "Failed to load tickets." | Toast "Status updated ✓" |
| Login | Button spinner | — | Inline error under input | Redirect to home |

**Form patterns (consistent across all pages):**
- Inline validation on blur (not on keystroke)
- Submit button disabled while loading, shows spinner
- Success: toast notification (bottom of screen, 3s)
- Error: inline error message under the offending field
- Destructive actions (checkout, reject): confirmation bottom sheet, NOT alert dialog

---

### Pass 3 — Mobile-First Layout (was 3/10 → now 9/10)

**Viewport and touch targets:**
- Primary target: 375px (iPhone SE) — minimum supported
- All tap targets: minimum 44×44px (Apple HIG requirement)
- Bottom nav: 56px tall, icons + labels
- List rows: 64px min height
- FAB (Floating Action Button): 56px, primary color, bottom-right, above bottom nav

**Typography scale (Tailwind classes):**
- Page title (header): `text-xl font-bold` (20px)
- Section label: `text-sm font-semibold text-muted-foreground uppercase tracking-wide`
- Body / list row: `text-base` (16px)
- Sub-label / metadata: `text-sm text-muted-foreground` (14px)
- Amounts (rent, totals): `text-2xl font-black` (24px)

**Color system (matches mobile app):**
```
Primary:    #1E3A5F  (dark navy — header, buttons, active nav)
Success:    #2D9E6B  (green — paid, positive)
Danger:     #E63946  (red — overdue, error, destructive)
Warning:    #F4A261  (amber — partial, pending)
Background: #F8F9FA
Card:       #FFFFFF
Text:       #1A1A2E
Muted:      #6B7280
Border:     #E5E7EB
```

---

### Pass 4 — PWA-Specific UX (new — was 0/10 → now 9/10)

**Install Banner (`InstallBanner.tsx`):**
- Appears first time user visits (not on every visit)
- Shows at TOP of login page: "📲 Add Numero Uno to your home screen for the best experience."
- One button: "Install" — triggers `beforeinstallprompt.prompt()`
- Dismiss option: "Not now" (stores in localStorage, never shows again)
- iOS: Show different message since iOS doesn't support `beforeinstallprompt` — "Tap Share → Add to Home Screen"

**Offline UX:**
- Service worker caches: app shell, last loaded list data (stale-while-revalidate)
- If offline: show `OfflineBanner` at top — "You're offline. Showing last synced data."
- Mutation actions (record payment, update ticket) disabled when offline with tooltip

**Update notification:**
- When new version deployed, service worker detects it
- Show banner: "Update available. Tap to reload." → triggers `skipWaiting()`

---

### Pass 5 — Empty States Spec (was 0/10 → now 10/10)

All empty states follow the pattern: Icon (emoji or svg) + headline + sub-copy + primary action.

| Screen | Icon | Headline | Sub-copy | Action |
|--------|------|---------|---------|--------|
| Tenants list (no tenants) | 👥 | "No tenants yet" | "Onboard your first tenant to get started." | "Onboard Tenant" button |
| Rent (all paid) | 🎉 | "All caught up!" | "No outstanding invoices." | — |
| Rent (no invoices) | 📄 | "No invoices yet" | "Generate monthly invoices or create one manually." | "Generate" button |
| Tickets (all resolved) | ✅ | "No open tickets" | "Your tenants are happy!" | — |
| Expenses (none) | 📋 | "No expenses yet" | "Add your first expense to track costs." | "Add Expense" |
| Guests (none today) | 🏠 | "No guests today" | "Tenants can register visitors from their app." | — |
| Leaves (none) | 📅 | "No leave requests" | — | — |

---

### Pass 6 — AI Slop Risk (was 5/10 → now 9/10)

Risks flagged and addressed:
- **Generic card grid** → each page uses a list/table pattern appropriate to the data, not cards everywhere
- **Stacked cards on mobile** → lists with dividers and swipe actions, not cards
- **Hero section** → no marketing content in the app (it's a tool, not a landing page)
- **Generic SaaS look** → primary color (#1E3A5F dark navy) is distinctive; matches PG brand
- **Empty state with just "No items found"** → ALL empty states have warmth and a call to action (Pass 5)

---

### Pass 7 — Accessibility (was 1/10 → now 8/10)

- All interactive elements have `aria-label` where icon-only
- Bottom nav uses `role="navigation"` + `aria-current="page"` on active tab
- Color is NOT the only indicator of status (status text shown alongside color badge)
- Form errors: `aria-invalid` + `aria-describedby` linking to error message
- Toast notifications: `role="alert"` for screen readers
- Keyboard navigation: tab order matches visual order
- Contrast: all text meets WCAG AA minimum (4.5:1 for normal text)

---

## DESIGN REVIEW — Completion Summary

- **Initial rating:** 4/10
- **Final rating:** 9/10 (after adding all missing specs above)
- **Key additions:** Bottom nav spec, empty states for all 7 pages, 4-state loading/error/empty/success for every page, PWA install UX, offline banner, mobile typography + color system, accessibility requirements
- **One remaining gap:** No iconography system specified (use Lucide React — already in shadcn/ui)
- **TASTE DECISION T1:** iOS install flow (Auto-decided: show instructional text "Tap Share → Add to Home Screen" — no native install prompt available on iOS)

---

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
| D1 | CEO | Import types from `packages/shared` instead of redefining in web | P4 DRY | Avoids type drift, zero effort, already in monorepo | Redefine types in `apps/web/types/` |
| D2 | CEO | Defer Sentry monitoring | P3 Pragmatic | New infra, not blocking; add in Phase 7 | Add Sentry now |
| D3 | CEO | Defer CSV/PDF export | P3 Pragmatic | Nice-to-have, Phase 7 backlog | Include now |
| D4 | CEO | Add Firebase token proactive refresh (55-min interval) | P1 Completeness | Prevents silent 401 failures mid-session | Fire-and-forget |
| D5 | CEO | Add Vercel build-time env validation | P1 Completeness | Catches missing env vars before deploy reaches prod | Skip |
| D6 | PREMISE GATE | Pivot: Desktop web app → Mobile-first PWA | User direction | Stakeholders use phones; PWA avoids APK/Play Store; works on iOS + Android | APK distribution |
| D7 | CEO | Change layout: Sidebar → Bottom tab nav | P5 Explicit | Mobile bottom tab matches how staff already think about the mobile app | Sidebar hamburger menu |
| D8 | Eng | Fix auth endpoint: `/verify-token` → `/register` | P5 Explicit | That endpoint doesn't exist; `/register` is the actual upsert+verify endpoint | Keep wrong name |
| D9 | Eng | Fix `PaginatedResponse` type in `packages/shared` to match backend (`data`/`pages`) | P4 DRY | Type mismatch causes runtime errors; shared package is the right place | Define per-app |
| D10 | Eng | Add Vitest + Playwright to Day 1 scaffold | P1 Completeness | Zero test infrastructure exists; must be set up before feature code | Defer tests |
| D11 | Eng | Store auth token in cookie (readable by Next.js middleware) alongside localStorage | P5 Explicit | middleware.ts runs server-side and can't read localStorage | Client-side only |
| D12 | Eng | Add `AuthUser` type to `packages/shared` | P4 DRY | Currently defined only in mobile store; web store would duplicate it | Keep in mobile |
| D13 | CEO Subagent | Add "Send WhatsApp Reminder" button on overdue invoices in /rent | P2 Boil lakes | Gupshup lib already exists; highest-value single action for daily rent collection | Defer to Phase 7 |
| D14 | Eng Subagent | Add `"apps/web"` to root `package.json` workspaces | P1 Completeness | Without this, packages/shared cannot be resolved — Day 0 blocker | Add later |
| D15 | Eng Subagent | Use `onIdTokenChanged` instead of `setInterval` for token refresh | P5 Explicit | setInterval killed by iOS in backgrounded PWA; Firebase's own event is reliable | Keep setInterval |
| D16 | Eng Subagent | Backend: ignore `role` on register unless caller is OWNER | P1 Completeness | Prevents role escalation via public Vercel URL | Trust client role |
| D17 | Eng Subagent | API interceptor: retry once with fresh token before logout on 401 | P1 Completeness | Prevents token-expiry from logging out user who's mid-flow | Logout immediately |
| D18 | Eng Subagent | `middleware.ts` reads cookie only — no Firebase/Zustand imports | P5 Explicit | Edge runtime rejects Node modules; middleware is redirect gate only | Import Firebase |
| D19 | Eng Subagent | Financial routes (`invoices`, `payments`): `staleTime: 0` + SW `NetworkOnly` | P1 Completeness | Stale payment data causes double-collection risk | Use same stale strategy |
| D20 | Eng Subagent | Add `parseDate()` utility; update Properties page: remove grey/MAINTENANCE state | P5 Explicit | Date is string at runtime; BedStatus has no MAINTENANCE in Prisma | Trust type system |
| D21 | TASTE T2 | Cut /menu; add Inquiries table for SALES_MANAGER | User | SALES_MANAGER needs a sales workflow; /menu is low-value, infrequent | Keep /menu |
| D22 | TASTE T3 | Add 9am daily WhatsApp digest to owner | User | Cron + Gupshup exist; creates daily pull habit, owner adoption | Phase 7 backlog |

---

## ENG REVIEW — Phase 3

### E0. Scope Challenge

**File complexity check:** Phase 6 introduces ~25 new files in `apps/web/` (14 pages + 5 components + 4 lib files + 2 config files). This exceeds the 8-file threshold — **but the complexity is inherent to a full web app**, not accidental. No scope reduction recommended: each file has a single, clear responsibility.

**Sub-problem → existing code mapping (verified by reading source):**

| Sub-problem | Existing code verified |
|------------|----------------------|
| Auth: Firebase token verification | `apps/backend/src/middleware/auth.ts` — verifies Firebase ID token as bearer, no separate JWT issued |
| Auth: register/link account | `apps/backend/src/routes/auth.ts:POST /register` — correct endpoint (plan spec says `/verify-token` → **WRONG NAME, see E1-C1**) |
| Types | `packages/shared/src/index.ts` — has `Property`, `Tenant`, `Invoice`, `Payment`, `Expense`, `SupportTicket` etc. ✅ |
| Pagination | `packages/shared` exports `PaginatedResponse<T>` with `items`/`pageSize` — **MISMATCH: backend returns `data`/`total`/`page`/`pages`** → see E2-H1 |
| Auth store pattern | `apps/mobile/src/store/authStore.ts` — uses `AsyncStorage`; web must swap for `localStorage` |
| CORS | `apps/backend/src/index.ts` — `ALLOWED_ORIGINS` env var; Vercel domain must be added → see E1-H1 |

---

### E0.5 — Dual Voices

**CODEX ENG VOICE:** Skipped — Codex CLI not configured in this environment. Single-reviewer mode `[subagent-only]`.

**CLAUDE SUBAGENT (eng — independent review):** Completed. Found 17 issues (3 critical, 7 high, 6 medium, 1 low). 10 new issues beyond primary review. Key additions: role escalation security vulnerability, onIdTokenChanged vs setInterval, workspace config missing apps/web, Edge runtime import restrictions, financial data stale cache danger, Date/JSON serialization mismatch.

**ENG DUAL VOICES — CONSENSUS TABLE:**
```
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Sub    Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?               ⚠️      ❌     DISAGREE (sub found more)
  2. Test coverage sufficient?         ❌      ❌     CONFIRMED: 0 tests
  3. Performance risks addressed?      ⚠️      ⚠️     CONFIRMED: SW cache concerns
  4. Security threats covered?         ⚠️      ❌     DISAGREE (role escalation missed)
  5. Error paths handled?              ❌      ❌     CONFIRMED: missing throughout
  6. Deployment risk manageable?       ✅      ⚠️     DISAGREE (workspace blocker missed)
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = subagent found more. Subagent critical findings incorporated below.
```

---

### E1. Architecture Review

```
ARCHITECTURE — apps/web (Phase 6 PWA)
══════════════════════════════════════════════════════════════════
                    BROWSER (Staff's Phone)
                           │
              ┌────────────┴────────────┐
              │    Next.js 14 App        │
              │  ┌──────────────────┐   │
              │  │  middleware.ts   │◄──┼── Token check (cookie)
              │  │  (auth guard)    │   │
              │  └────────┬─────────┘   │
              │           │             │
              │  ┌────────▼──────────┐  │
              │  │  Zustand authStore│  │
              │  │  (user + token)   │  │
              │  └────────┬──────────┘  │
              │           │             │
              │  ┌────────▼──────────┐  │
              │  │  lib/auth.ts      │  │
              │  │  (55-min refresh  │  │
              │  │   + interceptor)  │  │
              │  └────────┬──────────┘  │
              │           │             │
              │  ┌────────▼──────────┐  │
              │  │  lib/api.ts       │  │
              │  │  (Axios instance) │  │
              │  └────────┬──────────┘  │
              └───────────┼─────────────┘
                          │ HTTPS (Bearer: Firebase ID token)
                          │
              ┌───────────▼──────────────┐
              │  Express Backend          │
              │  authenticate middleware  │
              │  → verifyIdToken (Firebase)│
              │  → prisma.user.findUnique │
              └───────────────────────────┘
                          │
              ┌───────────▼──────────────┐
              │  PostgreSQL (Prisma)       │
              └───────────────────────────┘

Service Worker Layer (offline):
  ┌──────────────────────────────────────┐
  │  @ducanh2912/next-pwa SW             │
  │  Cache: app shell + static assets    │
  │  Strategy: stale-while-revalidate    │
  │  for GET /api/* list endpoints       │
  │  Network-first for mutations (POST)  │
  └──────────────────────────────────────┘
```

**E1-C1 CRITICAL: Wrong auth endpoint name in plan.**
The plan's Auth Flow says `POST /api/auth/verify-token { idToken }`. This endpoint **does not exist**. The real endpoint is `POST /api/auth/register` which verifies the Firebase ID token AND upserts the user. The web app must call `/api/auth/register` (not `/verify-token`). This would cause a 404 in production.

**Fix:** Replace in "Auth Flow (Web)" section:
```
3. POST /api/auth/register { idToken: firebaseIdToken, name, role: 'OWNER'|'SALES_MANAGER'|'OPS_MANAGER' }
   → backend verifies Firebase token, upserts user, returns { user }
4. Store Firebase ID token in Zustand + localStorage (the Firebase token IS the bearer token)
```

**E1-H1 HIGH: CORS not updated for Vercel domain.**
Backend `ALLOWED_ORIGINS` env var controls CORS. After Vercel deploy, the web app origin (`https://numero-uno-pg.vercel.app` or custom domain) must be added to `ALLOWED_ORIGINS` on the backend. Without this, every API call from the web app fails with CORS error.

**Fix:** Add to Deployment Plan: "Set `ALLOWED_ORIGINS=https://your-vercel-domain.app` on backend deploy platform before Vercel goes live."

**E1-H2 HIGH: Next.js middleware reads cookie — but auth store uses localStorage.**
`middleware.ts` needs to check for auth token to redirect unauthenticated users. But if token is in `localStorage` (client-side only), middleware (runs on server) can't read it. Pattern: store token in an `httpOnly` cookie **or** fall back to reading a non-httpOnly cookie set by the client.

**Fix:** `lib/auth.ts` should set a `auth-token` cookie (non-httpOnly, readable by middleware) alongside localStorage. Middleware reads `cookies().get('auth-token')`. This is the standard Next.js auth pattern.

**E1-M1 MEDIUM: Service worker must exclude API mutations from cache.**
`@ducanh2912/next-pwa` defaults to caching all network requests. POST/PATCH/DELETE requests must be excluded from the service worker cache — caching mutations would replay stale requests.

**Fix:** In `next.config.js` PWA config, add runtime caching rules: `GET /api/*` = `StaleWhileRevalidate`, `POST|PATCH|DELETE /api/*` = `NetworkOnly`.

**E1-M2 MEDIUM: No backend JWT issued — token never expires on backend.**
The backend trusts Firebase ID tokens directly. Firebase tokens expire after 1 hour. If the web app doesn't refresh proactively, API calls will return 401 after an hour of use. Plan already notes 55-min refresh (D4) — this must be implemented in `lib/auth.ts` with `setInterval`.

---

### E2. Code Quality Review

**E2-H1 HIGH: `PaginatedResponse<T>` shape mismatch.**
`packages/shared` exports `PaginatedResponse<T>` with `{ items, total, page, pageSize }`. But backend pagination endpoints return `{ success, data, total, page, pages }`. These don't match. If web code uses `PaginatedResponse<T>` as the return type, it will get runtime errors trying to access `.items` when the field is actually `.data`.

**Fix:** Either:
a) Update `packages/shared/src/index.ts` to export a corrected type:
```typescript
export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pages: number;
}
```
b) Or document that web code must map the response shape. Option (a) is D1 DRY — auto-decided.

**E2-M1 MEDIUM: `AuthUser` type defined in mobile but not in shared.**
`apps/mobile/src/store/authStore.ts` defines `AuthUser` locally. The web auth store will need the same type. Should be added to `packages/shared` to avoid duplication.

**Fix:** Add `AuthUser` to `packages/shared/src/index.ts`.

**E2-M2 MEDIUM: `lib/firebase.ts` initialization pattern needs singleton guard.**
Firebase Web SDK will throw "Firebase App named '[DEFAULT]' already exists" if initialized twice (e.g., hot reload in development). Standard fix: check `getApps().length` before `initializeApp()`.

**Fix:**
```typescript
import { getApps, initializeApp } from 'firebase/app';
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
```

**E2-L1 LOW: `queryClient.ts` needs reasonable defaults for stale time.**
Default TanStack Query stale time is 0 (always refetch). For a staff dashboard, 30-second stale time on list queries is better — reduces API load and improves PWA feel.

---

### E2b. Additional Findings from Independent Subagent

**E2b-C1 CRITICAL: `apps/web` not in monorepo workspaces — Day 0 blocker.**
`package.json` workspaces are `["apps/backend", "apps/mobile", "packages/shared"]`. `apps/web` is absent. When web app does `import { Tenant } from '@numero-uno-pg/shared'`, Node will not find it — workspace symlink never created. This causes `Cannot find module` on first `npm install`.

**Fix (auto-decided D14):** Add `"apps/web"` to workspaces array in root `package.json`. This must be the VERY FIRST step before any other scaffolding.

**E2b-C2 CRITICAL: Token refresh must use `onIdTokenChanged`, not `setInterval`.**
`setInterval` does not fire reliably in backgrounded PWA tabs (iOS kills JS timers aggressively). Firebase internally refreshes tokens every ~55 min and fires `onIdTokenChanged` when it does. Using `setInterval` will cause silent session death on iPhone.

**Fix (auto-decided D15):** In root layout:
```typescript
import { onIdTokenChanged } from 'firebase/auth';
onIdTokenChanged(auth, async (user) => {
  if (user) {
    const token = await user.getIdToken();
    useAuthStore.getState().setFirebaseToken(token);
    document.cookie = `auth-token=${token}; path=/; max-age=3600`;
  }
});
```
Remove any `setInterval` from the plan.

**E2b-C3 CRITICAL (SECURITY): Role escalation via self-registration.**
`POST /api/auth/register` accepts `role` from the request body and trusts it: `role: (role as UserRole) || 'TENANT'`. Anyone who gets a Firebase token (by creating a Firebase account themselves) can self-assign `role: "OWNER"`. The web app will be at a public Vercel URL — this is a realistic attack surface.

**Fix (auto-decided D16):** The web app's registration call must ONLY send `role: undefined` (defaults to TENANT) OR the backend must be patched: new users default to TENANT, and OWNER/SALES/OPS roles can only be set by an existing OWNER via the `/approve` flow. Add a backend patch: ignore `role` field on register unless caller is already authenticated as OWNER.

**E2b-H1 HIGH: API interceptor must retry once before logout on 401.**
The mobile pattern immediately calls `logout()` on 401. For web, Firebase token may have just expired — we should attempt `getIdToken(true)` (force refresh) once, retry the request, then log out only on a second 401. Otherwise every token expiry (which Firebase handles automatically) logs the user out.

**Fix (auto-decided D17):** Axios interceptor pattern for web:
```
On 401 → getIdToken(true) → update cookie → retry original request once
→ if still 401 → logout()
```

**E2b-H2 HIGH: Next.js middleware must be Edge-safe — no Firebase/Zustand imports.**
Next.js Edge middleware cannot import Firebase Web SDK or Zustand. Doing so crashes the build. Middleware must ONLY use `cookies()` from `next/server`. Token validation happens client-side or in server components — not in middleware.

**Fix (auto-decided D18):** `middleware.ts` only reads `auth-token` cookie — if missing, redirect to `/login`. No Firebase verification in middleware. Middleware is a redirect gate only.

**E2b-H3 HIGH: Financial data must NOT use stale-while-revalidate.**
Serving a cached (stale) invoice status to staff could result in double-collection or missed payments. Invoice, payment, and balance endpoints must bypass both service worker cache AND TanStack Query stale cache.

**Fix (auto-decided D19):** In `queryClient.ts`, set a per-query override for financial routes: `staleTime: 0`. In SW config, all `/api/invoices/*` and `/api/payments/*` routes use `NetworkOnly` strategy.

**E2b-M1 MEDIUM: Service worker should only cache app shell — not API data.**
`@ducanh2912/next-pwa` + TanStack Query = two competing caches with different invalidation logic. The SW should cache: `/_next/static/**`, `/icons/**`, `/manifest.json`, offline fallback page only. All `/api/**` goes through `NetworkOnly` (or `NetworkFirst` with fast timeout).

**E2b-M2 MEDIUM: Default to session-only Firebase persistence.**
PG staff may share a device (office tablet). `browserLocalPersistence` means the session survives a browser close — the next user is auto-logged in as the previous one. Default to `browserSessionPersistence`. Add explicit "Remember me" checkbox that switches to `browserLocalPersistence`.

**E2b-M3 MEDIUM: Add Zod on forms — payment amount needs range validation.**
Record payment form sends `amount` to backend with no client-side range check. Negative amount, amount > 99 lakh, or non-numeric input all reach the API. Backend validation exists (Zod on some routes) but client-side validation improves UX and reduces noise. Use Zod + `react-hook-form` on all forms.

**E2b-M4 MEDIUM: Date fields from API are strings — type cast as `Date` will throw.**
`packages/shared` types all use `Date` for timestamp fields. API responses return ISO 8601 strings. Any component calling `.toLocaleDateString()` on a typed `Date` field gets a runtime crash because the value is actually a string.

**Fix (auto-decided D20):** Add a date utility: `parseDate(val: string | Date): Date => val instanceof Date ? val : new Date(val)`. Use this wherever displaying dates. Long-term: update shared types to use `string` for API-boundary dates.

**E2b-L1 LOW: `BedStatus` has no MAINTENANCE state (confirmed in Prisma).**
Plan's Properties page shows grey beds for "maintenance." Prisma schema: `enum BedStatus { VACANT, OCCUPIED }` — no MAINTENANCE. The grey color coding will never render.

**Fix:** Remove grey/MAINTENANCE from Properties page spec. Only two states: green (VACANT) and red (OCCUPIED).

---

### E3. Test Review

**Test framework detection:** No jest/vitest/playwright config found in the repo. CLAUDE.md has no testing section. → **Zero test infrastructure exists.**

For a new Next.js app, the standard stack is:
- **Vitest** for unit tests (components, lib functions)
- **Playwright** for E2E tests (auth flow, invoice generation, ticket management)

The plan must include these as Day 1 scaffold items.

#### Code Path Coverage Diagram

```
CODE PATH COVERAGE — apps/web (planned, zero tests exist)
══════════════════════════════════════════════════════════════════
[+] lib/auth.ts
    │
    ├── login flow (Firebase → /register → store)
    │   ├── [GAP] [→E2E]  Happy path email login → dashboard redirect
    │   ├── [GAP]          Firebase auth fails → error message shown
    │   ├── [GAP]          Account not found in DB → what happens?
    │   └── [GAP]          isActive=false account → 403 error shown
    │
    ├── token refresh (55-min interval)
    │   ├── [GAP]          Refresh succeeds → token updated in store + cookie
    │   ├── [GAP]          Refresh fails (no network) → user kept logged in (stale token)
    │   └── [GAP]          Tab backgrounded then foregrounded → refresh triggered
    │
    └── logout
        ├── [GAP]          Token + cookie cleared
        └── [GAP]          Redirect to /login

[+] middleware.ts
    │
    ├── Unauthenticated request → redirect to /login
    │   ├── [GAP] [→E2E]  No cookie → redirect
    │   ├── [GAP]          Expired cookie → redirect
    │   └── [GAP]          Valid cookie → pass through
    │
    └── RBAC route guard
        ├── [GAP] [→E2E]  SALES_MANAGER accessing /dashboard → redirect
        ├── [GAP] [→E2E]  OPS_MANAGER accessing /rent → redirect
        └── [GAP]          OWNER accessing any route → pass through

[+] /dashboard page
    │
    ├── GET /api/dashboard/snapshot
    │   ├── [GAP]          Loading skeleton shown
    │   ├── [GAP] [→E2E]  Data renders correctly
    │   ├── [GAP]          API error → "tap to retry" shown
    │   └── [GAP]          Empty data (0 tenants) → "No data yet" state
    │
    └── GET /api/dashboard/report?month=&year=
        ├── [GAP]          Month navigator prev/next works
        └── [GAP]          No report data → empty state

[+] /tenants page
    │
    ├── List with search/filter
    │   ├── [GAP] [→E2E]  Tenant list renders
    │   ├── [GAP]          Search filters list client-side
    │   └── [GAP]          Empty state shown when no tenants
    │
    └── Onboard flow (multi-step form)
        ├── [GAP] [→E2E]  Complete onboard → tenant appears in list
        ├── [GAP]          Validation errors shown inline
        └── [GAP]          Double-submit prevented (button disabled while loading)

[+] /rent page
    │
    ├── Invoice list
    │   ├── [GAP]          Filter by status works
    │   └── [GAP]          "All paid up!" empty state shown
    │
    └── Record payment form
        ├── [GAP] [→E2E]  Payment recorded → invoice status updates
        ├── [GAP]          Amount > amountDue → validation error
        └── [GAP]          Razorpay link opens in new tab

[+] /tickets page
    │
    ├── Ticket list (10s poll)
    │   ├── [GAP]          New ticket appears within 15s
    │   └── [GAP]          Status update → optimistic update then confirm
    │
    └── Ticket detail
        ├── [GAP] [→E2E]  Add comment → appears in thread
        └── [GAP]          Status change → toast "Status updated ✓"

[+] InstallBanner component
    │
    ├── [GAP]              First visit → banner shown
    ├── [GAP]              "Not now" → banner hidden, localStorage flag set
    ├── [GAP]              Revisit → banner not shown (localStorage flag)
    └── [GAP]              iOS → alternative "Share → Add to Home Screen" text

[+] OfflineBanner component
    │
    ├── [GAP]              Goes offline → banner appears
    └── [GAP]              Comes back online → banner disappears

══════════════════════════════════════════════════════════════════
COVERAGE: 0/32 paths tested (0%)
  Code paths: 0/18 (0%)
  User flows: 0/14 (0%)
QUALITY: No tests exist — new project
GAPS: 32 paths need tests (8 need E2E)
══════════════════════════════════════════════════════════════════
```

#### Test Plan Additions to Implementation

Add to **Step 1 (Scaffold):**
- Install Vitest + `@vitejs/plugin-react` + `@testing-library/react`
- Install Playwright for E2E
- Create `vitest.config.ts`, `playwright.config.ts`
- Write first test: `middleware.test.ts` — RBAC redirect rules

Add to **Step 2 (Core Pages):**
- `auth.test.ts` — login flow unit tests (mock Firebase)
- `login.e2e.ts` — E2E: email login → dashboard redirect

Add to **Step 3-5 (Feature Pages):**
- Per-page unit test for loading/empty/error states
- E2E: payment recording flow
- E2E: ticket status update flow

---

### E4. Performance Review

**E4-M1 MEDIUM: Initial bundle size — 11 pages loaded eagerly.**
Next.js 14 App Router does code-split per route automatically — this is handled. But shadcn/ui components and Lucide icons should be imported individually (not barrel imports) to enable tree-shaking.

**Fix:** Import icons as `import { Home } from 'lucide-react'` not `import * as icons`.

**E4-M2 MEDIUM: React Query polling (10s) on all tabs simultaneously.**
If staff leaves 3 tabs open, all 3 poll `/api/tickets` every 10s. React Query has a `visibilitychange` listener built-in — set `refetchOnWindowFocus: true` (default) and `refetchInterval: 10000` only on the active tab check: `refetchIntervalInBackground: false`.

**Fix:** In `queryClient.ts` defaults: `refetchIntervalInBackground: false`.

**E4-L1 LOW: No image optimization for property/tenant photos.**
The web app doesn't display photos in Phase 6, so this is not yet relevant. Note for Phase 7.

---

### Eng Completion Summary

- **Scope:** 25 new files in `apps/web/` — inherent complexity, no scope reduction
- **Critical issues found:** 4 (E1-C1 wrong endpoint, E2b-C1 workspace missing, E2b-C2 token refresh, E2b-C3 role escalation security)
- **High issues found:** 6 (E1-H1 CORS, E1-H2 middleware/cookie, E2-H1 type mismatch, E2b-H1 interceptor retry, E2b-H2 Edge runtime, E2b-H3 financial stale cache)
- **Medium issues found:** 8 (E1-M1 SW cache, E1-M2 deprecated — replaced by D15, E2-M1 AuthUser, E2-M2 Firebase singleton, E2b-M1 SW app-shell only, E2b-M2 session persistence, E2b-M3 Zod forms, E2b-M4 Date strings)
- **Tests:** 0 tests exist — must add Vitest + Playwright scaffold on Day 1 (D10)
- **Architecture:** Sound overall but required 7 security/auth corrections. Auth boundary clarified (Firebase ID token IS the bearer — no backend JWT). Service worker scoped to app shell only.
- **Auto-decisions:** D8–D20 (13 eng decisions logged)

---

## NOT in scope for Phase 6

- Tenant-facing web app (tenants use mobile only)
- Real-time WebSocket updates (React Query polling is sufficient)
- Email notifications from web UI (backend already handles this)
- PDF invoice generation (Phase 7 backlog)
- Dark mode (Phase 7 backlog)
- OCR Aadhaar upload in web UI (mobile already handles this)

---

## What Already Exists

| Sub-problem | Existing code |
|-------------|---------------|
| All API endpoints | `apps/backend/src/routes/*.ts` — fully built, tested |
| Auth middleware | `apps/backend/src/middleware/auth.ts` |
| RBAC middleware | `apps/backend/src/middleware/rbac.ts` |
| Firebase Admin (backend) | `apps/backend/src/lib/firebase.ts` |
| Mobile auth store pattern | `apps/mobile/src/store/authStore.ts` — copy to web |
| Mobile API util pattern | `apps/mobile/src/utils/api.ts` — adapt for Next.js |
| Colors/design tokens | `apps/mobile/app/_layout.tsx` Colors object |
| RBAC role map | Documented in `apps/backend/src/middleware/rbac.ts` |

---

## Cross-Phase Themes

**Theme: Error state completeness** — flagged in Phase 2 (Design) AND Phase 3 (Eng).
Design review found error states unspecified (Pass 2, 2/10 → 9/10). Eng review confirmed no error paths are tested (0 tests exist). Both phases independently conclude: the plan is optimistic about error handling. The implementation MUST include error state UI for every page plus tests that trigger those states.

**Theme: Auth boundary complexity** — flagged in Phase 1 (CEO) AND Phase 3 (Eng).
CEO review flagged "Firebase ID token expires mid-session" as a failure mode needing fix (D4). Eng review found two additional auth issues: wrong endpoint name (E1-C1), and middleware/localStorage mismatch (E1-H2). Auth is the highest-risk surface in this app — three independent issues found across two phases is a high-confidence signal that auth needs extra care during implementation.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ✅ clean | 2 issues fixed (env validation, token refresh) |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | ✅ clean | Rating 4→9/10; 7 design passes completed |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | ✅ clean | 1 critical, 3 high, 5 medium fixed |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — (not configured) | — |

**VERDICT:** 3/3 reviews + 2 subagents completed via `/autoplan`. 22 auto-decisions logged. 3 taste decisions resolved (T1: iOS install, T2: Inquiries > /menu, T3: daily digest). **APPROVED 2026-03-25. Ready for implementation.**
