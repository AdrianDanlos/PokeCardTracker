# Deployment (Supabase + Vercel)

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL**, **anon key**, and **service role key**.
3. Link the CLI and push schema:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

4. In **Authentication → URL configuration**, set:
   - **Site URL**: your Vercel production URL
   - **Redirect URLs**: `https://YOUR_DOMAIN/auth/callback`, `http://localhost:3000/auth/callback`

## 2. Secrets

Set these in **Vercel → Project → Settings → Environment Variables** (and/or Cursor Cloud Agents → Secrets):

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/scripts only |
| `POKEMONTCG_API_KEY` | Optional |

## 3. Vercel

1. Import [github.com/AdrianDanlos/PokeCardTracker](https://github.com/AdrianDanlos/PokeCardTracker).
2. Framework preset: **Next.js** (default).
3. Deploy. Production URL: **Vercel → Project → Domains**.

## 4. Post-deploy

- Run `npm run db:seed-demo` locally against production (with service role) if you want demo collections on your user account.
- Sign in via **Magic link** on the live site.
