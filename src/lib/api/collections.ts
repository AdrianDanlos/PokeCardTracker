import { createClient } from "@/lib/supabase/client";

export async function deleteCollectionById(collectionId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("collections").delete().eq("id", collectionId);
  if (error) throw new Error(error.message);
}

export async function setCollectionBinderGaps(
  collectionId: string,
  gaps: number[],
) {
  const supabase = createClient();
  const sorted = [...gaps].sort((a, b) => a - b);
  const { error } = await supabase
    .from("collections")
    .update({ binder_gaps: sorted })
    .eq("id", collectionId);
  if (error) throw new Error(error.message);
}
