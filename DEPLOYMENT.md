# Deployment (Vercel + Supabase)

## Supabase (single project for dev + prod)

Project: **PokeCardTracker** (`https://tqsmiprkliirsyjzmqyq.supabase.co`).

1. Apply migrations from `supabase/migrations/` (via Supabase CLI `supabase db push` or Dashboard SQL).
2. Run `supabase/seed.sql` for `card_sources` rows (or rely on migration seed).
3. **Authentication → URL configuration**
   - Site URL: your Vercel production URL
   - Redirect URLs:
     - `http://localhost:5173/**`
     - `https://poke-card-tracker-danlosadrian-gmailcoms-projects.vercel.app/**`
     - Preview URLs as needed (`/**`)

## Vercel

Project: [poke-card-tracker](https://vercel.com/danlosadrian-gmailcoms-projects/poke-card-tracker)

- **Framework:** Vite
- **Build:** `npm run build`
- **Output:** `dist`
- **Environment variables** (Production + Preview):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Do **not** expose `SUPABASE_SERVICE_ROLE_KEY` to Vercel client env.

`vercel.json` includes SPA rewrites to `index.html`.

## GitHub

Repo: [AdrianDanlos/PokeCardTracker](https://github.com/AdrianDanlos/PokeCardTracker) — connect to Vercel for automatic deploys on `main`.
