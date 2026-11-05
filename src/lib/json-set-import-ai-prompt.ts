/** Copy-paste prompt for generating Import JSON via an external AI tool. */
export const JSON_SET_IMPORT_AI_PROMPT = `You are building JSON import file(s) for a Pokémon card collection tracker.

## GOAL

List every card in the Japanese Pokémon TCG expansion or promotional collection **<SET_NAME>**, and map each card to its English printing using the TCGdex API.

## STEPS

1. Build the complete card list of Japanese **<SET_NAME>**: every Pokémon, Trainer and Energy card. Use reliable sources such as Bulbapedia, Pokumon and established Pokémon card databases. Keep the original Japanese release order as the master order.

2. For each card, identify whether it was officially released in English.

3. Get every English set ID from:
   https://api.tcgdex.net/v2/en/sets
   (You MUST request this URL—do not assume the API is blocked without trying.)

4. Follow **SEARCH ALL ENGLISH SETS** below, then match each Japanese card and copy its \`id\` EXACTLY as returned by the API. Never construct or guess an ID.

## SEARCH ALL ENGLISH SETS (INCLUDING PROMOTIONAL SETS)

1. Never restrict the English search to the “matching” English expansion for **<SET_NAME>**.
2. Use the full \`/v2/en/sets\` list. Call \`/v2/en/sets/{setId}\` for any set that might contain the exact printing—including Wizards Black Star Promos (e.g. \`basep\`), other promo sets, special collections, and regular expansions.
3. Search for the exact Japanese promotional artwork across English releases; the English counterpart may live in a different set than the Japanese card’s expansion line.
4. Example: Japanese Sabrina's Abra (Gym unnumbered promo) → English **Wizards Black Star Promo #19** (\`basep-19\`), **not** Gym Challenge #93 (\`gym2-93\`).
5. Include every set prefix you use in \`enSets\` (e.g. \`basep\` when any \`id\` is \`basep-xx\`).
6. Use \`"id": null\` only after you have checked promos and expansions via the API and concluded the exact Japanese printing was never released in English.

## CRITICAL MATCHING RULES

**Match exact card printings, not just card names or Pokémon identities.**

1. Compare artwork, card identity, mechanics and printing—not names alone.
2. If the exact Japanese artwork was never officially released in English, use \`"id": null\`, even when another English card shares the name.
3. Distinguish: same artwork in English; same name but different artwork; Japan-only printing; English card with different mechanics or identity.
4. Only assign a TCGdex ID when the API entry is the exact English printing you are mapping.
5. If uncertain, omit \`"id"\` rather than assigning a wrong ID. Do not assume every Japanese card has an English counterpart.

## ID RULES (IMPORTANT)

- \`"id": "<tcgdex id>"\` → only when you verified the exact English printing in the API response.
- \`"id": null\` → the exact Japanese printing was never officially released in English.
- Omit \`"id"\` entirely → it was printed in English but you could not confidently verify the exact TCGdex ID. The app will auto-match by name inside \`enSets\`.

## NAME RULES

- Use the official English card name exactly as on the English printing / in the API.
- Use a straight apostrophe (\`'\`), not curly quotes.
- For Japan-only cards, use the commonly accepted English translation.
- Do not rename cards to match unrelated English printings.

## EVIDENCE AND VERIFICATION

During research, maintain an internal verification record for every card containing:

- Japanese card identity.
- Japanese artwork and printing.
- Japanese release source.
- Whether the exact printing appeared in English.
- English release set, if applicable.
- Exact TCGdex ID, if verified.
- Source supporting the English release determination.

Use reliable sources and card scans. If sources conflict, investigate rather than guessing.

Do not include this research record in the final JSON.

## OUTPUT FORMAT

Return ONLY valid JSON. No markdown fences, no comments, no explanation.

\`enSets\` must list every English set ID prefix used by any non-null \`id\` (expansions and promos, e.g. \`gym1\`, \`basep\`).

{
  "set": "<SET_NAME>",
  "enSets": ["gym1", "gym2", "basep"],
  "cards": [
    { "name": "Misty's Psyduck", "id": "gym1-xx" },
    { "name": "Japanese-only card", "id": null },
    { "name": "Card printed in English but ID unverified" }
  ]
}

## FINAL CHECK BEFORE ANSWERING

1. The number of cards matches the official size of the Japanese set or collection.
2. Preserve the original Japanese card order.
3. No duplicate cards unless the original collection genuinely contains duplicates.
4. Every non-null ID was copied directly from a TCGdex API response.
5. Every non-null ID starts with a set ID included in \`enSets\`.
6. Promo and expansion printings were not confused (including cross-set promos such as \`basep\` vs \`gym2\`).
7. You attempted \`/v2/en/sets\` and the \`/sets/{setId}\` endpoints needed for your matches; if access truly failed, say so—do not invent IDs or ship unverified JSON.

Accuracy is more important than producing a complete-looking file.`;

const SET_NAME_PLACEHOLDER = "<SET_NAME>";

/** Fill prompt template for a specific Japanese set / collection label. */
export function buildJsonSetImportAiPrompt(setName: string): string {
  const name = setName.trim();
  if (!name) throw new Error("Set name is required");

  return JSON_SET_IMPORT_AI_PROMPT.replaceAll(`**${SET_NAME_PLACEHOLDER}**`, `**${name}**`).replaceAll(
    SET_NAME_PLACEHOLDER,
    name,
  );
}
