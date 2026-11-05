/** Copy-paste prompt for generating Import JSON via an external AI tool. */
export const JSON_SET_IMPORT_AI_PROMPT = `You are building a JSON import file for a Pokémon card collection tracker.

GOAL
List every card in the Japanese Pokémon TCG expansion **<SET_NAME>**, and map each one to its English printing using the TCGdex API.

STEPS
1. Build the complete card list of Japanese **<SET_NAME>**: every Pokémon, Trainer and Energy card in the set. Use reliable sources (Bulbapedia set list, etc.). Keep Japanese set order.
2. For each card, find the English set it was printed in (if any).
3. Get the English set ids from https://api.tcgdex.net/v2/en/sets
   For each relevant set, call https://api.tcgdex.net/v2/en/sets/{setId} (e.g. /sets/gym1)
   and read its "cards" array. Each entry has "id" (e.g. "gym1-15") and "name".
4. Match each Japanese card to the English card entry and copy its "id" EXACTLY as returned
   by the API. Never construct or guess an id.

ID RULES (important)
- "id": "<tcgdex id>"  → only when you verified it in the API response.
- "id": null           → the card was never printed in English.
- omit "id" entirely   → it was printed in English but you could not confidently verify the id
                         (the app will auto-match by name inside enSets).

NAME RULES
- Use the official English card name exactly as on the English printing / in the API
  (e.g. "Misty's Psyduck"). Use a straight apostrophe ('), not curly quotes.
- For Japan-only cards, use the commonly accepted English translation.

OUTPUT FORMAT
Return ONLY valid JSON. No markdown fences, no comments, no explanation.
"enSets" must list every English set id used by any card "id" in the file.

{
  "set": "<display name for this Japanese set, e.g. Leader's Stadium>",
  "enSets": ["gym1", "gym2"],
  "cards": [
    { "name": "Misty's Psyduck", "id": "gym1-xx" },
    { "name": "Japan-only card", "id": null },
    { "name": "Card printed in English but id unverified" }
  ]
}

FINAL CHECK (before answering)
- The number of cards matches the official size of **<SET_NAME>**.
- No duplicate cards unless **<SET_NAME>** really has duplicates.
- Every non-null id starts with a set id that appears in "enSets".
- If you cannot access the TCGdex API, say so instead of inventing ids.`;

const SET_NAME_PLACEHOLDER = "<SET_NAME>";
const JSON_SET_DISPLAY_PLACEHOLDER =
  "<display name for this Japanese set, e.g. Leader's Stadium>";

/** Fill prompt template for a specific Japanese set / collection label. */
export function buildJsonSetImportAiPrompt(setName: string): string {
  const name = setName.trim();
  if (!name) throw new Error("Set name is required");

  return JSON_SET_IMPORT_AI_PROMPT.replaceAll(`**${SET_NAME_PLACEHOLDER}**`, `**${name}**`)
    .replaceAll(SET_NAME_PLACEHOLDER, name)
    .replace(JSON_SET_DISPLAY_PLACEHOLDER, name);
}
