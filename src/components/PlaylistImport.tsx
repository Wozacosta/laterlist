"use client";

import { memo, useState, useCallback } from "react";
import type { PlaylistVideo } from "@/app/api/playlist/route";

interface PlaylistImportProps {
  /** Called with the fetched playlist data for the review step. */
  onPlaylistLoaded: (title: string, videos: PlaylistVideo[]) => void;
}

export const PlaylistImport = memo(function PlaylistImport({
  onPlaylistLoaded,
}: PlaylistImportProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = url.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/playlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to fetch playlist");
          return;
        }

        onPlaylistLoaded(data.title, data.videos);
        setUrl("");
        setOpen(false);
      } catch {
        setError("Network error — please try again");
      } finally {
        setLoading(false);
      }
    },
    [url, onPlaylistLoaded]
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Import YouTube playlist
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Import YouTube playlist
        </h4>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setUrl("");
          }}
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Paste a YouTube playlist URL..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          disabled={loading}
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Fetching..." : "Fetch"}
        </button>
      </form>
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});
