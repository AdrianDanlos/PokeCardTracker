import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/types";

export async function setCardOwned(cardId: string, owned: boolean, language?: string) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  if (!owned) {
    const { error } = await supabase
      .from("owned_copies")
      .delete()
      .eq("user_id", userData.user.id)
      .eq("card_id", cardId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("owned_copies").upsert(
    {
      user_id: userData.user.id,
      card_id: cardId,
      language: language?.trim() || DEFAULT_CARD_LANGUAGE,
    },
    { onConflict: "user_id,card_id" },
  );
  if (error) throw new Error(error.message);
}
