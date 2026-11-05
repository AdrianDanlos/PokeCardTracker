# Deployment (Vercel + Supabase)

## Supabase (Option A — one project, separate dev/prod redirects)

Project: **PokeCardTracker** (`https://tqsmiprkliirsyjzmqyq.supabase.co`).

Same database and users for local dev and production. Magic links go to **different URLs** depending on where you requested login.

### 1. Authentication → URL configuration (required)

| Field | Value |
|-------|--------|
| **Site URL** | `https://poke-card-tracker.vercel.app` (production default) |

**Redirect URLs** — add every URL below (wildcards `/**` are supported):

```
http://localhost:5173/**
http://127.0.0.1:5173/**
https://poke-card-tracker.vercel.app/**
https://poke-card-tracker-danlosadrian-gmailcoms-projects.vercel.app/**
https://poke-card-tracker-git-main-danlosadrian-gmailcoms-projects.vercel.app/**
```

If `http://localhost:5173/**` is missing, Supabase **ignores** the app’s `emailRedirectTo` and falls back to **Site URL** — so dev login emails open production.

### 2. Email template (Magic link)

**Authentication → Email templates → Magic link**

The link should use Supabase’s confirmation URL variable (includes `redirect_to`), not a hardcoded production domain only. Default template is usually fine; avoid replacing the link with plain Site URL.

### 3. Local `.env.local`

```env
VITE_AUTH_REDIRECT_URL=http://localhost:5173/auth/callback
```

Production (Vercel) does **not** set this; the app uses `window.location.origin` on the deployed site.

### 4. Database

Run `supabase/seed.sql` for `card_sources` if needed.

## Vercel

Project: [poke-card-tracker](https://vercel.com/danlosadrian-gmailcoms-projects/poke-card-tracker)

- **Framework:** Vite
- **Build:** `npm run build`
- **Output:** `dist`
- **Environment variables** (Production + Preview):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - Do **not** set `VITE_AUTH_REDIRECT_URL` on Vercel (use live origin).

Do **not** expose `SUPABASE_SERVICE_ROLE_KEY` in Vercel client env.

`vercel.json` includes SPA rewrites to `index.html`.

## GitHub

Repo: [AdrianDanlos/PokeCardTracker](https://github.com/AdrianDanlos/PokeCardTracker) — connect to Vercel for automatic deploys on `main`.
