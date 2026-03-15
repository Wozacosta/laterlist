"use client";

import { memo, useCallback } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Item } from "@/db";
import { ItemRow } from "./ItemRow";
import { EmptyState } from "./EmptyState";

interface ItemListProps {
  items: Item[];
  filtered: boolean;
  onMarkDone: (id: string) => void;
  onUnmarkDone: (id: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
  onReorder: (updates: Array<{ id: string; sortOrder: number }>) => void;
}

export const ItemList = memo(function ItemList({
  items,
  filtered,
  onMarkDone,
  onUnmarkDone,
  onUpdateTags,
  onUpdateNotes,
  onDelete,
  onReorder,
}: ItemListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      const updates = reordered.map((item, index) => ({
        id: item.id,
        sortOrder: (reordered.length - index) * 1000,
      }));
      onReorder(updates);
    },
    [items, onReorder]
  );

  if (items.length === 0) {
    return <EmptyState filtered={filtered} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onMarkDone={onMarkDone}
              onUnmarkDone={onUnmarkDone}
              onUpdateTags={onUpdateTags}
              onUpdateNotes={onUpdateNotes}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});
