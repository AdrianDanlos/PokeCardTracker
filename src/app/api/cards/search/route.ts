import { getAdapter } from "@/lib/adapters";
import type { CardSourceId } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const source = (searchParams.get("source") ?? "pokemontcg") as CardSourceId;
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }
  try {
    const language = searchParams.get("language") ?? undefined;
    const adapter = getAdapter(source, language ?? undefined);
    const results = await adapter.searchCards(q, {
      language: language ?? undefined,
    });
    return NextResponse.json({
      results: results.map((r) => ({
        externalId: r.externalId,
        name: r.name,
        setName: r.setName,
        number: r.number,
        imageUrl: r.imageUrl,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
