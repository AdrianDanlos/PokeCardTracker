import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "images.pokemontcg.io",
  "assets.tcgdex.net",
  "api.tcgdex.net",
]);

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    return NextResponse.json({ error: "upstream failed" }, { status: 502 });
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
