import { createClient } from "@/lib/supabase/client";

export async function deleteCollectionById(collectionId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("collections").delete().eq("id", collectionId);
  if (error) throw new Error(error.message);
}
