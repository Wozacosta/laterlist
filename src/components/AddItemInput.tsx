"use client";

import { memo, useState, useCallback } from "react";
import type { Item } from "@/db";

type EnrichedData = Omit<Item, "id" | "sortOrder" | "addedAt" | "status">;

interface AddItemInputProps {
  onAdd: (data: EnrichedData) => void;
  isLoggedIn: boolean;
}

export const AddItemInput = memo(function AddItemInput({ onAdd, isLoggedIn }: AddItemInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim()) return;
      setLoading(true);
      setError(null);

      try {
        if (isLoggedIn) {
          // Logged in — full AI enrichment
          const res = await fetch("/api/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url.trim() }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.error ?? "Failed to enrich URL");
            return;
          }

          onAdd({
            url: url.trim(),
            title: data.title,
            thumbnail: data.thumbnail ?? undefined,
            category: data.category,
            tags: data.tags,
            duration: data.duration ?? undefined,
          });
        } else {
          // Not logged in — save URL as-is, no AI
          onAdd({
            url: url.trim(),
            title: url.trim(),
            category: "other",
            tags: [],
          });
        }

        setUrl("");
      } catch {
        setError("Network error — please try again");
      } finally {
        setLoading(false);
      }
    },
    [url, onAdd, isLoggedIn]
  );

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          placeholder="Paste a URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>
      {!isLoggedIn && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Sign in to enable AI enrichment (title, tags, category)
        </p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});
