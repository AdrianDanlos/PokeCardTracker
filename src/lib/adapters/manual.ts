import type { CardSourceAdapter } from "./types";

/** Manual cards are created via API/DB — adapter is a stub for interface completeness. */
export const manualAdapter: CardSourceAdapter = {
  id: "manual",
  async searchCards() {
    return [];
  },
  async getCard() {
    return null;
  },
  async importSet(setExternalId) {
    return { setExternalId, setName: setExternalId, cards: [] };
  },
};
