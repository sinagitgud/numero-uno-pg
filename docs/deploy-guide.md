# Numero Uno PG — WIP Deploy Guide

> For: Siddharth's techie friend helping get the app live
> Stack: Next.js 14 PWA (Vercel) + Express API (Railway) + PostgreSQL (Neon)
> Time needed: ~30 minutes

---

## What You're Deploying

```
[Browser / Phone]
      │
      ▼
[Vercel] apps/web          ← Next.js 14 PWA (tenant + staff UI)
      │
      │  REST API calls
      ▼
[Railway] apps/backend     ← Express + Prisma ORM
      │
      ▼
[Neon] PostgreSQL          ← 20 tables, all data
```

Firebase handles **authentication only** (phone OTP for tenants, email magic link for staff). No data is stored there.

---

## Step 1 — Push code to GitHub

The project has no remote yet. Create a **private** GitHub repo and push.

```bash
cd "C:/AI Projects/Claude/numero-uno-pg"

git remote add origin https://github.com/YOUR_USERNAME/numero-uno-pg.git
git push -u origin master
```

> Keep it private — the repo contains your Prisma schema and business logic.

---

## Step 2 — Set up the database (Neon)

1. Go to [neon.tech](https://neon.tech) → Sign up (free)
2. **Create Project** → name it `numero-uno-pg`
3. On the dashboard: **Connection Details** → copy the **Connection string**
   It looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Save this — you'll need it in Steps 3 and 4.

---

## Step 3 — Deploy the backend (Railway)

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. **New Project** → **Deploy from GitHub repo** → select `numero-uno-pg`
3. Railway will auto-detect the `apps/backend` folder via `railway.toml`
   If it doesn't: **Settings → Root Directory** → set to `apps/backend`
4. Go to **Variables** tab → add all of these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon connection string from Step 2 |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | From Firebase Console → Project Settings |
| `FIREBASE_CLIENT_EMAIL` | From Firebase service account JSON |
| `FIREBASE_PRIVATE_KEY` | From Firebase service account JSON (full key with `\n`) |
| `ALLOWED_ORIGINS` | `https://numero-uno-pg.vercel.app` (update after Step 4) |
| `WEB_APP_URL` | `https://numero-uno-pg.vercel.app` (update after Step 4) |

> **Getting Firebase credentials**: Firebase Console → Project Settings → Service Accounts → Generate new private key → download JSON → copy `project_id`, `client_email`, `private_key`

5. Leave all other vars empty for now (Razorpay, Gupshup, R2 — app works without them)
6. **Deploy** → wait ~2 minutes → copy your Railway URL: `https://xxxx.up.railway.app`

The deploy command in `railway.toml` automatically runs `prisma migrate deploy` to create all 20 tables before starting the server.

---

## Step 4 — Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. **Add New Project** → import `numero-uno-pg`
3. Vercel will find `vercel.json` at the root and auto-configure
   If it asks: **Framework** = Next.js, **Root Directory** = `apps/web`
4. Go to **Environment Variables** → add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://xxxx.up.railway.app/api` (Railway URL from Step 3) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase Console → Project Settings → Web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From Firebase Web app config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Web app config |

5. **Deploy** → copy your Vercel URL: `https://numero-uno-pg.vercel.app`

---

## Step 5 — Update backend CORS

Go back to Railway → **Variables** → update:
- `ALLOWED_ORIGINS` → your actual Vercel URL
- `WEB_APP_URL` → your actual Vercel URL

Redeploy (Railway auto-redeploys on variable change).

---

## Step 6 — Firebase: add the domain

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your Vercel domain: `numero-uno-pg.vercel.app`

---

## Step 7 — Create the first owner account

The app has no signup page — owner accounts are seeded directly. Run this once:

```bash
# From your local machine, with DATABASE_URL set to Neon:
cd apps/backend
DATABASE_URL="your-neon-connection-string" npx ts-node prisma/seed.ts
```

This creates a demo owner + sample data so the app has something to show.

---

## Verify it's working

1. Open your Vercel URL — you should see the login page
2. Staff login → enter the owner email from seed data → check for magic link
3. Tenant login → enter a phone number → enter OTP (check Firebase Console → Authentication → Users for the code in test mode)

---

## Optional integrations (skip for demo)

| Integration | Purpose | Guide |
|---|---|---|
| Razorpay | Online rent collection | dashboard.razorpay.com |
| Gupshup | WhatsApp rent reminders | gupshup.io |
| Cloudflare R2 | Receipt/agreement file storage | dash.cloudflare.com |

---

## Costs (all free for demo load)

| Service | Free tier |
|---|---|
| Neon | 0.5 GB storage, 1 compute unit |
| Railway | $5 free credit / month (~500 hrs) |
| Vercel | Unlimited for personal projects |
| Firebase Auth | 10,000 SMS OTPs/month |

---

## Troubleshooting

**Backend 500 on start** → Check Railway logs. Usually a missing env var (DATABASE_URL or Firebase keys).

**"Firebase: auth/unauthorized-domain"** → Step 6 not done. Add Vercel domain to Firebase authorized domains.

**CORS errors in browser** → `ALLOWED_ORIGINS` on Railway doesn't match the Vercel URL exactly (no trailing slash).

**Prisma migration failed** → Railway logs will show the SQL error. Most likely the DATABASE_URL is wrong or Neon hasn't started yet (retry deploy).

**PWA not installing** → Needs HTTPS (Vercel provides this automatically). Check that `manifest.json` is accessible at `/manifest.json`.
