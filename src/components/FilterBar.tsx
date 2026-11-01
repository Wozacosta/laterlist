"use client";

import { memo } from "react";
import type { ItemKind } from "@/lib/itemKind";

const chipClass = (active: boolean, on = "bg-blue-600 text-white") =>
  `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? on
      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
  }`;

const toggleOn = "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900";

interface FilterBarProps {
  kinds: ItemKind[];
  selectedKind: ItemKind | null;
  noTopic: boolean;
  noTopicCount: number;
  hideDone: boolean;
  search: string;
  onKindChange: (kind: ItemKind | null) => void;
  onToggleNoTopic: () => void;
  onToggleHideDone: () => void;
  onSearchChange: (search: string) => void;
}

export const FilterBar = memo(function FilterBar({
  kinds,
  selectedKind,
  noTopic,
  noTopicCount,
  hideDone,
  search,
  onKindChange,
  onToggleNoTopic,
  onToggleHideDone,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => onKindChange(null)}
        className={chipClass(selectedKind === null)}
      >
        All
      </button>
      {kinds.map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => onKindChange(selectedKind === kind ? null : kind)}
          className={chipClass(selectedKind === kind)}
        >
          {kind}
        </button>
      ))}

      <button
        type="button"
        onClick={onToggleNoTopic}
        aria-pressed={noTopic}
        className={chipClass(noTopic, toggleOn)}
      >
        {noTopic ? "✓ " : ""}No topic ({noTopicCount})
      </button>
      <button
        type="button"
        onClick={onToggleHideDone}
        aria-pressed={hideDone}
        className={chipClass(hideDone, toggleOn)}
      >
        {hideDone ? "✓ " : ""}Hide done
      </button>

      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Search your list"
        placeholder="Search titles, tags, notes"
        className="ml-auto min-w-0 flex-1 basis-48 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 sm:max-w-56"
      />
    </div>
  );
});
