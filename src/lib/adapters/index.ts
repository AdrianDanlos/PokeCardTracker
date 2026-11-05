import { manualAdapter } from "./manual";
import { pokemonTcgAdapter } from "./pokemontcg";
import { createTcgdexAdapter } from "./tcgdex";
import type { CardSourceAdapter } from "./types";
import type { CardSourceId } from "@/lib/types";

const adapters: Record<CardSourceId, CardSourceAdapter> = {
  pokemontcg: pokemonTcgAdapter,
  tcgdex: createTcgdexAdapter("ja"),
  manual: manualAdapter,
};

export function getAdapter(sourceId: CardSourceId, language?: string): CardSourceAdapter {
  if (sourceId === "tcgdex" && language) {
    return createTcgdexAdapter(language === "ja" ? "ja" : "en");
  }
  return adapters[sourceId];
}

export { type CardSourceAdapter } from "./types";
