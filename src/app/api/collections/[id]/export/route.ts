import { exportCollectionCsv } from "@/lib/csv";
import { getCollectionEntries } from "@/lib/data/collections";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { entries } = await getCollectionEntries(id);
  const csv = exportCollectionCsv(entries);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="collection-${id}.csv"`,
    },
  });
}
