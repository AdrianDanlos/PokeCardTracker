# PokeCardTracker
<<<<<<< HEAD
=======

Single-user Next.js app for **custom** Pokémon TCG collections (not tied to official set completion). Built with App Router, TypeScript, Tailwind, and Supabase (Postgres, Storage, magic-link Auth, RLS).

## Features

- Dashboard with collection tiles, search, and progress
- Collection view: All / Owned / Missing filters, search, filter chips, grid + 3×3 binder pages, stats breakdown
- Card editor drawer (condition, language, edition, variant, qty, price, notes)
- Add cards via pokemontcg.io or TCGdex search, bulk set import, or manual entry with image upload
- CSV export/import for collections; inventory CSV export
- `CardSourceAdapter` interface with pokemontcg, tcgdex, and manual adapters

## Local development (no remote Supabase required)

If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are **unset**, the app defaults to the local Supabase CLI stack (`http://127.0.0.1:54321` + demo anon key).

1. Install [Docker](https://docs.docker.com/get-docker/) and the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. From the repo root:

```bash
npm install
npx supabase start
npx supabase db reset   # runs migrations + supabase/seed.sql
npm run db:seed-demo    # demo collections (Gym Era + Promos, etc.)
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000). Use **Magic link login** (`/login`). For local auth emails, open Inbucket at [http://127.0.0.1:54324](http://127.0.0.1:54324).

Without a running Supabase instance, the UI still loads **static demo data** matching the design mockups.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | For production | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For production | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed / admin scripts | Service role key (never expose to client) |
| `POKEMONTCG_API_KEY` | Optional | Higher rate limits for [pokemontcg.io](https://pokemontcg.io) |

Add production values in Vercel and/or **Cursor Dashboard → Cloud Agents → Secrets**.

## Scripts

- `npm run dev` — development server
- `npm run lint` / `npm run typecheck` / `npm run build`
- `npm run db:reset` — reset local DB (migrations + seed)
- `npm run db:seed-demo` — attach demo collections to a user

## Deployment

Deploy to Vercel, link a Supabase project, run migrations against the remote DB (`supabase db push`), and set the env vars above.

## Docs (project store)

Research and schema write-ups live in the Cursor project store:

- `docs/card-sources-research.md`
- `docs/database-schema.md`
>>>>>>> 8588b10 (Implement PokeCardTracker Next.js app with Supabase schema)
