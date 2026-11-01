"use client";

import { memo } from "react";
import type { Item } from "@/db";
import { formatDate, ItemLink, ItemThumbnail, KindBadge } from "./ItemRow";

const quietButton =
  "shrink-0 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200";

interface TrashViewProps {
  items: Item[];
  onRestore: (id: string) => void;
  onDeleteForever: (ids: string[]) => void;
}

export const TrashView = memo(function TrashView({ items, onRestore, onDeleteForever }: TrashViewProps) {
  function deleteOne(item: Item) {
    if (window.confirm(`Delete "${item.title}" forever? This can't be undone.`)) {
      onDeleteForever([item.id]);
    }
  }

  function empty() {
    const count = items.length === 1 ? "1 item" : `${items.length} items`;
    if (window.confirm(`Delete ${count} forever? This can't be undone.`)) {
      onDeleteForever(items.map((item) => item.id));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-2xl font-bold text-gray-900 dark:text-white">Trash</h2>
        {items.length > 0 && (
          <button type="button" onClick={empty} className={quietButton}>
            Empty Trash
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          The Trash is empty.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Items stay here until you empty the Trash.
          </p>
          <ul aria-label="Trash" className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-800"
              >
                <ItemThumbnail item={item} className="hidden h-9 w-16 sm:block" />
                <div className="min-w-0 flex-1">
                  <ItemLink item={item} className="text-[15px] font-medium text-gray-800 dark:text-gray-200" />
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
                    <KindBadge item={item} />
                    {item.deletedAt && `Deleted ${formatDate(item.deletedAt)}`}
                  </p>
                </div>
                <button type="button" onClick={() => onRestore(item.id)} className={quietButton}>
                  Restore
                </button>
                <button type="button" onClick={() => deleteOne(item)} className={quietButton}>
                  Delete forever
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
});
