"use client";

import { memo, useState, useCallback } from "react";
import type { Item, Category } from "@/db";

type EnrichedData = Omit<Item, "id" | "sortOrder" | "addedAt" | "status">;

type Mode = "url" | "manual";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "paper", label: "Paper" },
  { value: "repo", label: "Repo" },
  { value: "podcast", label: "Podcast" },
  { value: "doc", label: "Doc" },
  { value: "other", label: "Other" },
];

interface AddItemInputProps {
  onAdd: (data: EnrichedData) => void;
  isLoggedIn: boolean;
}

export const AddItemInput = memo(function AddItemInput({ onAdd, isLoggedIn }: AddItemInputProps) {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setUrl("");
    setTitle("");
    setHours("");
    setMinutes("");
    setCategory("other");
    setError(null);
  }, []);

  const handleSubmitUrl = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim()) return;
      setLoading(true);
      setError(null);

      try {
        if (isLoggedIn) {
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

  const handleSubmitManual = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;

      const h = parseInt(hours, 10) || 0;
      const m = parseInt(minutes, 10) || 0;
      const totalSeconds = h * 3600 + m * 60;

      onAdd({
        url: "",
        title: title.trim(),
        category,
        tags: [],
        duration: totalSeconds > 0 ? totalSeconds : undefined,
      });

      resetForm();
    },
    [title, hours, minutes, category, onAdd, resetForm]
  );

  const switchMode = useCallback(
    (newMode: Mode) => {
      if (newMode !== mode) {
        setMode(newMode);
        resetForm();
      }
    },
    [mode, resetForm]
  );

  return (
    <div className="mb-4">
      {/* Mode toggle */}
      <div className="mb-2 flex gap-1">
        <button
          type="button"
          onClick={() => switchMode("url")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            mode === "url"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          }`}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => switchMode("manual")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            mode === "manual"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          }`}
        >
          Manual
        </button>
      </div>

      {mode === "url" ? (
        /* URL mode */
        <form onSubmit={handleSubmitUrl} className="flex gap-2">
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
      ) : (
        /* Manual mode */
        <form onSubmit={handleSubmitManual} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder='e.g. "Build a shell in Rust"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </form>
      )}

      {mode === "url" && !isLoggedIn && (
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
