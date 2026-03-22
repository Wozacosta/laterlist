"use client";

import { memo, useCallback } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, UniqueIdentifier } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import type { Item, Group, GroupColor, Topic } from "@/db";
import { ItemRow } from "./ItemRow";
import { GroupSection } from "./GroupSection";
import { EmptyState } from "./EmptyState";

// Droppable zone for ungrouping (drop here to remove from group)
function UngroupedDropZone({ isOver }: { isOver: boolean }) {
  return (
    <div
      className={`mb-1 rounded-lg border-2 border-dashed px-3 py-2 text-xs text-center transition-colors ${
        isOver
          ? "border-blue-400 bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400"
          : "border-gray-200 text-gray-400 dark:border-gray-800"
      }`}
    >
      Drop here to ungroup
    </div>
  );
}

function UngroupedZone({ children, showZone }: { children: React.ReactNode; showZone: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "ungrouped" });
  return (
    <div ref={setNodeRef}>
      {showZone && <UngroupedDropZone isOver={isOver} />}
      {children}
    </div>
  );
}

interface ItemListProps {
  items: Item[];
  groups: Group[];
  topics: Topic[];
  filtered: boolean;
  onMarkDone: (id: string) => void;
  onUnmarkDone: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
  onReorder: (updates: Array<{ id: string; sortOrder: number }>) => void;
  onAssignToGroup: (itemId: string, groupId: string | undefined) => void;
  onAssignTopic: (itemId: string, topicId: string) => void;
  onUnassignTopic: (itemId: string, topicId: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onSetGroupColor: (id: string, color: GroupColor) => void;
  onToggleGroupCollapse: (id: string, collapsed: boolean) => void;
  onDeleteGroup: (id: string) => void;
  onAddGroup: () => void;
}

export const ItemList = memo(function ItemList({
  items,
  groups,
  topics,
  filtered,
  onMarkDone,
  onUnmarkDone,
  onPublish,
  onUnpublish,
  onUpdateTags,
  onUpdateNotes,
  onDelete,
  onReorder,
  onAssignToGroup,
  onAssignTopic,
  onUnassignTopic,
  onRenameGroup,
  onSetGroupColor,
  onToggleGroupCollapse,
  onDeleteGroup,
  onAddGroup,
}: ItemListProps) {
  const [draggingId, setDraggingId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ungroupedItems = items.filter((i) => !i.groupId);
  const draggingItem = draggingId ? items.find((i) => i.id === draggingId) : null;
  const isDraggingGrouped = draggingItem?.groupId != null;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingId(null);
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Dropped on a group droppable
      if (overId.startsWith("group-")) {
        const groupId = overId.replace("group-", "");
        onAssignToGroup(activeId, groupId);
        return;
      }

      // Dropped on ungrouped zone
      if (overId === "ungrouped") {
        onAssignToGroup(activeId, undefined);
        return;
      }

      // Reorder within ungrouped
      const activeItem = items.find((i) => i.id === activeId);
      const overItem = items.find((i) => i.id === overId);
      if (!activeItem || !overItem) return;
      if (activeItem.groupId || overItem.groupId) return; // only reorder ungrouped

      const oldIndex = ungroupedItems.findIndex((i) => i.id === activeId);
      const newIndex = ungroupedItems.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(ungroupedItems, oldIndex, newIndex);
      onReorder(
        reordered.map((item, index) => ({
          id: item.id,
          sortOrder: (reordered.length - index) * 1000,
        }))
      );
    },
    [items, ungroupedItems, onAssignToGroup, onReorder]
  );

  if (items.length === 0 && groups.length === 0) {
    return (
      <>
        <EmptyState filtered={filtered} />
        <AddGroupButton onClick={onAddGroup} />
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setDraggingId(e.active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      {/* Ungrouped items */}
      <UngroupedZone showZone={isDraggingGrouped}>
        <SortableContext
          items={ungroupedItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1 mb-4">
            {ungroupedItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                topics={topics}
                onMarkDone={onMarkDone}
                onUnmarkDone={onUnmarkDone}
                onPublish={onPublish}
                onUnpublish={onUnpublish}
                onUpdateTags={onUpdateTags}
                onUpdateNotes={onUpdateNotes}
                onDelete={onDelete}
                onAssignTopic={onAssignTopic}
                onUnassignTopic={onUnassignTopic}
              />
            ))}
          </div>
        </SortableContext>
      </UngroupedZone>

      {/* Groups */}
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <GroupSection
            key={group.id}
            group={group}
            items={items.filter((i) => i.groupId === group.id)}
            topics={topics}
            onRename={onRenameGroup}
            onSetColor={onSetGroupColor}
            onToggleCollapse={onToggleGroupCollapse}
            onDeleteGroup={onDeleteGroup}
            onMarkDone={onMarkDone}
            onUnmarkDone={onUnmarkDone}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            onUpdateTags={onUpdateTags}
            onUpdateNotes={onUpdateNotes}
            onDeleteItem={onDelete}
            onAssignTopic={onAssignTopic}
            onUnassignTopic={onUnassignTopic}
          />
        ))}
      </div>

      <AddGroupButton onClick={onAddGroup} />

      {/* Drag overlay */}
      <DragOverlay>
        {draggingItem && (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg opacity-90 text-sm font-medium text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300">
            {draggingItem.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
});

const AddGroupButton = memo(function AddGroupButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors dark:border-gray-700 dark:text-gray-600 dark:hover:border-gray-600 dark:hover:text-gray-400"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      New group
    </button>
  );
});
