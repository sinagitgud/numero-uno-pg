# Numero Uno PG — Mobile App

A mobile application for managing PG accommodation across 6 properties in Noida.

## What's Built (Phase 1 — Foundation)

✅ Full monorepo structure (mobile + backend + shared types)
✅ Complete PostgreSQL database schema (all 14 entities)
✅ Backend API with Express + Prisma (all route files scaffolded)
✅ Firebase Auth integration (token verification + RBAC middleware)
✅ Role-based access control (Owner / Sales Manager / Ops Manager / Tenant)
✅ Mobile app with Expo Router navigation
✅ Bilingual support — English + Hindi (react-i18next)
✅ Zustand state management
✅ Database seed with all 6 properties and 66 beds

---

## Prerequisites (install these first)

1. **Node.js** (v18+) — https://nodejs.org
2. **Git** — https://git-scm.com
3. **Expo Go** app on your phone (for testing) — from App Store / Play Store
4. **PostgreSQL** database:
   - Option A (easiest): Sign up at https://neon.tech — free hosted PostgreSQL
   - Option B: Install PostgreSQL locally

---

## Setup Instructions

### Step 1 — Install dependencies

Open a terminal in this folder and run:

```bash
npm install
```

### Step 2 — Set up the backend environment

```bash
cd apps/backend
cp .env.example .env
```

Open `apps/backend/.env` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string from Neon.tech or local
- Leave other values as-is for now (we'll fill them in later phases)

### Step 3 — Set up the database

```bash
# Still inside apps/backend/
npx prisma migrate dev --name init
npx prisma db seed
```

This creates all tables and seeds the 6 properties + 66 beds.

### Step 4 — Set up the mobile environment

```bash
cd ../mobile
cp .env.example .env
```

Leave `EXPO_PUBLIC_API_URL=http://localhost:3000` for now.

### Step 5 — Start the backend

From the root folder:

```bash
npm run backend
```

You should see: `✅ Numero Uno PG backend running on port 3000`

### Step 6 — Start the mobile app

In a new terminal, from the root folder:

```bash
npm run mobile
```

Scan the QR code with the Expo Go app on your phone.

---

## Project Structure

```
numero-uno-pg/
├── apps/
│   ├── backend/                # Node.js + Express API
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Full database schema
│   │   │   └── seed.ts         # Seeds all 6 properties
│   │   └── src/
│   │       ├── index.ts        # Server entry point
│   │       ├── lib/            # Prisma client, Firebase admin
│   │       ├── middleware/      # Auth (Firebase) + RBAC
│   │       └── routes/         # All API endpoints
│   └── mobile/                 # React Native (Expo) app
│       ├── app/
│       │   ├── (auth)/         # Login, OTP, pending screens
│       │   ├── (staff)/        # Owner/manager tab navigator
│       │   └── (tenant)/       # Tenant tab navigator
│       └── src/
│           ├── i18n/           # Hindi + English translations
│           ├── store/          # Zustand auth store
│           └── utils/          # Axios API client
└── packages/
    └── shared/                 # TypeScript types shared by both apps
```

---

## API Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | Public | Register after Firebase auth |
| GET | /api/auth/me | All | Get current user profile |
| GET | /api/properties | Staff | List all properties |
| POST | /api/properties | Owner | Create property |
| GET | /api/rooms | Staff | List rooms |
| POST | /api/rooms | Owner | Create room |
| GET | /api/tenants | Staff | List tenants |
| POST | /api/tenants | Sales | Add new tenant |
| POST | /api/tenants/:id/checkout | Sales | Check out tenant |
| GET | /api/invoices | Sales | List invoices |
| POST | /api/payments | Sales | Record payment |
| GET | /api/expenses | Ops | List expenses |
| POST | /api/expenses | Ops | Log expense |
| GET | /api/staff | Ops | List staff |
| POST | /api/staff/:id/salary | Owner | Record salary |
| GET | /api/investments | Owner | List investments |
| GET | /api/dashboard/snapshot | Owner | Daily snapshot |
| GET | /api/dashboard/monthly | Owner | Monthly report |
| GET | /api/tickets | All | List tickets |
| POST | /api/tickets | Tenant | Create ticket |
| GET | /api/goals/incentive | Owner | Calculate incentive |

---

## What's Next (Phase 2)

- [ ] Firebase Auth fully wired (phone OTP + email flows)
- [ ] Aadhaar OCR via Claude Vision API
- [ ] Rent agreement PDF generation
- [ ] File upload to Cloudflare R2
- [ ] Pro-rata invoice generation
- [ ] Manual payment recording UI
- [ ] Expense logging UI

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) |
| Backend | Node.js + Express |
| Database | PostgreSQL + Prisma |
| Auth | Firebase Auth |
| Storage | Cloudflare R2 |
| OCR | Claude Vision API |
| Payments | Razorpay |
| WhatsApp | Gupshup |
| Notifications | Firebase Cloud Messaging |
| i18n | react-i18next |
| State | Zustand |
