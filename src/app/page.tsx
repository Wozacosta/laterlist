"use client";

import { useState, useCallback, useMemo } from "react";
import { useItems } from "@/hooks/useItems";
import { AddItemInput } from "@/components/AddItemInput";
import { FilterBar } from "@/components/FilterBar";
import { ItemList } from "@/components/ItemList";
import { CloudSyncButton } from "@/components/CloudSyncButton";
import type { Category, Item } from "@/db";

type EnrichedData = Omit<Item, "id" | "sortOrder" | "addedAt" | "status">;

export default function Page() {
  const {
    items,
    archivedItems,
    isLoading,
    addItem,
    updateItem,
    markDone,
    unmarkDone,
    deleteItem,
    reorderItems,
  } = useItems();

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => item.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [items]);

  const categories = useMemo(() => {
    const catSet = new Set<Category>();
    items.forEach((item) => catSet.add(item.category));
    return Array.from(catSet) as Category[];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => item.tags.includes(t)))
        return false;
      return true;
    });
  }, [items, selectedCategory, selectedTags]);

  const handleAdd = useCallback(
    async (data: EnrichedData) => {
      await addItem(data);
    },
    [addItem]
  );

  const handleUpdateTags = useCallback(
    async (id: string, tags: string[]) => {
      await updateItem(id, { tags });
    },
    [updateItem]
  );

  const handleUpdateNotes = useCallback(
    async (id: string, notes: string) => {
      await updateItem(id, { notes });
    },
    [updateItem]
  );

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">laterlist</h1>
        <CloudSyncButton />
      </div>

      <AddItemInput onAdd={handleAdd} />

      <FilterBar
        categories={categories}
        allTags={allTags}
        selectedCategory={selectedCategory}
        selectedTags={selectedTags}
        onCategoryChange={setSelectedCategory}
        onTagToggle={handleTagToggle}
      />

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
      ) : (
        <ItemList
          items={filteredItems}
          onMarkDone={markDone}
          onUnmarkDone={unmarkDone}
          onUpdateTags={handleUpdateTags}
          onUpdateNotes={handleUpdateNotes}
          onDelete={deleteItem}
          onReorder={reorderItems}
        />
      )}

      {archivedItems.length > 0 && (
        <p className="mt-4 text-center text-xs text-gray-400">
          {archivedItems.length} archived item{archivedItems.length !== 1 ? "s" : ""}
        </p>
      )}
    </main>
  );
}
