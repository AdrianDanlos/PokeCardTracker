/** Whole-number completion for UI labels — always rounds down (332/333 → 99, not 100). */
export function collectionOwnedPercentDisplay(
  owned: number,
  total: number,
): number {
  if (total <= 0) return 0;
  return Math.floor((100 * owned) / total);
}

/** Exact ratio for progress bar width. */
export function collectionOwnedPercentFill(
  owned: number,
  total: number,
): number {
  if (total <= 0) return 0;
  return (100 * owned) / total;
}
