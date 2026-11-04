import type { ProgressBreakdown } from "@/lib/types";

function BreakdownSection({
  title,
  data,
}: {
  title: string;
  data: Record<string, { total: number; owned: number }>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1].total - a[1].total);
  if (!entries.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-muted">{title}</h3>
      <ul className="space-y-2">
        {entries.map(([key, stat]) => {
          const pct = stat.total ? Math.round((100 * stat.owned) / stat.total) : 0;
          return (
            <li key={key} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate">{key}</span>
                <span className="text-muted">
                  {stat.owned}/{stat.total} ({pct}%)
                </span>
              </div>
              <div className="progress-track mt-1">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StatsPanel({ breakdown }: { breakdown: ProgressBreakdown }) {
  return (
    <aside className="space-y-6 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">Stats</h2>
      <BreakdownSection title="By rarity" data={breakdown.by_rarity} />
      <BreakdownSection title="By set" data={breakdown.by_set} />
      <BreakdownSection title="By category" data={breakdown.by_category} />
    </aside>
  );
}
