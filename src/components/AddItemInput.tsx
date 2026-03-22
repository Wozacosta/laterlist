"use client";

import { memo, useState, useCallback } from "react";
import type { Item, Category } from "@/db";

type EnrichedData = Omit<Item, "id" | "sortOrder" | "addedAt" | "status">;

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "paper", label: "Paper" },
  { value: "repo", label: "Repo" },
  { value: "podcast", label: "Podcast" },
  { value: "doc", label: "Doc" },
  { value: "other", label: "Other" },
];

/** Returns true when the string looks like a URL. */
function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  // bare domain-ish patterns like "example.com/path"
  if (/^[a-z0-9-]+(\.[a-z]{2,})(\/|$)/i.test(trimmed)) return true;
  return false;
}

interface AddItemInputProps {
  onAdd: (data: EnrichedData) => void;
  isLoggedIn: boolean;
}

export const AddItemInput = memo(function AddItemInput({ onAdd, isLoggedIn }: AddItemInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optional detail fields shown for manual (non-URL) items
  const [showDetails, setShowDetails] = useState(false);
  const [category, setCategory] = useState<Category>("other");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  const resetForm = useCallback(() => {
    setInput("");
    setCategory("other");
    setHours("");
    setMinutes("");
    setError(null);
    setShowDetails(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;

      if (looksLikeUrl(trimmed)) {
        // --- URL path ---
        const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        setLoading(true);
        setError(null);

        try {
          if (isLoggedIn) {
            const res = await fetch("/api/enrich", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            });

            const data = await res.json();

            if (!res.ok) {
              setError(data.error ?? "Failed to enrich URL");
              return;
            }

            onAdd({
              url,
              title: data.title,
              thumbnail: data.thumbnail ?? undefined,
              category: data.category,
              tags: data.tags,
              duration: data.duration ?? undefined,
            });
          } else {
            onAdd({
              url,
              title: url,
              category: "other",
              tags: [],
            });
          }

          resetForm();
        } catch {
          setError("Network error — please try again");
        } finally {
          setLoading(false);
        }
      } else {
        // --- Manual / plain-text path ---
        const h = parseInt(hours, 10) || 0;
        const m = parseInt(minutes, 10) || 0;
        const totalSeconds = h * 3600 + m * 60;

        onAdd({
          url: "",
          title: trimmed,
          category,
          tags: [],
          duration: totalSeconds > 0 ? totalSeconds : undefined,
        });

        resetForm();
      }
    },
    [input, isLoggedIn, hours, minutes, category, onAdd, resetForm]
  );

  const isUrl = looksLikeUrl(input);

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste a URL or type a title..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            disabled={loading}
            className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </div>

        {/* Optional detail row for manual items */}
        {!isUrl && input.trim() && (
          <div className="flex items-center gap-2">
            {!showDetails ? (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                + category &amp; duration
              </button>
            ) : (
              <>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    placeholder="0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-12 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  />
                  <span>h</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-12 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  />
                  <span>m</span>
                </div>
              </>
            )}
          </div>
        )}
      </form>

      {isUrl && !isLoggedIn && (
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
