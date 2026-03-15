import { memo } from "react";

export const EmptyState = memo(function EmptyState({
  filtered,
}: {
  filtered: boolean;
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-4 text-gray-200 dark:text-gray-800"
      >
        {/* Bookmark stack illustration */}
        <rect x="18" y="12" width="32" height="44" rx="3" fill="currentColor" />
        <rect x="24" y="8" width="32" height="44" rx="3" fill="currentColor" className="opacity-60" />
        <rect x="30" y="4" width="32" height="44" rx="3" fill="currentColor" className="opacity-30" />
        {/* Link icon on front */}
        <path
          d="M28 36 C28 33 31 30 34 30 L38 30 M44 30 L48 30 C51 30 54 33 54 36 C54 39 51 42 48 42 L44 42 M36 36 L46 36"
          stroke="#94a3b8"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="dark:stroke-gray-600"
        />
      </svg>

      {filtered ? (
        <>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No matches</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">Try a different filter</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nothing saved yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">Paste a URL above to get started</p>
        </>
      )}
    </div>
  );
});
