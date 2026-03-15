"use client";

import { memo, useState } from "react";
import type { Category } from "@/db";

const TAGS_PREVIEW = 8;

interface FilterBarProps {
  categories: Category[];
  allTags: string[];
  selectedCategory: Category | null;
  selectedTags: string[];
  onCategoryChange: (c: Category | null) => void;
  onTagToggle: (tag: string) => void;
}

export const FilterBar = memo(function FilterBar({
  categories,
  allTags,
  selectedCategory,
  selectedTags,
  onCategoryChange,
  onTagToggle,
}: FilterBarProps) {
  const [tagsExpanded, setTagsExpanded] = useState(false);

  // Always show selected tags even if collapsed
  const visibleTags = tagsExpanded
    ? allTags
    : allTags.filter((t, i) => i < TAGS_PREVIEW || selectedTags.includes(t));

  const hiddenCount = allTags.length - visibleTags.length;

  return (
    <div className="mb-3 flex flex-wrap gap-1">
      {/* Category pills */}
      <button
        type="button"
        onClick={() => onCategoryChange(null)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          selectedCategory === null
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onCategoryChange(selectedCategory === cat ? null : cat)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selectedCategory === cat
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          {cat}
        </button>
      ))}

      {/* Tag pills */}
      {allTags.length > 0 && (
        <span className="mx-1 self-center text-gray-300 dark:text-gray-700">|</span>
      )}
      {visibleTags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onTagToggle(tag)}
          className={`rounded-full px-3 py-1 text-xs transition-colors ${
            selectedTags.includes(tag)
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          #{tag}
        </button>
      ))}

      {/* Show more / less */}
      {!tagsExpanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setTagsExpanded(true)}
          className="rounded-full px-3 py-1 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700 transition-colors"
        >
          +{hiddenCount} more
        </button>
      )}
      {tagsExpanded && allTags.length > TAGS_PREVIEW && (
        <button
          type="button"
          onClick={() => setTagsExpanded(false)}
          className="rounded-full px-3 py-1 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700 transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
});
