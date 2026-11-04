import type { CollectionEntryWithCard, OwnedCopyRecord } from "@/lib/types";

export function exportCollectionCsv(entries: CollectionEntryWithCard[]) {
  const header = [
    "collection_entry_id",
    "card_id",
    "position",
    "name",
    "number",
    "set",
    "rarity",
    "language",
    "category",
    "owned_qty",
    "condition",
    "edition",
    "variant",
    "purchase_price",
    "notes",
  ].join(",");
  const rows = entries.map((e) =>
    [
      e.id,
      e.card_id,
      e.position,
      csvEscape(e.card.name),
      csvEscape(e.card.number ?? ""),
      csvEscape(e.card.set?.name ?? ""),
      csvEscape(e.card.rarity ?? ""),
      e.card.language,
      e.card.category,
      e.owned_quantity,
      csvEscape(e.owned_copy?.condition ?? ""),
      csvEscape(e.owned_copy?.edition ?? e.card.edition ?? ""),
      csvEscape(e.owned_copy?.variant ?? e.card.variant ?? ""),
      e.owned_copy?.purchase_price ?? "",
      csvEscape(e.owned_copy?.notes ?? ""),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export function exportInventoryCsv(copies: OwnedCopyRecord[], cardNames: Map<string, string>) {
  const header = [
    "card_id",
    "name",
    "quantity",
    "condition",
    "language",
    "edition",
    "variant",
    "purchase_price",
    "notes",
  ].join(",");
  const rows = copies.map((c) =>
    [
      c.card_id,
      csvEscape(cardNames.get(c.card_id) ?? ""),
      c.quantity,
      c.condition,
      csvEscape(c.language ?? ""),
      csvEscape(c.edition ?? ""),
      csvEscape(c.variant ?? ""),
      c.purchase_price ?? "",
      csvEscape(c.notes ?? ""),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export interface ImportCollectionRow {
  card_id?: string;
  name?: string;
  number?: string;
  position?: number;
}

export function parseCollectionCsv(text: string): ImportCollectionRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: ImportCollectionRow = {};
    headers.forEach((h, i) => {
      const v = cols[i]?.trim();
      if (!v) return;
      if (h === "card_id") row.card_id = v;
      if (h === "name") row.name = v;
      if (h === "number") row.number = v;
      if (h === "position") row.position = Number(v);
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
