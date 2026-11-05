import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TCGOS_ORIGIN = "https://www.thetcgos.com";
const JP_INDEX = `${TCGOS_ORIGIN}/g/pokemon/japanese`;

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

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function slugToDisplayName(slug: string): string {
  return slug
    .replace(/^jp-/, "")
    .replace(/-pokemon-japan$/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseJapaneseSetCatalog(html: string): { slug: string; name: string }[] {
  const slugRe = /\/g\/pokemon\/sets\/(jp-[a-z0-9-]+-pokemon-japan)/g;
  const nameRe = /line-clamp-2">([^<]+\(JP\))<\/h3/g;
  const slugs = [...html.matchAll(slugRe)].map((m) => m[1]);
  const names = [...html.matchAll(nameRe)].map((m) =>
    decodeHtml(m[1]).replace(/\s*\(JP\)\s*$/i, "").trim(),
  );
  const uniqueSlugs = [...new Set(slugs)];
  return uniqueSlugs.map((slug, index) => ({
    slug,
    name: names[index] ?? slugToDisplayName(slug),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const res = await fetch(JP_INDEX, {
    headers: { "User-Agent": "PokeCardTracker/1.0 (jp set catalog)" },
  });
  if (!res.ok) {
    return jsonResponse({ error: "Could not load Japanese set list" }, 502);
  }

  const html = await res.text();
  const sets = parseJapaneseSetCatalog(html);
  if (!sets.length) {
    return jsonResponse({ error: "No Japanese sets found" }, 502);
  }

  return jsonResponse({ sets });
});
