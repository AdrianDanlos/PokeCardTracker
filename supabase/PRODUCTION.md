# Production Supabase setup

The error `Could not find the table 'public.collections' in the schema cache` means the hosted database has not received this repo’s migrations yet.

## One-time setup

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and log in: `npx supabase login`.
2. Link the Vercel project’s Supabase instance (project ref from the Supabase dashboard):

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply migrations:

   ```bash
   npm run db:push
   ```

4. Sync auth settings (single magic-link email, redirect URLs):

   ```bash
   npx supabase config push
   ```

5. In Supabase **Authentication → URL configuration**, confirm **Site URL** is `https://poke-card-tracker.vercel.app` and redirect URLs include `https://poke-card-tracker.vercel.app/auth/callback`.

## GitHub Actions (optional)

Add repository secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_DB_PASSWORD`, then run the **Supabase db push** workflow from the Actions tab.
