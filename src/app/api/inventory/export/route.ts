import { exportInventoryCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: copies } = await supabase
    .from("owned_copies")
    .select("*")
    .eq("user_id", userData.user.id);
  const ids = (copies ?? []).map((c) => c.card_id);
  const { data: cards } = await supabase.from("cards").select("id, name").in("id", ids);
  const names = new Map((cards ?? []).map((c) => [c.id, c.name]));
  const csv = exportInventoryCsv(copies ?? [], names);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inventory.csv"',
    },
  });
}
