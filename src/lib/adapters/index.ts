import { manualAdapter } from "./manual";
import { createTcgdexAdapter } from "./tcgdex";
import type { CardSourceAdapter } from "./types";
import { DEFAULT_CARD_LANGUAGE, type CardSourceId } from "@/lib/types";

const adapters: Record<CardSourceId, CardSourceAdapter> = {
  tcgdex: createTcgdexAdapter(DEFAULT_CARD_LANGUAGE),
  manual: manualAdapter,
};

export function getAdapter(sourceId: CardSourceId, language?: string): CardSourceAdapter {
  if (sourceId === "tcgdex" && language) {
    return createTcgdexAdapter(language);
  }
  return adapters[sourceId];
}

export { type CardSourceAdapter } from "./types";
