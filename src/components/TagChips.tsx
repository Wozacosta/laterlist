"use client";

import { memo, useState, useCallback, useRef } from "react";

interface TagChipsProps {
  tags: string[];
  onRemove: (tag: string) => void;
  onAdd: (tag: string) => void;
  editable?: boolean;
}

export const TagChips = memo(function TagChips({
  tags,
  onRemove,
  onAdd,
  editable = true,
}: TagChipsProps) {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddClick = useCallback(() => {
    setShowInput(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const commitTag = useCallback(() => {
    const val = inputValue.trim().toLowerCase();
    if (val && !tags.includes(val)) {
      onAdd(val);
    }
    setInputValue("");
    setShowInput(false);
  }, [inputValue, tags, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitTag();
      } else if (e.key === "Escape") {
        setInputValue("");
        setShowInput(false);
      }
    },
    [commitTag]
  );

  return (
    <div className="flex flex-wrap items-center gap-1" data-no-expand="true">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          {tag}
          {editable && (
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="ml-0.5 text-gray-400 hover:text-gray-700 leading-none dark:hover:text-gray-200"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {editable && !showInput && (
        <button
          type="button"
          onClick={handleAddClick}
          className="rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors dark:border-gray-600 dark:text-gray-500 dark:hover:border-gray-500 dark:hover:text-gray-400"
          aria-label="Add tag"
        >
          +
        </button>
      )}
      {editable && showInput && (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitTag}
          className="w-20 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          placeholder="tag..."
        />
      )}
    </div>
  );
});
