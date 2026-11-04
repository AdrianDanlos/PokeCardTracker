# Card sources research

Focus: vintage English WotC, Japanese promos, and manual/custom entries.

## pokemontcg.io

| Topic | Notes |
|-------|--------|
| Coverage | English-first; strong WotC-era sets and modern EN prints. |
| Japanese | Not supported. |
| Licensing | API terms apply; images hosted on `images.pokemontcg.io`. |
| Rate limits | Low without API key; use `POKEMONTCG_API_KEY` in production. |
| Images | `images.small` / `images.large` URLs; cached into Supabase Storage on import. |
| Set import | Query `set.id:{id}` with pagination (250/page). |

**Adapter:** `src/lib/adapters/pokemontcg.ts`

## TCGdex

| Topic | Notes |
|-------|--------|
| Coverage | Multi-language (`en`, `ja`, …); partial Japanese vintage/promo coverage vs EN. |
| Licensing | Open API; card art URLs under `api.tcgdex.net` CDN paths. |
| Rate limits | Reasonable for personal use; prefer set import over full-catalog scans. |
| Images | `{image}/high.webp`; cached on add/import. |
| Search | Per-language card index; filter by name (see adapter). |

**Adapter:** `src/lib/adapters/tcgdex.ts` (default export uses `ja` for Japanese-first per product plan).

## Manual entry

First-class path for promos, misprints, Carddass, vending cards, and custom scans. Fields: name, number, set, rarity, language, category, edition, variant, uploaded image → `card-images` bucket.

## Reference / price (out of app scope)

| Source | Use |
|--------|-----|
| PokeWallet / JustTCG / PriceCharting | Market prices (not integrated). |
| Bulbapedia / pkmncards | Human reference for IDs and printings. |

Price tracking remains out of scope for v1.
