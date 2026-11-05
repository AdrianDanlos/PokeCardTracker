# Card sources

The app stores every card as either a **TCGdex** catalog row or a **manual** row. Japanese sets are the main collection workflow. English TCGdex is used for single-card search and for photos on JSON import. [pokemontcg.io](https://pokemontcg.io/) is not called by the app (a leftover `pokemontcg` row may still exist in `card_sources`).

Add-card UI (`src/components/AddCardsModal.tsx`):

| Tab | What it does |
|-----|----------------|
| Import Set | Japanese set from [The TCG OS](https://www.thetcgos.com/g/pokemon/japanese), or a pasted JSON list that borrows English TCGdex photos. |
| Import card | English TCGdex name search only. |
| Manual | Name, set name, optional photo upload. |

Stored language for Japanese and manual cards is `jp`. TCGdex’s API uses `ja` for that same language; the adapter maps anything other than `en` to `ja`.

## TCGdex

| Topic | Notes |
|-------|--------|
| Role | English catalog search, and English artwork for JSON import. |
| API | `https://api.tcgdex.net/v2`. Search and JSON matching use `/en/...`. |
| Images | `{imageBase}/high.webp` on `assets.tcgdex.net`. Cached into the `card-images` bucket on add (`{userId}/cached/{cardId}.webp`). |
| Search | UI passes language `en`. Matches name, card id (`setId-localId`), and set name. |
| Set read | `importSet` loads an English set so JSON import can match cards. The UI does not import a TCGdex set straight into a collection. |

**Code:** `src/lib/adapters/tcgdex.ts`, `src/lib/api/cards.ts`.

## The TCG OS (Japanese set import)

“Fetch with TCGPlayer” does not call the TCGplayer API. Two Supabase Edge Functions read [The TCG OS](https://www.thetcgos.com/) and return card images hosted on `tcgplayer-cdn.tcgplayer.com`.

| Function | Role |
|----------|------|
| `tcgos-jp-sets` | Japanese set names and slugs from `/g/pokemon/japanese` (autocomplete). |
| `tcgos-set` | One set page: name, slug, and product images. Body: `{ "setName": "..." }`. |

Imported cards are `source_id = manual`, `language = jp`, `external_id = tcgplayer-{productId}`, with `image_url` left on the TCGplayer CDN (not copied into Storage). Both functions require a signed-in JWT.

**Code:** `src/lib/api/tcgplayer-set.ts`, `supabase/functions/tcgos-jp-sets`, `supabase/functions/tcgos-set`.

Set-name lookup in the UI also links to [TCG Collector](https://www.tcgcollector.com/sets/jp). That site is not queried by the app.

## JSON import

“Fetch with AI” copies a prompt (`src/lib/json-set-import-ai-prompt.ts`). An external model is expected to list the Japanese set and attach English TCGdex ids. The app then inserts **manual** cards (`language = jp`):

| `id` in the JSON | Result |
|------------------|--------|
| TCGdex id (for example `gym1-15`) | English TCGdex photo, cached into Storage. `attrs.en_external_id` stores the id. |
| `null` | No photo. Exact Japanese printing was not released in English. |
| omitted | Auto-match by English name inside `enSets`. |

Unmatched names are still imported; `attrs.en_resolve_error` records why there is no photo.

## Manual entry

Name, set name, and an optional upload. Language defaults to `jp`. Uploads go to `card-images` at `{userId}/manual/{cardId}.{ext}`. The manual adapter (`src/lib/adapters/manual.ts`) is a stub; creation goes through `createManualCard` in `src/lib/api/cards.ts`.

Number, rarity, category, edition, and variant are not fields.

## Not integrated

Market prices (PokeWallet, JustTCG, PriceCharting, TCGplayer prices) and pokemontcg.io. Bulbapedia and Pokumon are named only inside the JSON prompt as research hints for the external model.
