import type { CollectionEntryWithCard } from "@/lib/types";

export type CollectionOrderRow = { name: string; position: number };

export function parseCollectionOrderJson(text: string): CollectionOrderRow[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }

  const rows: CollectionOrderRow[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === "string") {
        const match = item.match(/^([\s\S]+?):\s*(\d+)\s*$/);
        if (!match) throw new Error(`Expected "Card name: number", got: ${item}`);
        rows.push({ name: match[1].trim(), position: Number(match[2]) });
        continue;
      }
      if (typeof item === "object" && item !== null && "name" in item) {
        const name = String((item as { name: unknown }).name).trim();
        const position = Number((item as { position?: unknown; number?: unknown }).position ?? (item as { number?: unknown }).number);
        if (!name || !Number.isFinite(position)) throw new Error("Each item needs name and position (or number)");
        rows.push({ name, position });
        continue;
      }
      throw new Error("Array items must be strings like \"Name: 1\" or objects with name and position");
    }
    return rows;
  }

  if (typeof data === "object" && data !== null) {
    for (const [name, value] of Object.entries(data)) {
      const position = Number(value);
      if (!name.trim() || !Number.isFinite(position)) {
        throw new Error(`Invalid entry for "${name}"`);
      }
      rows.push({ name: name.trim(), position });
    }
    return rows;
  }

  throw new Error("JSON must be an object or array");
}

export function exportCollectionOrderJson(entries: CollectionEntryWithCard[]): string {
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const obj: Record<string, number> = {};
  for (let i = 0; i < sorted.length; i++) {
    obj[sorted[i].card.name] = i + 1;
  }
  return JSON.stringify(obj, null, 2);
}

export function downloadTextFile(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
