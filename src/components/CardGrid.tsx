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
import { useRef, useState, type CSSProperties } from "react";
import { CardImage } from "@/components/CardImage";
import { PencilIcon } from "@/components/ui/PencilIcon";
import type { CollectionEntryWithCard } from "@/lib/types";

function entryStableKey(entry: CollectionEntryWithCard) {
  return entry.card.external_id
    ? `${entry.card.source_id}:${entry.card.external_id}`
    : entry.id;
}

/** Pointer must move this far before a drag starts; release without dragging toggles owned. */
const DRAG_ACTIVATION_DISTANCE_PX = 0;

function CardTileBody({
  entry,
  onToggleOwned,
  onRemoveEntry,
  onEditEntry,
  className = "",
  imageDragProps,
  setNodeRef,
  setActivatorNodeRef,
  onImagePointerUp,
  style,
}: {
  entry: CollectionEntryWithCard;
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
  onRemoveEntry: (entry: CollectionEntryWithCard) => void;
  onEditEntry?: (entry: CollectionEntryWithCard) => void;
  className?: string;
  /** Drag image after moving pointer; release without drag toggles owned via onImagePointerUp. */
  imageDragProps?: Record<string, unknown>;
  setNodeRef?: (node: HTMLElement | null) => void;
  setActivatorNodeRef?: (node: HTMLElement | null) => void;
  onImagePointerUp?: (entryId: string) => void;
  style?: CSSProperties;
}) {
  const owned = entry.owned;
  const dragFromImage = imageDragProps != null;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex h-full min-h-0 flex-col rounded-lg p-3 hover:border-accent/30 ${
        dragFromImage ? "transition-[border-color,box-shadow] duration-150" : "transition"
      } ${owned ? "card-tile-owned" : "card-tile-missing"} ${className}`}
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          aria-label={owned ? "Mark as missing" : "Mark as owned"}
          className="min-h-7 flex-1 rounded-md text-left active:scale-[0.98]"
          onClick={() => onToggleOwned(entry)}
        >
          {owned ? (
            <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-black">
              Owned
            </span>
          ) : (
            <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted">
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
      {dragFromImage ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={setActivatorNodeRef}
            className="mb-3 w-full shrink-0 cursor-grab select-none active:cursor-grabbing"
            {...imageDragProps}
            onPointerUp={(e) => {
              if (e.button !== 0) return;
              onImagePointerUp?.(entry.id);
            }}
          >
            <CardImage
              imagePath={entry.card.image_path}
              imageUrl={entry.card.image_url}
              alt={entry.card.name}
              dimmed={!owned}
              className="aspect-[3/4] w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => onToggleOwned(entry)}
            className="space-y-0.5 text-left active:scale-[0.98]"
          >
            <p className="line-clamp-2 text-sm font-medium leading-tight">{entry.card.name}</p>
            <p className="line-clamp-2 text-xs leading-tight text-muted">
              {entry.card.set?.name?.trim() || "—"}
            </p>
          </button>
        </div>
      ) : (
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
      )}
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

function DragOverlayTile({ entry }: { entry: CollectionEntryWithCard }) {
  const owned = entry.owned;
  return (
    <div
      className={`pointer-events-none flex w-[min(42vw,11rem)] flex-col rounded-lg p-3 shadow-2xl ring-2 ring-accent/40 ${
        owned ? "card-tile-owned" : "card-tile-missing"
      }`}
    >
      <CardImage
        imagePath={entry.card.image_path}
        imageUrl={entry.card.image_url}
        alt={entry.card.name}
        dimmed={!owned}
        className="mb-2 aspect-[3/4] w-full"
      />
      <p className="line-clamp-2 text-sm font-medium leading-tight">{entry.card.name}</p>
    </div>
  );
}

function SortableCardTile({
  entry,
  onRemoveEntry,
  onEditEntry,
  onImageClick,
  onImagePointerUp,
  dragDisabled,
}: {
  entry: CollectionEntryWithCard;
  onRemoveEntry: (entry: CollectionEntryWithCard) => void;
  onEditEntry?: (entry: CollectionEntryWithCard) => void;
  onImageClick: (entry: CollectionEntryWithCard) => void;
  onImagePointerUp?: (entryId: string) => void;
  dragDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({
      id: entry.id,
      disabled: dragDisabled,
      transition: null,
      animateLayoutChanges: () => false,
    });
  const style = dragDisabled
    ? undefined
    : {
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: "none",
        opacity: isDragging ? 0.35 : 1,
      };

  return (
    <CardTileBody
      entry={entry}
      onToggleOwned={onImageClick}
      onRemoveEntry={onRemoveEntry}
      onEditEntry={onEditEntry}
      setNodeRef={dragDisabled ? undefined : setNodeRef}
      setActivatorNodeRef={dragDisabled ? undefined : setActivatorNodeRef}
      onImagePointerUp={onImagePointerUp}
      style={style}
      imageDragProps={
        dragDisabled
          ? undefined
          : {
              ...attributes,
              ...listeners,
              "aria-label": `Drag ${entry.card.name} to reorder; release without dragging to toggle owned`,
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
  const dragActivation = { distance: DRAG_ACTIVATION_DISTANCE_PX };
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: dragActivation }),
    useSensor(TouchSensor, { activationConstraint: dragActivation }),
    useSensor(KeyboardSensor),
  );

  const sortableIds = entries.map((e) => e.id);
  const [activeEntry, setActiveEntry] = useState<CollectionEntryWithCard | null>(null);
  const suppressToggleAfterDragRef = useRef(false);

  function handleDragStart(event: DragStartEvent) {
    suppressToggleAfterDragRef.current = true;
    const entry = entries.find((e) => e.id === String(event.active.id)) ?? null;
    setActiveEntry(entry);
  }

  function handleToggleFromSortable(entry: CollectionEntryWithCard) {
    if (suppressToggleAfterDragRef.current) {
      suppressToggleAfterDragRef.current = false;
      return;
    }
    onToggleOwned(entry);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveEntry(null);
    window.setTimeout(() => {
      suppressToggleAfterDragRef.current = false;
    }, 400);
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(sortableIds, oldIndex, newIndex));
  }

  function handleDragCancel() {
    setActiveEntry(null);
    window.setTimeout(() => {
      suppressToggleAfterDragRef.current = false;
    }, 400);
  }

  function handleImagePointerUp(entryId: string) {
    if (suppressToggleAfterDragRef.current) {
      suppressToggleAfterDragRef.current = false;
      return;
    }
    const entry = entries.find((e) => e.id === entryId);
    if (entry) onToggleOwned(entry);
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
              onRemoveEntry={onRemoveEntry}
              onEditEntry={onEditEntry}
              onImageClick={handleToggleFromSortable}
              onImagePointerUp={handleImagePointerUp}
              dragDisabled={entry.id.startsWith("optimistic-")}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null} adjustScale={false}>
        {activeEntry ? <DragOverlayTile entry={activeEntry} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
