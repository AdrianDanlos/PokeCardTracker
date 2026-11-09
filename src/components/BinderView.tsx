import { CardImage } from "@/components/CardImage";
import { matchesCollectionEntrySearch } from "@/lib/collection-entry-search";
import type { CollectionEntryWithCard } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

const POCKETS_PER_PAGE = 9;

/** Same outer box for filled and empty pockets so a short last row cannot shrink the page. */
const POCKET_FRAME = "flex w-full flex-col gap-1.5 rounded-lg border-2 p-1.5";
const POCKET_CAPTION =
  "h-[2lh] shrink-0 text-center text-xs leading-tight line-clamp-2";

export function buildBinderSlots(
  entries: CollectionEntryWithCard[],
  gaps: number[],
): (CollectionEntryWithCard | null)[] {
  const gapSet = new Set(gaps);
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const slots: (CollectionEntryWithCard | null)[] = [];
  let cardIdx = 0;
  let slot = 0;
  while (cardIdx < sorted.length) {
    if (gapSet.has(slot)) {
      slots.push(null);
      slot++;
      continue;
    }
    slots.push(sorted[cardIdx]!);
    cardIdx++;
    slot++;
  }
  if (slots.length === 0) {
    return Array.from({ length: POCKETS_PER_PAGE }, () => null);
  }
  const remainder = slots.length % POCKETS_PER_PAGE;
  if (remainder !== 0) {
    for (let i = 0; i < POCKETS_PER_PAGE - remainder; i++) {
      slots.push(null);
    }
  }
  return slots;
}

function totalPagesForSlotCount(slotCount: number) {
  return Math.max(1, Math.ceil(slotCount / POCKETS_PER_PAGE));
}

/** Page 1 alone, then spreads 2–3, 4–5, … like an open binder. */
function totalSpreadsForPageCount(totalPages: number) {
  if (totalPages <= 1) return 1;
  return 1 + Math.ceil((totalPages - 1) / 2);
}

function spreadNavTitle(spreadIndex: number, totalPages: number) {
  if (spreadIndex === 0) {
    return totalPages === 1 ? "Page 1" : "Page 1 of " + totalPages;
  }
  const left = 2 * spreadIndex - 1;
  const right = Math.min(2 * spreadIndex, totalPages - 1);
  const label =
    left === right
      ? `Page ${left + 1}`
      : `Pages ${left + 1}–${right + 1}`;
  return `${label} of ${totalPages}`;
}

function pageIndexToSpreadIndex(pageIndex: number) {
  return pageIndex <= 0 ? 0 : Math.ceil(pageIndex / 2);
}

function spreadJumpLabel(spreadIndex: number, totalPages: number) {
  if (spreadIndex === 0) return "1";
  const left = 2 * spreadIndex - 1;
  const right = Math.min(2 * spreadIndex, totalPages - 1);
  return left === right ? `${left + 1}` : `${left + 1}–${right + 1}`;
}

function pagesInSpread(spreadIndex: number, totalPages: number) {
  if (spreadIndex === 0) {
    return { leftPageIndex: null as number | null, rightPageIndex: 0 };
  }
  const left = 2 * spreadIndex - 1;
  const right = 2 * spreadIndex;
  return {
    leftPageIndex: left < totalPages ? left : null,
    rightPageIndex: right < totalPages ? right : null,
  };
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

function gapsOnPage(gaps: number[], pageIndex: number): number[] {
  const start = pageIndex * POCKETS_PER_PAGE;
  const end = start + POCKETS_PER_PAGE;
  return gaps.filter((g) => g >= start && g < end);
}

function lastCardSlotOnPage(
  slots: (CollectionEntryWithCard | null)[],
  pageIndex: number,
): number | null {
  const start = pageIndex * POCKETS_PER_PAGE;
  const end = Math.min(start + POCKETS_PER_PAGE, slots.length);
  for (let i = end - 1; i >= start; i--) {
    if (slots[i]) return i;
  }
  return null;
}

function addGapAtSlot(gaps: number[], slotIndex: number): number[] {
  if (gaps.includes(slotIndex)) return gaps;
  return [...gaps, slotIndex].sort((a, b) => a - b);
}

function removeLastGapOnPage(gaps: number[], pageIndex: number): number[] {
  const onPage = gapsOnPage(gaps, pageIndex);
  if (onPage.length === 0) return gaps;
  const remove = onPage[onPage.length - 1]!;
  return gaps.filter((g) => g !== remove);
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
    <div className={`${POCKET_FRAME} border-transparent`} aria-hidden>
      <div className="relative aspect-[3/4] w-full rounded-md border border-dashed border-border/60 bg-black/10" />
      <span className={`${POCKET_CAPTION} select-none text-transparent`}>—</span>
    </div>
  );
}

