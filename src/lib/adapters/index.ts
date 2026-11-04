import { manualAdapter } from "./manual";
import { pokemonTcgAdapter } from "./pokemontcg";
import { tcgdexAdapter } from "./tcgdex";
import type { CardSourceAdapter } from "./types";
import type { CardSourceId } from "@/lib/types";

const adapters: Record<CardSourceId, CardSourceAdapter> = {
  pokemontcg: pokemonTcgAdapter,
  tcgdex: tcgdexAdapter,
  manual: manualAdapter,
};

export function getAdapter(sourceId: CardSourceId): CardSourceAdapter {
  return adapters[sourceId];
}

export { type CardSourceAdapter } from "./types";
