/**
 * Seeds sample collections for a dev guest user (service role).
 *
 * Usage:
 *   node scripts/seed-dev-guest.mjs                  # latest anonymous user, or create one
 *   node scripts/seed-dev-guest.mjs <user-uuid>      # specific auth user id
 *
 * Requires .env.local: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const GYM_HEROES_SET_ID = "5d9f8afd-472d-4016-8e4f-6caab2405339";
const LEADERS_STADIUM_SET_ID = "196e3c64-357e-4d3c-a980-7a990ec00b0b";

const SAMPLES = [
  {
    name: "Dev sample — Gym Heroes",
    description: "Sample binder for local guest dev (18 slots, partial progress).",
    sort_order: 0,
    setId: GYM_HEROES_SET_ID,
    cardLimit: 18,
    ownedCount: 8,
  },
  {
    name: "Dev sample — Leader's Stadium",
    description: "Smaller sample collection for quick UI checks.",
    sort_order: 1,
    setId: LEADERS_STADIUM_SET_ID,
    cardLimit: 6,
    ownedCount: 3,
  },
];

async function seedForUser(admin, userId) {
  const { count, error: countError } = await admin
    .from("collections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) throw countError;
  if (count > 0) {
    console.log(`User ${userId} already has ${count} collection(s); skipping seed.`);
    return false;
  }

  for (const sample of SAMPLES) {
    const { data: cards, error: cardsError } = await admin
      .from("cards")
      .select("id")
      .eq("set_id", sample.setId)
      .order("name", { ascending: true })
      .limit(sample.cardLimit);
    if (cardsError) throw cardsError;
    if (!cards?.length) throw new Error(`No cards for set ${sample.setId}`);

    const { data: collection, error: colError } = await admin
      .from("collections")
      .insert({
        user_id: userId,
        name: sample.name,
        description: sample.description,
        sort_order: sample.sort_order,
      })
      .select("id")
      .single();
    if (colError) throw colError;

    const { error: entriesError } = await admin.from("collection_entries").insert(
      cards.map((card, position) => ({
        collection_id: collection.id,
        card_id: card.id,
        position,
      })),
    );
    if (entriesError) throw entriesError;

    const ownedCards = cards.slice(0, Math.min(sample.ownedCount, cards.length));
    if (ownedCards.length) {
      const { error: ownedError } = await admin.from("owned_copies").insert(
        ownedCards.map((card) => ({
          user_id: userId,
          card_id: card.id,
          language: "jp",
        })),
      );
      if (ownedError) throw ownedError;
    }
  }

  console.log(`Seeded ${SAMPLES.length} sample collections for user ${userId}.`);
  return true;
}

async function resolveUserId(admin, anonClient, argUserId) {
  if (argUserId) return argUserId;

  const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const anonUsers = (listData.users ?? [])
    .filter((u) => u.is_anonymous)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (anonUsers.length > 0) {
    console.log(`Using latest anonymous user: ${anonUsers[0].id}`);
    return anonUsers[0].id;
  }

  const { data: anonData, error: anonError } = await anonClient.auth.signInAnonymously();
  if (anonError || !anonData.session?.user) throw anonError ?? new Error("Anonymous sign-in failed");

  const userId = anonData.session.user.id;
  const ref = new URL(url).hostname.split(".")[0];
  const storageKey = `sb-${ref}-auth-token`;
  const sessionPayload = JSON.stringify({
    access_token: anonData.session.access_token,
    refresh_token: anonData.session.refresh_token,
    expires_at: anonData.session.expires_at,
    expires_in: anonData.session.expires_in,
    token_type: anonData.session.token_type,
    user: anonData.session.user,
  });

  console.log(`Created new anonymous user: ${userId}`);
  console.log("");
  console.log("No guest was in the project yet. To use this seeded guest in the browser, on http://localhost:5173 run:");
  console.log(`localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(sessionPayload)}); location.reload();`);
  console.log("(Or click “Load sample data” on the dashboard when signed in as a guest.)");
  return userId;
}

const env = loadEnv();
process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anonClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

const argUserId = process.argv[2];

try {
  const userId = await resolveUserId(admin, anonClient, argUserId);
  await seedForUser(admin, userId);
} catch (err) {
  console.error(err);
  process.exit(1);
}
