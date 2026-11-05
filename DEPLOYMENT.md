# Deployment (Vercel + Supabase)

One hosted Supabase project for local dev and production. Schema is already applied there. This repo has no `supabase/migrations` folder. `supabase/seed.sql` only inserts `card_sources` (`tcgdex`, `manual`) and does not create tables.

Project: **PokeCardTracker** (`https://tqsmiprkliirsyjzmqyq.supabase.co`).

## Supabase

### 1. Authentication → URL configuration

| Field | Value |
|-------|--------|
| **Site URL** | `https://poke-card-tracker.vercel.app` |

**Redirect URLs** — include every URL the magic link may return to (`/**` wildcards are supported):

```
http://localhost:5173/**
http://127.0.0.1:5173/**
https://poke-card-tracker.vercel.app/**
https://poke-card-tracker-danlosadrian-gmailcoms-projects.vercel.app/**
https://poke-card-tracker-git-main-danlosadrian-gmailcoms-projects.vercel.app/**
```

If `http://localhost:5173/**` is missing, Supabase ignores `emailRedirectTo` and sends the link to **Site URL**, so a dev login email opens production.

### 2. Anonymous sign-ins

**Authentication → Providers → Anonymous sign-ins:** enabled.

`npm run dev` calls `signInAnonymously()` when there is no session (`src/lib/auth/devGuest.ts`). Those users are real rows in this same project. Production does not auto-create an anonymous session; it uses the magic link.

`supabase/config.toml` is the local CLI template (`enable_anonymous_sign_ins = false`). The running app uses the hosted project, not that file.

### 3. Email template (Magic link)

**Authentication → Email templates → Magic link**

Keep Supabase’s confirmation URL (it includes `redirect_to`). Do not replace the link with the Site URL alone.

In dev, the app always sends `emailRedirectTo` as `http://localhost:5173/auth/callback`. It does not read `VITE_AUTH_REDIRECT_URL` while `import.meta.env.DEV` is true. Optional `/login` on localhost still uses that callback.

Production builds use `VITE_AUTH_REDIRECT_URL` when set, otherwise `{window.location.origin}/auth/callback`.

### 4. Edge Functions

Import Set needs both functions deployed (JWT verification on). Source: `supabase/functions/`.

| Function | Used for |
|----------|----------|
| `tcgos-jp-sets` | Japanese set name list from The TCG OS |
| `tcgos-set` | One Japanese set (name, slug, TCGplayer image URLs) |

```bash
supabase functions deploy tcgos-jp-sets --project-ref tqsmiprkliirsyjzmqyq
supabase functions deploy tcgos-set --project-ref tqsmiprkliirsyjzmqyq
```

### 5. Local env

`.env.local` (see `.env.example`):

```env
VITE_SUPABASE_URL=https://tqsmiprkliirsyjzmqyq.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

`VITE_AUTH_REDIRECT_URL` is optional and ignored by the dev server. `SUPABASE_SERVICE_ROLE_KEY` is not read by the Vite app.

## Vercel

Project: [poke-card-tracker](https://vercel.com/danlosadrian-gmailcoms-projects/poke-card-tracker)

- **Framework:** Vite (`vercel.json`)
- **Build:** `npm run build` (`tsc -b` then Vite)
- **Output:** `dist`
- **SPA:** all routes rewrite to `/index.html`

**Environment variables** (Production and Preview):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not set `VITE_AUTH_REDIRECT_URL` on Vercel. Do not put `SUPABASE_SERVICE_ROLE_KEY` in client env.

## GitHub

Repo: [AdrianDanlos/PokeCardTracker](https://github.com/AdrianDanlos/PokeCardTracker). Connect it to the Vercel project so `main` deploys automatically.
