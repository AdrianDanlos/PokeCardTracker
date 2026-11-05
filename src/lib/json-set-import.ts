export type JsonSetImportCard = {
  name: string;
  /** Explicit EN TCGdex id, or null for no image. Omit to auto-match. */
  id?: string | null;
};

export type JsonSetImportGroup = {
  set: string;
  enSets?: string[];
  cards: JsonSetImportCard[];
};

export type JsonSetImportRow = {
  setLabel: string;
  enSets: string[];
  name: string;
  id?: string | null;
};

const APOSTROPHE_RE = /[\u2018\u2019\u201B\u2032`´]/g;

/** Normalize card names for matching EN catalog titles. */
export function normalizeCardName(name: string): string {
  return name
    .trim()
    .replace(APOSTROPHE_RE, "'")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseCard(raw: unknown, context: string): JsonSetImportCard {
  if (typeof raw === "string") {
    const name = raw.trim();
    if (!name) throw new Error(`${context}: card name cannot be empty`);
    return { name };
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${context}: each card must be a string or object with "name"`);
  }
  const obj = raw as Record<string, unknown>;
  if (!("name" in obj)) {
    throw new Error(`${context}: each card object needs a "name" field`);
  }
  const name = String(obj.name).trim();
  if (!name) throw new Error(`${context}: card name cannot be empty`);
  const card: JsonSetImportCard = { name };
  if ("id" in obj) {
    const idVal = obj.id;
    if (idVal === null) card.id = null;
    else if (typeof idVal === "string") {
      const id = idVal.trim();
      if (!id) throw new Error(`${context}: "id" cannot be an empty string`);
      card.id = id;
    } else {
      throw new Error(`${context}: "id" must be a string or null`);
    }
  }
  return card;
}

function parseGroup(raw: unknown, index: number): JsonSetImportGroup {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`Group ${index + 1}: expected an object with "set" and "cards"`);
  }
  const obj = raw as Record<string, unknown>;
  const setLabel = String(obj.set ?? "").trim();
  if (!setLabel) throw new Error(`Group ${index + 1}: "set" is required`);
  if (!Array.isArray(obj.cards)) {
    throw new Error(`Group ${index + 1}: "cards" must be an array`);
  }
  if (obj.cards.length === 0) {
    throw new Error(`Group ${index + 1}: "cards" cannot be empty`);
  }
  let enSets: string[] | undefined;
  if ("enSets" in obj) {
    if (!Array.isArray(obj.enSets)) {
      throw new Error(`Group ${index + 1}: "enSets" must be an array of set ids`);
    }
    enSets = obj.enSets.map((s, i) => {
      const id = String(s).trim();
      if (!id) throw new Error(`Group ${index + 1}: enSets[${i}] is empty`);
      return id;
    });
  }
  const cards = obj.cards.map((c, i) => parseCard(c, `Group ${index + 1}, card ${i + 1}`));
  return { set: setLabel, enSets, cards };
}

export function parseJsonSetImport(text: string): JsonSetImportGroup[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }

  if (Array.isArray(data)) {
    if (data.length === 0) throw new Error("JSON array must contain at least one set group");
    return data.map((item, i) => parseGroup(item, i));
  }

  if (typeof data === "object" && data !== null && "set" in data && "cards" in data) {
    return [parseGroup(data, 0)];
  }

  throw new Error(
    'JSON must be a set group { "set", "enSets?", "cards" } or an array of those groups',
  );
}

export function flattenJsonSetImport(groups: JsonSetImportGroup[]): JsonSetImportRow[] {
  const rows: JsonSetImportRow[] = [];
  for (const group of groups) {
    const enSets = group.enSets ?? [];
    for (const card of group.cards) {
      rows.push({
        setLabel: group.set,
        enSets,
        name: card.name,
        ...(Object.prototype.hasOwnProperty.call(card, "id") ? { id: card.id } : {}),
      });
    }
  }
  return rows;
}
