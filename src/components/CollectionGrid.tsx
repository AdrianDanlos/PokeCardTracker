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
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type CSSProperties } from "react";
import { CollectionCard } from "@/components/CollectionCard";
import type { CollectionProgressSummary } from "@/lib/types";

const DRAG_ACTIVATION_DISTANCE_PX = 0;

function SortableCollectionCard({
  collection,
  index,
  onDelete,
  deleting,
}: {
  collection: CollectionProgressSummary;
  index: number;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const disabled = collection.collection_id.startsWith("demo-");
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: collection.collection_id,
    disabled,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <CollectionCard
      collection={collection}
      index={index}
      onDelete={onDelete}
      deleting={deleting}
      sortableRef={setNodeRef}
      sortableStyle={style}
      dragHandle={
        disabled
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

export function CollectionGrid({
  collections,
  sortable,
  onReorder,
  onDelete,
  deletingId,
}: {
  collections: CollectionProgressSummary[];
  sortable: boolean;
  onReorder?: (orderedCollectionIds: string[]) => void;
  onDelete: (collection: CollectionProgressSummary) => void;
  deletingId: string | null;
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

  const sortableIds = collections.map((c) => c.collection_id);
  const [activeCollection, setActiveCollection] =
    useState<CollectionProgressSummary | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const col =
      collections.find((c) => c.collection_id === String(event.active.id)) ??
      null;
    setActiveCollection(col);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCollection(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(sortableIds, oldIndex, newIndex));
  }

  function handleDragCancel() {
    setActiveCollection(null);
  }

  const grid = (
    <div className="grid items-stretch gap-5 sm:grid-cols-3">
      {collections.map((c, i) =>
        sortable && onReorder ? (
          <SortableCollectionCard
            key={c.collection_id}
            collection={c}
            index={i}
            onDelete={() => onDelete(c)}
            deleting={deletingId === c.collection_id}
          />
        ) : (
          <CollectionCard
            key={c.collection_id}
            collection={c}
            index={i}
            onDelete={() => onDelete(c)}
            deleting={deletingId === c.collection_id}
          />
        ),
      )}
    </div>
  );

  if (!sortable || !onReorder) {
    return grid;
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
        {grid}
      </SortableContext>
      <DragOverlay dropAnimation={null} adjustScale={false}>
        {activeCollection ? (
          <div className="pointer-events-none rotate-1 scale-[1.02] opacity-95 shadow-2xl">
            <CollectionCard
              collection={activeCollection}
              index={0}
              dragHandleVisual
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
