import type { CollectionEntryWithCard } from "@/lib/types";

export type OrderExportItem = {
  id: string;
  name: string;
  set: string;
};

const MAX_ERRORS = 10;

function entrySetLabel(entry: CollectionEntryWithCard): string {
  return entry.card.set?.name?.trim() ?? "";
}

function entryExportItem(entry: CollectionEntryWithCard): OrderExportItem {
  return {
    id: entry.id,
    name: entry.card.name,
    set: entrySetLabel(entry),
  };
}

export function buildOrderExport(entries: CollectionEntryWithCard[]): string {
  const items = entries.map(entryExportItem);
  return JSON.stringify(items, null, 2);
}

export type ValidateOrderJsonResult =
  | { ok: true; orderedIds: string[] }
  | { ok: false; errors: string[] };

function formatErrors(all: string[]): string[] {
  if (all.length <= MAX_ERRORS) return all;
  const rest = all.length - MAX_ERRORS;
  return [...all.slice(0, MAX_ERRORS), `…and ${rest} more issue${rest === 1 ? "" : "s"}`];
}

export function validateOrderJson(
  text: string,
  entries: CollectionEntryWithCard[],
): ValidateOrderJsonResult {
  const allErrors: string[] = [];

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Invalid JSON"] };
  }

  if (!Array.isArray(data)) {
    return { ok: false, errors: ["JSON must be an array of card objects"] };
  }

  const expectedById = new Map(entries.map((e) => [e.id, entryExportItem(e)]));
  const expectedCount = entries.length;

  if (data.length !== expectedCount) {
    allErrors.push(
      `Expected ${expectedCount} cards, got ${data.length}. Every card must appear exactly once.`,
    );
  }

  const seenIds = new Set<string>();
  const orderedIds: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const raw = data[i];
    const ctx = `Item ${i + 1}`;

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      allErrors.push(`${ctx}: must be an object with id, name, and set`);
      continue;
    }

    const obj = raw as Record<string, unknown>;
    const id = obj.id;
    const name = obj.name;
    const set = obj.set;

    if (typeof id !== "string" || !id.trim()) {
      allErrors.push(`${ctx}: "id" must be a non-empty string`);
      continue;
    }
    if (typeof name !== "string") {
      allErrors.push(`${ctx}: "name" must be a string`);
      continue;
    }
    if (typeof set !== "string") {
      allErrors.push(`${ctx}: "set" must be a string`);
      continue;
    }

    if (seenIds.has(id)) {
      allErrors.push(`Duplicate id "${id}"`);
      continue;
    }
    seenIds.add(id);
    orderedIds.push(id);

    const expected = expectedById.get(id);
    if (!expected) {
      allErrors.push(`${ctx}: unknown id "${id}" (not in this collection)`);
      continue;
    }

    if (name !== expected.name) {
      allErrors.push(`${ctx}: name mismatch for "${expected.name}" (got "${name}")`);
    }
    if (set !== expected.set) {
      allErrors.push(
        `${ctx}: set mismatch for "${expected.name}" (expected "${expected.set || "—"}", got "${set || "—"}")`,
      );
    }
  }

  for (const entry of entries) {
    if (!seenIds.has(entry.id)) {
      allErrors.push(`Missing card: "${entry.card.name}" (${entrySetLabel(entry) || "—"})`);
    }
  }

  if (allErrors.length > 0) {
    return { ok: false, errors: formatErrors(allErrors) };
  }

  return { ok: true, orderedIds };
}
