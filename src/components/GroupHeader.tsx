"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import type { Group, GroupColor } from "@/db";
import { GROUP_COLORS, colorStyles } from "@/lib/groupColors";

interface GroupHeaderProps {
  group: Group;
  itemCount: number;
  onRename: (id: string, name: string) => void;
  onSetColor: (id: string, color: GroupColor) => void;
  onToggleCollapse: (id: string, collapsed: boolean) => void;
  onDelete: (id: string) => void;
}

export const GroupHeader = memo(function GroupHeader({
  group,
  itemCount,
  onRename,
  onSetColor,
  onToggleCollapse,
  onDelete,
}: GroupHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { border, dot } = colorStyles[group.color];

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== group.name) {
      onRename(group.id, trimmed);
    } else {
      setDraft(group.name);
    }
  }, [draft, group.id, group.name, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commitRename();
      if (e.key === "Escape") { setDraft(group.name); setEditing(false); }
    },
    [commitRename, group.name]
  );

  return (
    <div className={`flex items-center gap-2 rounded-lg border-l-4 px-3 py-2 ${border} bg-white dark:bg-gray-950`}>
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => onToggleCollapse(group.id, !group.collapsed)}
        className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-transform"
        style={{ transform: group.collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        aria-label={group.collapsed ? "Expand group" : "Collapse group"}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Color dot / picker trigger */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setShowColorPicker((v) => !v)}
          className={`h-3 w-3 rounded-full ${dot} hover:scale-125 transition-transform`}
          aria-label="Change color"
        />
        {showColorPicker && (
          <div className="absolute left-0 top-5 z-20 flex gap-1.5 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            {GROUP_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { onSetColor(group.id, c); setShowColorPicker(false); }}
                className={`h-4 w-4 rounded-full ${colorStyles[c].dot} hover:scale-125 transition-transform ${group.color === c ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
                aria-label={colorStyles[c].label}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none border-b border-blue-400"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => { setDraft(group.name); setEditing(true); }}
          className="flex-1 min-w-0 text-left text-sm font-semibold text-gray-800 dark:text-gray-200 truncate"
        >
          {group.name}
        </button>
      )}

      {/* Item count */}
      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-600">
        {itemCount} item{itemCount !== 1 ? "s" : ""}
      </span>

      {/* Delete group */}
      <button
        type="button"
        onClick={() => onDelete(group.id)}
        className="shrink-0 text-gray-300 hover:text-red-500 dark:text-gray-700 dark:hover:text-red-400 transition-colors"
        aria-label="Delete group"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  );
});
