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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import type { Item, Group, GroupColor, Topic } from "@/db";
import { useTopicDrop } from "@/hooks/useTopicDrop";
import { reorderItems } from "@/lib/reorderItems";
import { DragPreview, ItemRow } from "./ItemRow";
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
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (updates: Array<{ id: string; sortOrder: number }>) => void;
  onAssignToGroup: (itemId: string, groupId: string | undefined) => void;
  onDropOnTopic: (itemId: string, topicId: string) => void;
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
  onToggleStar,
  onDelete,
  onReorder,
  onAssignToGroup,
  onDropOnTopic,
  onAssignTopic,
  onUnassignTopic,
  onRenameGroup,
  onSetGroupColor,
  onToggleGroupCollapse,
  onDeleteGroup,
  onAddGroup,
}: ItemListProps) {
  const [draggingId, setDraggingId] = useState<UniqueIdentifier | null>(null);
  const topicDrop = useTopicDrop(onDropOnTopic);

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
      if (topicDrop.finish(active.id as string) || !over) return;

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

      const updates = reorderItems(ungroupedItems, activeId, overId);
      if (updates.length) onReorder(updates);
    },
    [items, ungroupedItems, onAssignToGroup, onReorder, topicDrop]
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
      onDragStart={(e) => {
        setDraggingId(e.active.id);
        topicDrop.start();
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDraggingId(null);
        topicDrop.cancel();
      }}
    >
      {/* Ungrouped items */}
      <UngroupedZone showZone={isDraggingGrouped}>
        <SortableContext
          items={ungroupedItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={ungroupedItems.length ? "mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800" : undefined}>
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
                onToggleStar={onToggleStar}
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
            onToggleStar={onToggleStar}
            onDeleteItem={onDelete}
            onAssignTopic={onAssignTopic}
            onUnassignTopic={onUnassignTopic}
          />
        ))}
      </div>

      <AddGroupButton onClick={onAddGroup} />

      {/* Drag overlay */}
      <DragOverlay>
        {draggingItem && <DragPreview title={draggingItem.title} />}
      </DragOverlay>
    </DndContext>
  );
});

const AddGroupButton = memo(function AddGroupButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto mt-3 flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      New group
    </button>
  );
});
