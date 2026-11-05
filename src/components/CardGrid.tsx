import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type CSSProperties } from "react";
import { CardImage } from "@/components/CardImage";
import { DragGripIcon } from "@/components/ui/DragGripIcon";
import { PencilIcon } from "@/components/ui/PencilIcon";
import type { CollectionEntryWithCard } from "@/lib/types";

function entryStableKey(entry: CollectionEntryWithCard) {
  return entry.card.external_id
    ? `${entry.card.source_id}:${entry.card.external_id}`
    : entry.id;
}

const DRAG_ACTIVATION_DISTANCE_PX = 0;

function CardTileBody({
  entry,
  onToggleOwned,
  onRemoveEntry,
  onEditEntry,
  className = "",
  dragHandle,
  dragHandleVisual,
  setNodeRef,
  style,
}: {
  entry: CollectionEntryWithCard;
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
  onRemoveEntry: (entry: CollectionEntryWithCard) => void;
  onEditEntry?: (entry: CollectionEntryWithCard) => void;
  className?: string;
  dragHandle?: {
    setActivatorNodeRef: (node: HTMLElement | null) => void;
    attributes: object;
    listeners: object | undefined;
  };
  /** Static grip (e.g. drag overlay) — same look, no sortable listeners */
  dragHandleVisual?: boolean;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
}) {
  const owned = entry.owned;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex h-full min-h-0 flex-col rounded-lg p-3 transition hover:border-accent/30 ${
        owned ? "card-tile-owned" : "card-tile-missing"
      } ${className}`}
    >
      <div className="mb-2 flex shrink-0 items-center gap-1.5">
        {dragHandle ? (
          <button
            type="button"
            ref={dragHandle.setActivatorNodeRef}
            {...dragHandle.attributes}
            {...dragHandle.listeners}
            aria-label={`Drag ${entry.card.name} to reorder`}
            className="drag-handle flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/50 text-muted transition hover:bg-black/70 hover:text-foreground"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <DragGripIcon />
          </button>
        ) : dragHandleVisual ? (
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/50 text-muted"
          >
            <DragGripIcon />
          </span>
        ) : null}
        <button
          type="button"
          aria-label={owned ? "Mark as missing" : "Mark as owned"}
          className="flex h-7 min-w-0 flex-1 items-center rounded-md text-left active:scale-[0.98]"
          onClick={() => onToggleOwned(entry)}
        >
          {owned ? (
            <span className="inline-flex h-7 items-center rounded bg-accent px-2 text-xs font-semibold leading-none text-black">
              Owned
            </span>
          ) : (
            <span className="inline-flex h-7 items-center rounded border border-border px-2 text-xs leading-none text-muted">
              Missing
            </span>
          )}
        </button>
        <button
          type="button"
          aria-label={`Remove ${entry.card.name} from collection`}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-black/30 hover:text-red-400"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemoveEntry(entry);
          }}
        >
          <span className="text-lg leading-none" aria-hidden>
            ×
          </span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => onToggleOwned(entry)}
        className="flex min-h-0 flex-1 flex-col text-left active:scale-[0.98]"
      >
        <CardImage
          imagePath={entry.card.image_path}
          imageUrl={entry.card.image_url}
          alt={entry.card.name}
          dimmed={!owned}
          className="mb-3 aspect-[3/4] w-full shrink-0"
        />
        <div className="space-y-0.5">
          <p className="line-clamp-2 text-sm font-medium leading-tight">{entry.card.name}</p>
          <p className="line-clamp-2 text-xs leading-tight text-muted">
            {entry.card.set?.name?.trim() || "—"}
          </p>
        </div>
      </button>
      {onEditEntry && !entry.id.startsWith("optimistic-") ? (
        <button
          type="button"
          aria-label={`Edit ${entry.card.name}`}
          className="absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-elevated/95 text-muted shadow-sm transition hover:border-accent/40 hover:text-accent"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEditEntry(entry);
          }}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function SortableCardTile({
  entry,
  onToggleOwned,
  onRemoveEntry,
  onEditEntry,
  dragDisabled,
}: {
  entry: CollectionEntryWithCard;
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
  onRemoveEntry: (entry: CollectionEntryWithCard) => void;
  onEditEntry?: (entry: CollectionEntryWithCard) => void;
  dragDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: entry.id,
    disabled: dragDisabled,
  });

  const style: CSSProperties | undefined = dragDisabled
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      };

  return (
    <CardTileBody
      entry={entry}
      onToggleOwned={onToggleOwned}
      onRemoveEntry={onRemoveEntry}
      onEditEntry={onEditEntry}
      setNodeRef={dragDisabled ? undefined : setNodeRef}
      style={style}
      dragHandle={
        dragDisabled
          ? undefined
          : {
              setActivatorNodeRef,
              attributes,
              listeners,
            }
      }
    />
  );
}

export function CardGrid({
  entries,
  onToggleOwned,
  onRemoveEntry,
  onEditEntry,
  sortable = false,
  onReorder,
}: {
  entries: CollectionEntryWithCard[];
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
  onRemoveEntry: (entry: CollectionEntryWithCard) => void;
  onEditEntry?: (entry: CollectionEntryWithCard) => void;
  sortable?: boolean;
  onReorder?: (orderedEntryIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 0, tolerance: DRAG_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(KeyboardSensor),
  );

  const sortableIds = entries.map((e) => e.id);
  const [activeEntry, setActiveEntry] = useState<CollectionEntryWithCard | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const entry = entries.find((e) => e.id === String(event.active.id)) ?? null;
    setActiveEntry(entry);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveEntry(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(sortableIds, oldIndex, newIndex));
  }

  function handleDragCancel() {
    setActiveEntry(null);
  }

  if (!sortable || !onReorder) {
    return (
      <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {entries.map((entry) => (
          <CardTileBody
            key={entryStableKey(entry)}
            entry={entry}
            onToggleOwned={onToggleOwned}
            onRemoveEntry={onRemoveEntry}
            onEditEntry={onEditEntry}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {entries.map((entry) => (
            <SortableCardTile
              key={entry.id}
              entry={entry}
              onToggleOwned={onToggleOwned}
              onRemoveEntry={onRemoveEntry}
              onEditEntry={onEditEntry}
              dragDisabled={entry.id.startsWith("optimistic-")}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null} adjustScale={false}>
        {activeEntry ? (
          <div className="pointer-events-none rotate-1 scale-[1.02] opacity-95 shadow-2xl">
            <CardTileBody
              entry={activeEntry}
              onToggleOwned={() => {}}
              onRemoveEntry={() => {}}
              dragHandleVisual
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
