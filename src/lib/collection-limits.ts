export const MAX_COLLECTION_DESCRIPTION_LENGTH = 160;

export function clampCollectionDescription(value: string): string {
  return value.slice(0, MAX_COLLECTION_DESCRIPTION_LENGTH);
}
