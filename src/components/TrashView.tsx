"use client";

import { memo } from "react";
import type { Item } from "@/db";
import { itemDomain } from "@/lib/linkDomain";
import { formatDate, ItemLink, ItemThumbnail, KindBadge, quietButton, rowTitleClass } from "./ItemRow";

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
          <ul
            aria-label="Trash"
            className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800"
          >
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:flex-nowrap">
                <div className="flex min-w-0 basis-full items-center gap-3 sm:flex-1 sm:basis-0">
                  <ItemThumbnail item={item} className="h-9 w-16" />
                  <div className="min-w-0 flex-1">
                    <ItemLink
                      item={item}
                      titleClassName={rowTitleClass}
                      className="text-sm font-medium text-gray-800 dark:text-gray-200"
                    />
                    <p className="mt-1 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <KindBadge item={item} />
                      {[itemDomain(item), item.deletedAt && `Deleted ${formatDate(item.deletedAt)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => onRestore(item.id)} className={quietButton}>
                    Restore
                  </button>
                  <button type="button" onClick={() => deleteOne(item)} className={quietButton}>
                    Delete forever
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
});
