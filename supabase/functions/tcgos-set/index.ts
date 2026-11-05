import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TCGOS_ORIGIN = "https://www.thetcgos.com";
const SITEMAP_PAGES = `${TCGOS_ORIGIN}/sitemap/pages.xml`;
const IMG_RE =
  /<img src="(https:\/\/tcgplayer-cdn\.tcgplayer\.com\/product\/(\d+)_in_1000x1000\.jpg)" alt="([^"]*)"/g;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugifySetName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

function scoreSlug(query: string, slug: string): number {
  const q = tokens(query);
  const s = tokens(slug.replace(/^jp-/, "").replace(/-pokemon-japan$/, ""));
  let score = 0;
  for (const t of q) {
    if (s.has(t)) score += 2;
    else if ([...s].some((st) => st.includes(t) || t.includes(st))) score += 1;
  }
  return score;
}

async function fetchText(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": "PokeCardTracker/1.0 (set import)" },
  });
  if (!res.ok) return null;
  return res.text();
}

function parseCards(html: string) {
  const seen = new Set<string>();
  const cards: { productId: string; name: string; imageUrl: string }[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(IMG_RE.source, "g");
  while ((match = re.exec(html))) {
    const productId = match[2];
    if (seen.has(productId)) continue;
    seen.add(productId);
    cards.push({
      productId,
      name: decodeHtml(match[3]),
      imageUrl: match[1],
    });
  }
  return cards;
}

function parseSetTitle(html: string): string | null {
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (!h1) return null;
  return decodeHtml(h1[1]).replace(/\s*\(JP\)\s*$/i, "").trim();
}

async function resolveSlug(setName: string): Promise<string | null> {
  const base = slugifySetName(setName);
  if (!base) return null;

  const direct = `jp-${base}-pokemon-japan`;
  const directUrl = `${TCGOS_ORIGIN}/g/pokemon/sets/${direct}`;
  const directHtml = await fetchText(directUrl);
  if (directHtml && parseCards(directHtml).length > 0) return direct;

  const sitemap = await fetchText(SITEMAP_PAGES);
  if (!sitemap) return null;

  const slugRe = /\/g\/pokemon\/sets\/(jp-[a-z0-9-]+-pokemon-japan)/g;
  const slugs = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = slugRe.exec(sitemap))) {
    slugs.add(m[1]);
  }

  let best: { slug: string; score: number } | null = null;
  for (const slug of slugs) {
    const score = scoreSlug(setName, slug);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { slug, score };
  }
  return best?.slug ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let setName: string;
  try {
    const body = await req.json();
    setName = typeof body?.setName === "string" ? body.setName.trim() : "";
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!setName) {
    return jsonResponse({ error: "setName is required" }, 400);
  }

  const slug = await resolveSlug(setName);
  if (!slug) {
    return jsonResponse(
      { error: `No Japanese set found on The TCG OS for “${setName}”. Try the exact English set name.` },
      404,
    );
  }

  const pageUrl = `${TCGOS_ORIGIN}/g/pokemon/sets/${slug}`;
  const html = await fetchText(pageUrl);
  if (!html) {
    return jsonResponse({ error: "Could not load set page" }, 502);
  }

  const cards = parseCards(html);
  if (cards.length === 0) {
    return jsonResponse({ error: "No card images found on set page" }, 502);
  }

  const parsedTitle = parseSetTitle(html) ?? setName;

  return jsonResponse({
    setName: parsedTitle,
    slug,
    cards,
  });
});
