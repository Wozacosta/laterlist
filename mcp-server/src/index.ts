#!/usr/bin/env node

/**
 * Laterlist MCP Server
 *
 * A Model Context Protocol server that exposes the Laterlist learning
 * tracker API as tools for AI assistants.
 *
 * Usage:
 *   npx laterlist-mcp
 *   LATERLIST_URL=http://localhost:3000 LATERLIST_API_KEY=ll_xxx npx laterlist-mcp
 *
 * Environment variables:
 *   LATERLIST_URL     — Base URL of the laterlist app (default: http://localhost:3000)
 *   LATERLIST_API_KEY — API key for authentication (optional if no keys configured)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LaterlistClient } from "./api-client.js";

const BASE_URL = process.env.LATERLIST_URL || "http://localhost:3000";
const API_KEY = process.env.LATERLIST_API_KEY;

const client = new LaterlistClient(BASE_URL, API_KEY);

const server = new McpServer({
  name: "laterlist",
  version: "0.1.0",
});

// ── Tool: create_topic ──────────────────────────────────────────────────

server.tool(
  "create_topic",
  "Create a new learning topic",
  {
    name: z.string().describe("Topic name"),
    priority: z.number().min(1).max(5).optional().describe("Priority 1-5 (default 3)"),
    estimatedSeconds: z.number().optional().describe("Total time budget in seconds"),
  },
  async ({ name, priority, estimatedSeconds }) => {
    const res = await client.createTopic(name, priority, estimatedSeconds);
    return {
      content: [
        {
          type: "text" as const,
          text: res.ok
            ? JSON.stringify(res.data, null, 2)
            : `Error ${res.status}: ${JSON.stringify(res.data)}`,
        },
      ],
    };
  }
);

// ── Tool: list_topics ───────────────────────────────────────────────────

server.tool(
  "list_topics",
  "List all learning topics with their status, priority, and time tracking info",
  {
    status: z
      .enum(["active", "completed"])
      .optional()
      .describe("Filter by status"),
  },
  async ({ status }) => {
    const res = await client.listTopics(status);
    return {
      content: [
        {
          type: "text" as const,
          text: res.ok
            ? JSON.stringify(res.data, null, 2)
            : `Error ${res.status}: ${JSON.stringify(res.data)}`,
        },
      ],
    };
  }
);

// ── Tool: get_study_queue ───────────────────────────────────────────────

server.tool(
  "get_study_queue",
  "Get the ranked study queue — topics sorted by spaced-repetition urgency",
  {},
  async () => {
    const res = await client.getStudyQueue();
    return {
      content: [
        {
          type: "text" as const,
          text: res.ok
            ? JSON.stringify(res.data, null, 2)
            : `Error ${res.status}: ${JSON.stringify(res.data)}`,
        },
      ],
    };
  }
);

// ── Tool: add_subtask ───────────────────────────────────────────────────

server.tool(
  "add_subtask",
  "Add a subtask (item) to a learning topic",
  {
    topicId: z.string().describe("Topic ID"),
    title: z.string().describe("Item title"),
    url: z.string().optional().describe("URL (video, article, etc.)"),
    category: z
      .enum(["video", "article", "paper", "repo", "podcast", "doc", "other"])
      .optional()
      .describe("Content category"),
    duration: z.number().optional().describe("Duration in seconds"),
  },
  async ({ topicId, title, url, category, duration }) => {
    const res = await client.createSubtask(topicId, title, { url, category, duration });
    return {
      content: [
        {
          type: "text" as const,
          text: res.ok
            ? JSON.stringify(res.data, null, 2)
            : `Error ${res.status}: ${JSON.stringify(res.data)}`,
        },
      ],
    };
  }
);

// ── Tool: complete_subtask ──────────────────────────────────────────────

server.tool(
  "complete_subtask",
  "Mark a subtask (item) as done",
  {
    itemId: z.string().describe("Item ID to mark as done"),
  },
  async ({ itemId }) => {
    const res = await client.markItem(itemId, "done");
    return {
      content: [
        {
          type: "text" as const,
          text: res.ok
            ? JSON.stringify(res.data, null, 2)
            : `Error ${res.status}: ${JSON.stringify(res.data)}`,
        },
      ],
    };
  }
);

// ── Tool: log_time ──────────────────────────────────────────────────────

server.tool(
  "log_time",
  "Log study time to a topic (also resets the spaced-repetition clock)",
  {
    topicId: z.string().describe("Topic ID"),
    seconds: z.number().min(1).describe("Seconds to log"),
  },
  async ({ topicId, seconds }) => {
    const res = await client.logTime(topicId, seconds);
    return {
      content: [
        {
          type: "text" as const,
          text: res.ok
            ? JSON.stringify(res.data, null, 2)
            : `Error ${res.status}: ${JSON.stringify(res.data)}`,
        },
      ],
    };
  }
);

// ── Tool: add_note ──────────────────────────────────────────────────────

server.tool(
  "add_note",
  "Add or update markdown notes on a topic",
  {
    topicId: z.string().describe("Topic ID"),
    notes: z.string().describe("Markdown content for notes"),
  },
  async ({ topicId, notes }) => {
    const res = await client.setTopicNotes(topicId, notes);
    return {
      content: [
        {
          type: "text" as const,
          text: res.ok
            ? JSON.stringify(res.data, null, 2)
            : `Error ${res.status}: ${JSON.stringify(res.data)}`,
        },
      ],
    };
  }
);

// ── Tool: mark_studied ──────────────────────────────────────────────────

server.tool(
  "mark_studied",
  "Mark a topic as studied — resets the spaced-repetition clock without logging time",
  {
    topicId: z.string().describe("Topic ID"),
  },
  async ({ topicId }) => {
    const res = await client.markStudied(topicId);
    return {
      content: [
        {
          type: "text" as const,
          text: res.ok
            ? JSON.stringify(res.data, null, 2)
            : `Error ${res.status}: ${JSON.stringify(res.data)}`,
        },
      ],
    };
  }
);

// ── Tool: get_topic_detail ──────────────────────────────────────────────

server.tool(
  "get_topic_detail",
  "Get full topic details including subtasks, notes, and recent time logs",
  {
    topicId: z.string().describe("Topic ID"),
  },
  async ({ topicId }) => {
    const [topicRes, subtasksRes, notesRes, logsRes] = await Promise.all([
      client.getTopic(topicId),
      client.listSubtasks(topicId),
      client.getTopicNotes(topicId),
      client.getTimeLogs(topicId, 10),
    ]);

    if (!topicRes.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error ${topicRes.status}: ${JSON.stringify(topicRes.data)}`,
          },
        ],
      };
    }

    const detail = {
      topic: topicRes.data,
      subtasks: subtasksRes.ok ? subtasksRes.data : [],
      notes: notesRes.ok ? notesRes.data : null,
      recentTimeLogs: logsRes.ok ? logsRes.data : [],
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(detail, null, 2),
        },
      ],
    };
  }
);

// ── Resource: laterlist://study-queue ────────────────────────────────────

server.resource(
  "study-queue",
  "laterlist://study-queue",
  async () => {
    const res = await client.getStudyQueue();
    return {
      contents: [
        {
          uri: "laterlist://study-queue",
          mimeType: "application/json",
          text: JSON.stringify(res.data, null, 2),
        },
      ],
    };
  }
);

// ── Start server ────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Laterlist MCP server running (${BASE_URL})`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
