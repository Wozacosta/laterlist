"use client";

import { memo, useState } from "react";

interface QuickNoteProps {
  label: string;
  placeholder: string;
  onSave: (text: string) => void;
  onDismiss: () => void;
}

/** One optional line, saved with Enter and skipped with Esc. */
export const QuickNote = memo(function QuickNote({ label, placeholder, onSave, onDismiss }: QuickNoteProps) {
  const [text, setText] = useState("");

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim()) onSave(text.trim());
    else onDismiss();
  }

  return (
    <form
      onSubmit={save}
      className="mb-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-900 dark:bg-blue-950/40"
    >
      <label className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-blue-700 dark:text-blue-300">{label}</span>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onDismiss()}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder-gray-500"
        />
      </label>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded px-2 py-1 text-xs text-gray-500 hover:bg-blue-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-blue-900 dark:hover:text-gray-200"
      >
        Skip
      </button>
    </form>
  );
});
