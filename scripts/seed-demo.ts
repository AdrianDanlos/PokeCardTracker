/**
 * Seeds demo collections for the first auth user (or DEMO_USER_EMAIL).
 * Run after: supabase db reset && npm run db:seed-demo
 */
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../src/lib/env";

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@pokecardtracker.local";

async function main() {
  const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1 });
  let userId = list?.users?.[0]?.id;

  if (!userId) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      email_confirm: true,
    });
    if (error) throw error;
    userId = created.user.id;
    console.log("Created demo user", DEMO_EMAIL);
  }

  const collections = [
    {
      name: "Gym Era + Promos",
      description: "Gym Heroes, Gym Challenge, promos, custom cards",
      goal_count: 150,
      sort_order: 0,
    },
    {
      name: "Neo Genesis (JP)",
      description: "One set plus variants and promos",
      goal_count: null,
      sort_order: 1,
    },
    {
      name: "Pokédex, one per species",
      description: "Any card of a species counts",
      goal_count: null,
      sort_order: 2,
    },
    {
      name: "Vending and Carddass variants",
      description: "Hand-picked, no official set",
      goal_count: null,
      sort_order: 3,
    },
  ];

  for (const col of collections) {
    const { data: existing } = await supabase
      .from("collections")
      .select("id")
      .eq("user_id", userId)
      .eq("name", col.name)
      .maybeSingle();
    if (existing) continue;

    const { data: inserted, error } = await supabase
      .from("collections")
      .insert({ ...col, user_id: userId })
      .select("id")
      .single();
    if (error) throw error;

    if (col.name === "Gym Era + Promos") {
      const { data: cards } = await supabase.from("cards").select("id").limit(10);
      let pos = 0;
      for (const card of cards ?? []) {
        await supabase.from("collection_entries").insert({
          collection_id: inserted.id,
          card_id: card.id,
          position: pos++,
        });
      }
      const ownedIds = [
        "22222222-2222-2222-2222-222222222201",
        "22222222-2222-2222-2222-222222222202",
        "22222222-2222-2222-2222-222222222203",
        "22222222-2222-2222-2222-222222222204",
        "22222222-2222-2222-2222-222222222205",
        "22222222-2222-2222-2222-222222222206",
      ];
      const qtyMap: Record<string, number> = {
        "22222222-2222-2222-2222-222222222202": 2,
        "22222222-2222-2222-2222-222222222206": 3,
      };
      for (const cardId of ownedIds) {
        await supabase.from("owned_copies").upsert({
          user_id: userId,
          card_id: cardId,
          quantity: qtyMap[cardId] ?? 1,
          condition: "NM",
        });
      }
      // Pad entry count for progress demo (duplicate positions via filler cards would be wrong — add placeholder entries)
      for (let i = 0; i < 186; i++) {
        const { data: filler } = await supabase
          .from("cards")
          .insert({
            source_id: "manual",
            name: `Gym filler ${i + 1}`,
            category: "official",
            language: "en",
          })
          .select("id")
          .single();
        if (filler) {
          await supabase.from("collection_entries").insert({
            collection_id: inserted.id,
            card_id: filler.id,
            position: pos++,
          });
        }
      }
    }
  }

  console.log("Demo seed complete for user", userId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
