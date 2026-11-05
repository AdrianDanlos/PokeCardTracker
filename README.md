# PokeCardTracker

Single-user **React + Vite + TypeScript** app for custom Pokémon TCG collections. Uses **Supabase** (Postgres, Storage, magic-link auth, RLS) with **one cloud project** for local dev and production.

## Features

- Dashboard with collection tiles, search, progress bars
- Collection view: All / Owned / Missing, filters, grid + 3×3 binder, stats panel
- Card editor drawer (owned copies, condition, qty, price, notes)
- **TCGdex-first** card search/import (Japanese + English, high-quality photos via [tcgdex.dev](https://tcgdex.dev/)); pokemontcg.io as secondary English source
- Manual cards with image upload
- CSV import for collections (settings)

## Local development

1. Copy `.env.example` → `.env.local` and set:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_AUTH_REDIRECT_URL=http://localhost:5173/auth/callback` (dev magic links)
   - `SUPABASE_SERVICE_ROLE_KEY` (optional for client; used by scripts only)

   In Supabase Dashboard, add `http://localhost:5173/**` under **Authentication → Redirect URLs** (see [DEPLOYMENT.md](./DEPLOYMENT.md)).

2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). **Local dev** auto signs in as an anonymous guest (no magic link). Production still uses magic link. Optional: `/login` on localhost to use your email account.

## Scripts

- `npm run dev` — Vite dev server (port 5173)
- `npm run build` / `npm run preview`
- `npm run typecheck`

## Docs

- [docs/card-sources-research.md](./docs/card-sources-research.md)
- [docs/database-schema.md](./docs/database-schema.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
