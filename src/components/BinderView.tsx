import { CardImage } from "@/components/CardImage";
import type { CollectionEntryWithCard } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

const POCKETS_PER_PAGE = 9;

function totalPagesForEntryCount(count: number) {
  return Math.max(1, Math.ceil(count / POCKETS_PER_PAGE));
}

function spreadLabel(spreadIndex: number, totalPages: number) {
  const p1 = spreadIndex * 2 + 1;
  const p2 = Math.min(spreadIndex * 2 + 2, totalPages);
  return p1 === p2 ? `${p1}` : `${p1}–${p2}`;
}

type JumpItem =
  | { kind: "jump"; index: number; label: string }
  | { kind: "ellipsis" };

function buildJumpItems(
  current: number,
  total: number,
  labelForIndex: (index: number) => string,
): JumpItem[] {
  if (total <= 0) return [];
  const indices = new Set<number>();
  indices.add(0);
  indices.add(total - 1);
  for (let d = -1; d <= 1; d++) {
    const i = current + d;
    if (i >= 0 && i < total) indices.add(i);
  }
  const sorted = [...indices].sort((a, b) => a - b);
  const out: JumpItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const idx = sorted[i];
    if (i > 0 && idx - sorted[i - 1]! > 1) {
      out.push({ kind: "ellipsis" });
    }
    out.push({ kind: "jump", index: idx, label: labelForIndex(idx) });
  }
  return out;
}

function useMobileLayout() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

function BinderRings() {
  return (
    <div
      className="hidden shrink-0 flex-col items-center justify-center gap-5 px-1 md:flex"
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-7 w-7 rounded-full border-2 border-muted bg-surface-elevated shadow-inner"
        />
      ))}
    </div>
  );
}

function EmptyPocket() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-[3/4] w-full rounded-md border border-dashed border-border/60 bg-black/10" />
      <span className="text-center text-xs text-transparent select-none">
        —
      </span>
    </div>
  );
}

function BinderPocket({
  entry,
  slotNumber,
  onToggle,
}: {
  entry: CollectionEntryWithCard;
  slotNumber: number;
  onToggle: (entry: CollectionEntryWithCard) => void;
}) {
  const owned = entry.owned;
  return (
    <button
      type="button"
      onClick={() => onToggle(entry)}
      className={`group flex w-full flex-col gap-1.5 rounded-lg p-1.5 text-left transition ${
        owned ? "card-tile-owned" : "card-tile-missing"
      }`}
      aria-label={`${entry.card.name}, slot ${slotNumber}. ${owned ? "Owned" : "Missing"}. Click to toggle.`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md">
        <CardImage
          imagePath={entry.card.image_path}
          imageUrl={entry.card.image_url}
          alt=""
          dimmed={!owned}
          className="h-full w-full"
        />
        {owned ? (
          <div className="binder-pocket-gloss pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-white/10" />
        ) : null}
        <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 py-0.5 text-[10px] tabular-nums text-muted">
          #{slotNumber}
        </span>
      </div>
      <span className="line-clamp-2 min-h-[2lh] text-center text-xs leading-tight text-foreground">
        {entry.card.name}
      </span>
    </button>
  );
}

function BinderPageGrid({
  pageIndex,
  entries,
  onToggleOwned,
}: {
  pageIndex: number;
  entries: CollectionEntryWithCard[];
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
}) {
  const cells = useMemo(() => {
    const start = pageIndex * POCKETS_PER_PAGE;
    return Array.from({ length: POCKETS_PER_PAGE }, (_, cell) => {
      const globalIndex = start + cell;
      return { globalIndex, entry: entries[globalIndex] ?? null };
    });
  }, [pageIndex, entries]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cells.map(({ globalIndex, entry }) =>
        entry ? (
          <BinderPocket
            key={entry.id}
            entry={entry}
            slotNumber={entry.position + 1}
            onToggle={onToggleOwned}
          />
        ) : (
          <EmptyPocket key={`empty-${pageIndex}-${globalIndex}`} />
        ),
      )}
    </div>
  );
}

