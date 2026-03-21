"use client";

import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Group, Item, GroupColor, Topic } from "@/db";
import { colorStyles } from "@/lib/groupColors";
import { GroupHeader } from "./GroupHeader";
import { ItemRow } from "./ItemRow";

interface GroupSectionProps {
  group: Group;
  items: Item[];
  topics: Topic[];
  onRename: (id: string, name: string) => void;
  onSetColor: (id: string, color: GroupColor) => void;
  onToggleCollapse: (id: string, collapsed: boolean) => void;
  onDeleteGroup: (id: string) => void;
  onMarkDone: (id: string) => void;
  onUnmarkDone: (id: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDeleteItem: (id: string) => void;
  onAssignTopic: (itemId: string, topicId: string) => void;
  onUnassignTopic: (itemId: string, topicId: string) => void;
}

export const GroupSection = memo(function GroupSection({
  group,
  items,
  topics,
  onRename,
  onSetColor,
  onToggleCollapse,
  onDeleteGroup,
  onMarkDone,
  onUnmarkDone,
  onUpdateTags,
  onUpdateNotes,
  onDeleteItem,
  onAssignTopic,
  onUnassignTopic,
}: GroupSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `group-${group.id}` });
  const { border, bg } = colorStyles[group.color];

  return (
    <div className="flex flex-col gap-1">
      <GroupHeader
        group={group}
        itemCount={items.length}
        onRename={onRename}
        onSetColor={onSetColor}
        onToggleCollapse={onToggleCollapse}
        onDelete={onDeleteGroup}
      />

      {!group.collapsed && (
        <div
          ref={setNodeRef}
          className={`rounded-lg border-l-4 pl-3 transition-colors ${border} ${
            isOver ? bg : ""
          } ${items.length === 0 ? "py-3" : "py-1"}`}
        >
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-600 pl-1">
              Drag items here
            </p>
          ) : (
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    topics={topics}
                    onMarkDone={onMarkDone}
                    onUnmarkDone={onUnmarkDone}
                    onUpdateTags={onUpdateTags}
                    onUpdateNotes={onUpdateNotes}
                    onDelete={onDeleteItem}
                    onAssignTopic={onAssignTopic}
                    onUnassignTopic={onUnassignTopic}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
});
