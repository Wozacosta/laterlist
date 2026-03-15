import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useItems } from "./useItems";
import { db } from "@/db";

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

afterEach(() => {
  if (db.isOpen()) db.close();
});

describe("useItems", () => {
  it("starts with isLoading true then resolves to empty items", async () => {
    const { result } = renderHook(() => useItems());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual([]);
  });

  it("addItem adds an item that appears in items", async () => {
    const { result } = renderHook(() => useItems());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addItem({
        url: "https://example.com",
        title: "Test Article",
        category: "article",
        tags: ["test"],
      });
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].title).toBe("Test Article");
    expect(result.current.items[0].status).toBe("unread");
    expect(result.current.items[0].id).toMatch(/^itm/);
  });

  it("markDone sets status=done and doneAt", async () => {
    const { result } = renderHook(() => useItems());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addItem({
        url: "https://example.com",
        title: "Test",
        category: "article",
        tags: [],
      });
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const id = result.current.items[0].id;

    await act(async () => {
      await result.current.markDone(id);
    });
    await waitFor(() =>
      expect(result.current.items.find((i) => i.id === id)?.status).toBe("done")
    );
    expect(result.current.items.find((i) => i.id === id)?.doneAt).toBeDefined();
  });

  it("unmarkDone resets status to unread and clears doneAt", async () => {
    const { result } = renderHook(() => useItems());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addItem({
        url: "https://example.com",
        title: "Test",
        category: "article",
        tags: [],
      });
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const id = result.current.items[0].id;

    await act(async () => { await result.current.markDone(id); });
    await waitFor(() =>
      expect(result.current.items.find((i) => i.id === id)?.status).toBe("done")
    );

    await act(async () => { await result.current.unmarkDone(id); });
    await waitFor(() =>
      expect(result.current.items.find((i) => i.id === id)?.status).toBe("unread")
    );
    expect(result.current.items.find((i) => i.id === id)?.doneAt).toBeUndefined();
  });

  it("deleteItem removes the item", async () => {
    const { result } = renderHook(() => useItems());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addItem({
        url: "https://example.com",
        title: "Test",
        category: "article",
        tags: [],
      });
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const id = result.current.items[0].id;

    await act(async () => { await result.current.deleteItem(id); });
    await waitFor(() => expect(result.current.items).toHaveLength(0));
  });

  it("reorderItems updates sortOrder values", async () => {
    const { result } = renderHook(() => useItems());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addItem({ url: "https://a.com", title: "A", category: "article", tags: [] });
      await result.current.addItem({ url: "https://b.com", title: "B", category: "article", tags: [] });
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    const [first, second] = result.current.items;
    await act(async () => {
      await result.current.reorderItems([
        { id: first.id, sortOrder: 1000 },
        { id: second.id, sortOrder: 2000 },
      ]);
    });

    await waitFor(() => {
      const updated = result.current.items.find((i) => i.id === second.id);
      expect(updated?.sortOrder).toBe(2000);
    });
  });

  it("archived item appears in archivedItems not in items", async () => {
    const { result } = renderHook(() => useItems());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    await act(async () => {
      await db.items.add({
        id: `itm${crypto.randomUUID()}`,
        url: "https://example.com",
        title: "Old done item",
        category: "article",
        tags: [],
        addedAt: eightDaysAgo,
        sortOrder: Date.now(),
        status: "done",
        doneAt: eightDaysAgo,
      });
    });

    await waitFor(() => expect(result.current.archivedItems).toHaveLength(1));
    expect(result.current.items).toHaveLength(0);
  });
});