function BinderPagePanel({
  pageIndex,
  pageNumberOneBased,
  entries,
  onToggleOwned,
  className = "",
}: {
  pageIndex: number;
  pageNumberOneBased: number;
  entries: CollectionEntryWithCard[];
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-3 ${className}`}>
      <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
        <BinderPageGrid
          pageIndex={pageIndex}
          entries={entries}
          onToggleOwned={onToggleOwned}
        />
      </div>
      <p className="text-center text-sm text-muted">
        Page {pageNumberOneBased}
      </p>
    </div>
  );
}

export function BinderView({
  entries,
  onToggleOwned,
}: {
  entries: CollectionEntryWithCard[];
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
}) {
  const isMobile = useMobileLayout();
  const totalPages = totalPagesForEntryCount(entries.length);
  const totalSpreads = Math.ceil(totalPages / 2);
  const navUnitCount = isMobile ? totalPages : totalSpreads;
  const maxNavIndex = Math.max(0, navUnitCount - 1);

  const [navIndex, setNavIndex] = useState(0);

  useEffect(() => {
    setNavIndex((i) => Math.min(i, maxNavIndex));
  }, [maxNavIndex]);

  const goPrev = useCallback(() => {
    setNavIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setNavIndex((i) => Math.min(maxNavIndex, i + 1));
  }, [maxNavIndex]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext]);

  const leftPageIndex = isMobile ? navIndex : navIndex * 2;
  const rightPageIndex = isMobile ? -1 : navIndex * 2 + 1;
  const showRightPage = !isMobile && rightPageIndex < totalPages;

  const navTitle = isMobile
    ? `Page ${navIndex + 1} of ${totalPages}`
    : showRightPage
      ? `Pages ${leftPageIndex + 1}–${rightPageIndex + 1} of ${totalPages}`
      : `Page ${leftPageIndex + 1} of ${totalPages}`;

  const jumpItems = useMemo(() => {
    if (isMobile) {
      return buildJumpItems(navIndex, totalPages, (i) => `${i + 1}`);
    }
    return buildJumpItems(navIndex, totalSpreads, (i) =>
      spreadLabel(i, totalPages),
    );
  }, [isMobile, navIndex, totalPages, totalSpreads]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 sm:justify-start">
        <button
          type="button"
          className="btn-ghost px-3 py-2 disabled:opacity-40"
          disabled={navIndex <= 0}
          onClick={goPrev}
          aria-label="Previous page"
        >
          ←
        </button>
        <span className="min-w-[10rem] text-center text-sm font-medium tabular-nums sm:text-left">
          {navTitle}
        </span>
        <button
          type="button"
          className="btn-ghost px-3 py-2 disabled:opacity-40"
          disabled={navIndex >= maxNavIndex}
          onClick={goNext}
          aria-label="Next page"
        >
          →
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface-elevated p-3 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
          <BinderPagePanel
            pageIndex={leftPageIndex}
            pageNumberOneBased={leftPageIndex + 1}
            entries={entries}
            onToggleOwned={onToggleOwned}
          />
          <BinderRings />
          {showRightPage ? (
            <BinderPagePanel
              pageIndex={rightPageIndex}
              pageNumberOneBased={rightPageIndex + 1}
              entries={entries}
              onToggleOwned={onToggleOwned}
            />
          ) : (
            <div className="hidden min-w-0 flex-1 md:block" aria-hidden />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {jumpItems.map((item, i) =>
          item.kind === "ellipsis" ? (
            <span key={`e-${i}`} className="px-1 text-sm text-muted">
              …
            </span>
          ) : (
            <button
              key={item.label}
              type="button"
              className={
                item.index === navIndex
                  ? "btn-primary px-3 py-1 text-sm"
                  : "btn-ghost px-3 py-1 text-sm"
              }
              onClick={() => setNavIndex(item.index)}
            >
              {item.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