function BinderPocket({
  entry,
  slotNumber,
  onToggle,
  highlighted = false,
  dimmedBySearch = false,
}: {
  entry: CollectionEntryWithCard;
  slotNumber: number;
  onToggle: (entry: CollectionEntryWithCard) => void;
  highlighted?: boolean;
  dimmedBySearch?: boolean;
}) {
  const owned = entry.owned;
  return (
    <button
      type="button"
      onClick={() => onToggle(entry)}
      className={`group ${POCKET_FRAME} text-left transition ${
        dimmedBySearch ? "opacity-40" : ""
      } ${
        highlighted
          ? "z-[1] scale-[1.02] ring-2 ring-accent"
          : owned
            ? "border-border bg-surface-elevated"
            : "border-dashed border-missing bg-transparent"
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
      <span className={`${POCKET_CAPTION} text-foreground`}>
        {entry.card.name}
      </span>
    </button>
  );
}

function BinderPageGrid({
  pageIndex,
  slots,
  onToggleOwned,
  highlightedIds,
  searchActive,
}: {
  pageIndex: number;
  slots: (CollectionEntryWithCard | null)[];
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
  highlightedIds: Set<string> | null;
  searchActive: boolean;
}) {
  const cells = useMemo(() => {
    const start = pageIndex * POCKETS_PER_PAGE;
    return Array.from({ length: POCKETS_PER_PAGE }, (_, cell) => {
      const globalIndex = start + cell;
      return { globalIndex, entry: slots[globalIndex] ?? null };
    });
  }, [pageIndex, slots]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cells.map(({ globalIndex, entry }) =>
        entry ? (
          <BinderPocket
            key={entry.id}
            entry={entry}
            slotNumber={entry.position + 1}
            onToggle={onToggleOwned}
            highlighted={highlightedIds?.has(entry.id) ?? false}
            dimmedBySearch={
              searchActive && !(highlightedIds?.has(entry.id) ?? false)
            }
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
  slots,
  gaps,
  onToggleOwned,
  onGapsChange,
  highlightedIds,
  searchActive,
  className = "",
}: {
  pageIndex: number;
  pageNumberOneBased: number;
  slots: (CollectionEntryWithCard | null)[];
  gaps: number[];
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
  onGapsChange?: (gaps: number[]) => void;
  highlightedIds: Set<string> | null;
  searchActive: boolean;
  className?: string;
}) {
  const canEditGaps = onGapsChange != null;
  const lastCard = canEditGaps ? lastCardSlotOnPage(slots, pageIndex) : null;
  const pageGaps = canEditGaps ? gapsOnPage(gaps, pageIndex) : [];

  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-3 self-stretch ${className}`}>
      <div className="grow shrink-0 rounded-xl border border-border bg-surface p-3 sm:p-4">
        <BinderPageGrid
          pageIndex={pageIndex}
          slots={slots}
          onToggleOwned={onToggleOwned}
          highlightedIds={highlightedIds}
          searchActive={searchActive}
        />
      </div>
      <div className="relative flex items-center justify-center">
        <p className="text-center text-sm text-muted">
          Page {pageNumberOneBased}
        </p>
        {canEditGaps ? (
          <div className="absolute right-0 flex items-center gap-1">
            {pageGaps.length > 0 ? (
              <button
                type="button"
                className="btn-ghost flex h-8 w-8 items-center justify-center rounded-full p-0 text-lg leading-none"
                aria-label="Pull next card back to this page"
                onClick={() => onGapsChange!(removeLastGapOnPage(gaps, pageIndex))}
              >
                −
              </button>
            ) : null}
            {lastCard != null ? (
              <button
                type="button"
                className="btn-ghost flex h-8 w-8 items-center justify-center rounded-full p-0 text-lg leading-none"
                aria-label="Push last card to next page"
                onClick={() =>
                  onGapsChange!(addGapAtSlot(gaps, lastCard))
                }
              >
                +
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BinderView({
  entries,
  gaps = [],
  onGapsChange,
  onToggleOwned,
  highlightQuery = "",
}: {
  entries: CollectionEntryWithCard[];
  gaps?: number[];
  onGapsChange?: (gaps: number[]) => void;
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
  highlightQuery?: string;
}) {
  const isMobile = useMobileLayout();
  const effectiveGaps = onGapsChange ? gaps : [];
  const slots = useMemo(
    () => buildBinderSlots(entries, effectiveGaps),
    [entries, effectiveGaps],
  );
  const totalPages = totalPagesForSlotCount(slots.length);
  const totalSpreads = totalSpreadsForPageCount(totalPages);
  const maxNavIndex = Math.max(
    0,
    isMobile ? totalPages - 1 : totalSpreads - 1,
  );

  const [navIndex, setNavIndex] = useState(0);

  const trimmedHighlightQuery = highlightQuery.trim();
  const searchActive = trimmedHighlightQuery.length > 0;

  const highlightedIds = useMemo(() => {
    if (!searchActive) return null;
    const ids = new Set<string>();
    for (const entry of entries) {
      if (matchesCollectionEntrySearch(entry, trimmedHighlightQuery)) {
        ids.add(entry.id);
      }
    }
    return ids;
  }, [entries, searchActive, trimmedHighlightQuery]);

  const pagesWithMatches = useMemo(() => {
    if (!highlightedIds || highlightedIds.size === 0) {
      return new Set<number>();
    }
    const pages = new Set<number>();
    for (let i = 0; i < slots.length; i++) {
      const entry = slots[i];
      if (entry && highlightedIds.has(entry.id)) {
        pages.add(Math.floor(i / POCKETS_PER_PAGE));
      }
    }
    return pages;
  }, [slots, highlightedIds]);

  const spreadsWithMatches = useMemo(() => {
    const spreads = new Set<number>();
    for (const page of pagesWithMatches) {
      spreads.add(pageIndexToSpreadIndex(page));
    }
    return spreads;
  }, [pagesWithMatches]);

  useEffect(() => {
    if (!searchActive || !highlightedIds || highlightedIds.size === 0) return;
    let firstSlot: number | null = null;
    for (let i = 0; i < slots.length; i++) {
      const entry = slots[i];
      if (entry && highlightedIds.has(entry.id)) {
        firstSlot = i;
        break;
      }
    }
    if (firstSlot == null) return;
    const pageIndex = Math.floor(firstSlot / POCKETS_PER_PAGE);
    const nextNav = isMobile
      ? pageIndex
      : pageIndexToSpreadIndex(pageIndex);
    setNavIndex((i) => (i === nextNav ? i : nextNav));
  }, [trimmedHighlightQuery, isMobile, slots, searchActive, highlightedIds]);

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

  const { leftPageIndex, rightPageIndex } = isMobile
    ? { leftPageIndex: navIndex, rightPageIndex: null as number | null }
    : pagesInSpread(navIndex, totalPages);

  const navTitle = isMobile
    ? `Page ${navIndex + 1} of ${totalPages}`
    : spreadNavTitle(navIndex, totalPages);

  const jumpItems = useMemo(() => {
    if (isMobile) {
      return buildJumpItems(navIndex, totalPages, (i) => `${i + 1}`);
    }
    return buildJumpItems(navIndex, totalSpreads, (i) =>
      spreadJumpLabel(i, totalPages),
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
          {isMobile ? (
            <BinderPagePanel
              pageIndex={leftPageIndex!}
              pageNumberOneBased={leftPageIndex! + 1}
              slots={slots}
              gaps={effectiveGaps}
              onToggleOwned={onToggleOwned}
              onGapsChange={onGapsChange}
              highlightedIds={highlightedIds}
              searchActive={searchActive}
            />
          ) : (
            <>
              {leftPageIndex != null ? (
                <BinderPagePanel
                  pageIndex={leftPageIndex}
                  pageNumberOneBased={leftPageIndex + 1}
                  slots={slots}
                  gaps={effectiveGaps}
                  onToggleOwned={onToggleOwned}
                  onGapsChange={onGapsChange}
                  highlightedIds={highlightedIds}
                  searchActive={searchActive}
                />
              ) : (
                <div className="hidden min-w-0 flex-1 md:block" aria-hidden />
              )}
              <BinderRings />
              {rightPageIndex != null ? (
                <BinderPagePanel
                  pageIndex={rightPageIndex}
                  pageNumberOneBased={rightPageIndex + 1}
                  slots={slots}
                  gaps={effectiveGaps}
                  onToggleOwned={onToggleOwned}
                  onGapsChange={onGapsChange}
                  highlightedIds={highlightedIds}
                  searchActive={searchActive}
                />
              ) : (
                <div className="hidden min-w-0 flex-1 md:block" aria-hidden />
              )}
            </>
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
              <span className="inline-flex items-center gap-1.5">
                {item.label}
                {searchActive &&
                (isMobile
                  ? pagesWithMatches.has(item.index)
                  : spreadsWithMatches.has(item.index)) ? (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    aria-hidden
                  />
                ) : null}
              </span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
