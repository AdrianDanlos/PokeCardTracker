# PokeCardTracker

Single-user **React + Vite + TypeScript** app for custom Pokémon TCG collections. Uses **Supabase** (Postgres, Storage, magic-link auth, RLS) with **one cloud project** for local dev and production.

## Features

- Dashboard with collection tiles, search, progress bars
- Collection view: All / Owned / Missing, filters, grid + 3×3 binder, stats panel
- Card editor drawer (owned copies, condition, qty, price, notes)
- **TCGdex-first** card search/import (Japanese + English, high-quality photos via [tcgdex.dev](https://tcgdex.dev/)); pokemontcg.io as secondary English source
- Manual cards with image upload
- CSV export (collections + inventory)

## Local development

1. Copy `.env.example` → `.env.local` and set:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional for client; used by scripts only)

2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Magic link login requires Supabase Auth redirect URLs (see [DEPLOYMENT.md](./DEPLOYMENT.md)).

## Scripts

- `npm run dev` — Vite dev server (port 5173)
- `npm run build` / `npm run preview`
- `npm run typecheck`

## Docs

- [docs/card-sources-research.md](./docs/card-sources-research.md)
- [docs/database-schema.md](./docs/database-schema.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
