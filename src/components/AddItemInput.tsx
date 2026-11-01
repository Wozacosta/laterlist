"use client";

import { memo, useState, useCallback } from "react";
import type { Item } from "@/db";
import { getAccessToken } from "@/db/accessToken";
import { looksLikeUrl, toUrl } from "@/lib/looksLikeUrl";

type NewItem = Omit<Item, "id" | "sortOrder" | "addedAt" | "status">;
type Enrichment = Pick<Item, "title" | "category" | "tags"> & Partial<Pick<Item, "thumbnail" | "duration">>;

async function enrich(url: string): Promise<Enrichment | null> {
  const token = await getAccessToken();
  const res = await fetch("/api/enrich", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) return null;

  const { title, category, tags, thumbnail, duration } = await res.json();
  return {
    title,
    category,
    tags,
    thumbnail: thumbnail ?? undefined,
    duration: duration ?? undefined,
  };
}

interface AddItemInputProps {
  placeholder: string;
  onAdd: (data: NewItem) => Promise<string | undefined>;
  onEnriched: (id: string, patch: Enrichment) => void;
  isLoggedIn: boolean;
}

export const AddItemInput = memo(function AddItemInput({
  placeholder,
  onAdd,
  onEnriched,
  isLoggedIn,
}: AddItemInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      setInput("");

      if (!looksLikeUrl(trimmed)) {
        await onAdd({ url: "", title: trimmed, category: "other", tags: [] });
        return;
      }

      // The paste is saved first, so a failed lookup only leaves the link as its title.
      const url = toUrl(trimmed);
      const id = await onAdd({ url, title: url, category: "other", tags: [] });
      if (!id || !isLoggedIn) return;

      const patch = await enrich(url).catch(() => null);
      if (patch) onEnriched(id, patch);
    },
    [input, isLoggedIn, onAdd, onEnriched]
  );

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <input
        type="text"
        aria-label="Add a link or a note"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
      />
    </form>
  );
});
