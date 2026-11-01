// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import type { Item } from "@/db";
import { checkLink } from "@/lib/server/checkLink";
import { readRows, writeRows } from "@/lib/server/dexieCloud";

vi.mock("@/lib/server/dexieCloud", () => ({ readRows: vi.fn(), writeRows: vi.fn() }));
vi.mock("@/lib/server/checkLink", () => ({ checkLink: vi.fn() }));

function rpc(method: string, params: object = {}, token = "right-token") {
  return POST(
    new NextRequest("https://www.laterlist.cc/api/mcp", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    })
  );
}

async function callTool(name: string, args: object = {}) {
  const res = await rpc("tools/call", { name, arguments: args });
  const { result } = await res.json();
  return { isError: result.isError, text: result.content[0].text as string };
}

beforeEach(() => {
  vi.stubEnv("MCP_TOKEN", "right-token");
  vi.mocked(readRows).mockReset();
  vi.mocked(readRows).mockResolvedValue([]);
  vi.mocked(writeRows).mockReset();
  vi.mocked(checkLink).mockReset();
  vi.mocked(checkLink).mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/mcp", () => {
  it("refuses a wrong token before touching any data", async () => {
    const res = await rpc("tools/call", { name: "list_items", arguments: {} }, "wrong");

    expect(res.status).toBe(401);
    expect(readRows).not.toHaveBeenCalled();
  });

  it("completes the MCP handshake", async () => {
    const res = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    });

    expect(res.status).toBe(200);
    const { result } = await res.json();
    expect(result.serverInfo.name).toBe("laterlist");
    expect(res.headers.get("mcp-session-id")).toBeNull();
  });

  it("lists its tools", async () => {
    const { result } = await (await rpc("tools/list")).json();

    expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "list_topics",
      "list_items",
      "add_item",
      "update_items",
      "reorder_items",
    ]);
  });

  it("lists items top first and applies filters", async () => {
    vi.mocked(readRows).mockResolvedValueOnce([
      { id: "low", title: "Low", status: "unread", sortOrder: 1, topicIds: ["t1"] },
      { id: "high", title: "High", status: "unread", sortOrder: 2, topicIds: ["t1"] },
      { id: "done", title: "Done", status: "done", sortOrder: 3, topicIds: ["t1"] },
      { id: "other", title: "Other", status: "unread", sortOrder: 4, topicIds: ["t2"] },
    ]);

    const { text } = await callTool("list_items", { status: "unread", topicId: "t1" });

    expect(JSON.parse(text).map((item: { id: string }) => item.id)).toEqual(["high", "low"]);
  });

  it("adds a full item", async () => {
    const { text } = await callTool("add_item", {
      title: "  A title  ",
      url: "https://example.com/a",
      topicIds: ["t1"],
    });

    expect(writeRows).toHaveBeenCalledTimes(1);
    const [table, rows] = vi.mocked(writeRows).mock.calls[0];
    expect(table).toBe("items");
    expect(rows[0]).toMatchObject({
      id: JSON.parse(text).id,
      title: "A title",
      url: "https://example.com/a",
      category: "other",
      tags: [],
      status: "unread",
      topicIds: ["t1"],
    });
  });

  it("adds new items behind everything else, so Next stays put", async () => {
    vi.mocked(readRows).mockResolvedValueOnce([{ sortOrder: 5 }, { sortOrder: 2 }]);

    await callTool("add_item", { title: "New" });

    expect(vi.mocked(writeRows).mock.calls[0][1][0]).toMatchObject({ sortOrder: 1 });
  });

  it("refuses a dead link", async () => {
    vi.mocked(checkLink).mockResolvedValueOnce("it returned 404");

    const { isError, text } = await callTool("add_item", {
      title: "x",
      url: "https://example.com/gone",
    });

    expect(isError).toBe(true);
    expect(text).toContain("it returned 404");
    expect(writeRows).not.toHaveBeenCalled();
  });

  it("changes only the fields sent and keeps the rest of the row", async () => {
    vi.mocked(readRows).mockResolvedValueOnce([
      { id: "a", title: "A", notes: "mine", realmId: "me", owner: "me", status: "unread" },
    ]);

    const { text } = await callTool("update_items", {
      updates: [
        { id: "a", summary: "Short", topicIds: ["t1"] },
        { id: "gone", summary: "x" },
      ],
    });

    expect(JSON.parse(text)).toEqual({ updated: 1, missing: ["gone"] });
    expect(vi.mocked(writeRows).mock.calls[0][1]).toEqual([
      {
        id: "a",
        title: "A",
        notes: "mine",
        realmId: "me",
        owner: "me",
        status: "unread",
        summary: "Short",
        topicIds: ["t1"],
      },
    ]);
  });

  it("marks items done and back", async () => {
    vi.mocked(readRows).mockResolvedValueOnce([
      { id: "a", status: "unread" },
      { id: "b", status: "done", doneAt: "2026-01-01" },
    ]);

    await callTool("update_items", {
      updates: [
        { id: "a", status: "done" },
        { id: "b", status: "unread" },
      ],
    });

    const [done, unread] = vi.mocked(writeRows).mock.calls[0][1] as Partial<Item>[];
    expect(done.status).toBe("done");
    expect(done.doneAt).toBeDefined();
    expect(unread).toEqual({ id: "b", status: "unread" });
  });

  it("writes nothing when no item matches", async () => {
    await callTool("update_items", { updates: [{ id: "gone", summary: "x" }] });

    expect(writeRows).not.toHaveBeenCalled();
  });

  it("reorders within the slots those items hold and returns the old order", async () => {
    vi.mocked(readRows).mockResolvedValueOnce([
      { id: "a", sortOrder: 30 },
      { id: "other", sortOrder: 20 },
      { id: "b", sortOrder: 10 },
    ]);

    const { text } = await callTool("reorder_items", { ids: ["b", "a"] });

    expect(JSON.parse(text)).toEqual({ previous: ["a", "b"] });
    expect(vi.mocked(writeRows).mock.calls[0][1]).toEqual([
      { id: "b", sortOrder: 30 },
      { id: "a", sortOrder: 10 },
    ]);
  });

  it("keeps a clear order when items share a sort order", async () => {
    vi.mocked(readRows).mockResolvedValueOnce([
      { id: "a", sortOrder: 5 },
      { id: "b", sortOrder: 5 },
    ]);

    await callTool("reorder_items", { ids: ["b", "a"] });

    const [first, second] = vi.mocked(writeRows).mock.calls[0][1] as Item[];
    expect(first.id).toBe("b");
    expect(first.sortOrder).toBeGreaterThan(second.sortOrder);
  });

  it("changes nothing when a reorder has an unknown or repeated id", async () => {
    vi.mocked(readRows).mockResolvedValue([{ id: "a", sortOrder: 1 }]);

    expect((await callTool("reorder_items", { ids: ["a", "gone"] })).isError).toBe(true);
    expect((await callTool("reorder_items", { ids: ["a", "a"] })).isError).toBe(true);
    expect(writeRows).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty title", { title: "   " }],
    ["a javascript: link", { title: "x", url: "javascript:alert(1)" }],
    ["an unknown category", { title: "x", category: "nope" }],
  ])("refuses %s", async (_label, args) => {
    const { isError } = await callTool("add_item", args);

    expect(isError).toBe(true);
    expect(writeRows).not.toHaveBeenCalled();
  });

  it("reports a failed write as a tool error", async () => {
    vi.mocked(writeRows).mockRejectedValueOnce(new Error("Dexie Cloud write failed: 500"));

    const { isError, text } = await callTool("add_item", { title: "x" });

    expect(isError).toBe(true);
    expect(text).toContain("Dexie Cloud write failed: 500");
  });
});
