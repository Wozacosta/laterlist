/**
 * Mock data seed generator (LT-90)
 *
 * Generates realistic mock data for development, demos, and testing:
 * - Topics at various stages (active, completed, overdue, fresh)
 * - Subtasks: URL items (YouTube, articles) and manual entries
 * - Time logs spread over the last 30 days
 * - Markdown notes on topics and items
 * - Spaced repetition states (overdue, due soon, recently reviewed)
 * - Topic dependencies
 * - Learning streaks via daily time log distribution
 */

import {
  writeTopics,
  writeItems,
  writeTimeLogs,
} from "@/lib/server/store";
import type { Topic, Item, TimeLog } from "@/db";

const DAY_MS = 86_400_000;

// ── Seedable PRNG (mulberry32) ──────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = mulberry32(42);

function resetRng(seed: number = 42) {
  rand = mulberry32(seed);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function id(prefix: string, slug: string): string {
  return `${prefix}_seed_${slug}`;
}

// ── Topic Definitions ───────────────────────────────────────────────────────

interface TopicDef {
  slug: string;
  name: string;
  priority: number;
  status: "active" | "completed";
  estimatedSeconds?: number;
  timeSpent: number;
  lastActivityDaysAgo?: number;
  currentInterval: number;
  notes?: string;
  dependsOn?: string[];
  createdDaysAgo: number;
}

const TOPIC_DEFS: TopicDef[] = [
  {
    slug: "rust",
    name: "Rust Programming",
    priority: 4,
    status: "active",
    estimatedSeconds: 72000, // 20h
    timeSpent: 28800, // 8h done
    lastActivityDaysAgo: 2,
    currentInterval: 3,
    createdDaysAgo: 45,
    notes:
      "# Rust Learning Plan\n\n## Progress\n- [x] Ownership & borrowing basics\n- [x] Structs and enums\n- [ ] Error handling with Result/Option\n- [ ] Traits and generics\n- [ ] Async Rust\n\n## Key Insight\nOwnership is not just memory safety — it forces you to think about data flow.\n\n```rust\nfn main() {\n    let s = String::from(\"hello\");\n    takes_ownership(s);\n    // s is no longer valid here\n}\n```",
  },
  {
    slug: "sysdesign",
    name: "System Design",
    priority: 5,
    status: "active",
    estimatedSeconds: 108000, // 30h
    timeSpent: 5400, // 1.5h done
    lastActivityDaysAgo: 8,
    currentInterval: 1,
    createdDaysAgo: 30,
    notes:
      "# System Design Interview Prep\n\nFocusing on distributed systems patterns.\n\n## Topics to Cover\n- Load balancing strategies\n- Database sharding\n- Message queues (Kafka, RabbitMQ)\n- CAP theorem trade-offs\n- Caching layers (Redis, CDN)",
  },
  {
    slug: "graphql",
    name: "GraphQL",
    priority: 3,
    status: "active",
    estimatedSeconds: 36000, // 10h
    timeSpent: 10800, // 3h done
    lastActivityDaysAgo: 15,
    currentInterval: 1,
    createdDaysAgo: 60,
    notes: "Stalled on this — need to pick back up with schema design patterns.",
  },
  {
    slug: "ml",
    name: "Machine Learning Basics",
    priority: 2,
    status: "active",
    estimatedSeconds: 54000, // 15h
    timeSpent: 1800, // 30min done
    lastActivityDaysAgo: 20,
    currentInterval: 1,
    createdDaysAgo: 25,
  },
  {
    slug: "k8s",
    name: "Kubernetes",
    priority: 4,
    status: "completed",
    timeSpent: 43200, // 12h
    lastActivityDaysAgo: 10,
    currentInterval: 7,
    createdDaysAgo: 90,
    notes:
      "# Kubernetes — Complete\n\nFinished the core curriculum. Key areas:\n- Pod lifecycle, deployments, services\n- ConfigMaps and Secrets\n- Helm charts\n- Horizontal pod autoscaler\n\nNext: look into service mesh (Istio) when ready.",
  },
  {
    slug: "react-perf",
    name: "React Performance",
    priority: 3,
    status: "active",
    estimatedSeconds: 18000, // 5h
    timeSpent: 3600, // 1h done
    lastActivityDaysAgo: 5,
    currentInterval: 2,
    createdDaysAgo: 20,
    dependsOn: ["top_seed_sysdesign"],
    notes: "Depends on understanding system design for full-stack perf.",
  },
  {
    slug: "ts-advanced",
    name: "TypeScript Advanced Types",
    priority: 1,
    status: "active",
    timeSpent: 7200, // 2h done
    lastActivityDaysAgo: 3,
    currentInterval: 5,
    createdDaysAgo: 35,
    notes:
      "## Mapped Types\n```typescript\ntype Readonly<T> = { readonly [P in keyof T]: T[P] };\n```\n\n## Conditional Types\n```typescript\ntype IsString<T> = T extends string ? true : false;\n```",
  },
  {
    slug: "dsa",
    name: "Data Structures & Algorithms",
    priority: 5,
    status: "active",
    estimatedSeconds: 90000, // 25h
    timeSpent: 18000, // 5h done
    lastActivityDaysAgo: 1,
    currentInterval: 1,
    createdDaysAgo: 40,
    notes:
      "# DSA Prep\n\n## Completed\n- Arrays & strings\n- Hash maps\n- Two pointers\n\n## In Progress\n- Trees & graphs (BFS/DFS)\n\n## TODO\n- Dynamic programming\n- Greedy algorithms\n- Backtracking",
  },
];

// ── Item Definitions ────────────────────────────────────────────────────────

interface ItemDef {
  slug: string;
  topicSlug: string;
  title: string;
  url: string;
  category: "video" | "article" | "paper" | "repo" | "podcast" | "doc" | "other";
  tags: string[];
  duration: number; // seconds
  status: "unread" | "done";
  doneDaysAgo?: number;
  notes?: string;
}

const ITEM_DEFS: ItemDef[] = [
  // ── Rust ──
  {
    slug: "rust-100s",
    topicSlug: "rust",
    title: "Rust in 100 Seconds",
    url: "https://www.youtube.com/watch?v=5C_HPTJg5ek",
    category: "video",
    tags: ["rust", "intro"],
    duration: 160,
    status: "done",
    doneDaysAgo: 40,
  },
  {
    slug: "rust-ownership",
    topicSlug: "rust",
    title: "Understanding Ownership - The Rust Book Ch 4",
    url: "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html",
    category: "doc",
    tags: ["rust", "ownership"],
    duration: 3600,
    status: "done",
    doneDaysAgo: 30,
    notes: "Key concept: each value has exactly one owner. When the owner goes out of scope, the value is dropped.",
  },
  {
    slug: "rust-error",
    topicSlug: "rust",
    title: "Error Handling in Rust - YouTube",
    url: "https://www.youtube.com/watch?v=wM6o70NAWUI",
    category: "video",
    tags: ["rust", "error-handling"],
    duration: 2700,
    status: "unread",
  },
  {
    slug: "rust-async",
    topicSlug: "rust",
    title: "Async Rust from scratch",
    url: "",
    category: "other",
    tags: ["rust", "async"],
    duration: 7200,
    status: "unread",
  },
  {
    slug: "rust-traits",
    topicSlug: "rust",
    title: "Traits and Generics - Rust by Example",
    url: "https://doc.rust-lang.org/rust-by-example/generics.html",
    category: "doc",
    tags: ["rust", "generics", "traits"],
    duration: 2400,
    status: "done",
    doneDaysAgo: 15,
    notes: "Trait bounds are like interfaces but more powerful. `impl Trait` syntax is cleaner than `<T: Trait>`.",
  },

  // ── System Design ──
  {
    slug: "sd-primer",
    topicSlug: "sysdesign",
    title: "System Design Primer - GitHub",
    url: "https://github.com/donnemartin/system-design-primer",
    category: "repo",
    tags: ["system-design", "interview"],
    duration: 14400,
    status: "unread",
  },
  {
    slug: "sd-lb",
    topicSlug: "sysdesign",
    title: "Load Balancing Explained",
    url: "https://www.youtube.com/watch?v=K0Ta65OqQkY",
    category: "video",
    tags: ["system-design", "load-balancing"],
    duration: 1200,
    status: "done",
    doneDaysAgo: 25,
  },
  {
    slug: "sd-cap",
    topicSlug: "sysdesign",
    title: "CAP Theorem - Martin Kleppmann",
    url: "https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html",
    category: "article",
    tags: ["system-design", "cap-theorem"],
    duration: 1800,
    status: "unread",
  },
  {
    slug: "sd-kafka",
    topicSlug: "sysdesign",
    title: "Kafka in 6 minutes",
    url: "https://www.youtube.com/watch?v=Ch5VhJzaoaI",
    category: "video",
    tags: ["system-design", "kafka"],
    duration: 360,
    status: "unread",
  },

  // ── GraphQL ──
  {
    slug: "gql-intro",
    topicSlug: "graphql",
    title: "GraphQL Crash Course - Traversy",
    url: "https://www.youtube.com/watch?v=BcLNfwF04Kw",
    category: "video",
    tags: ["graphql", "tutorial"],
    duration: 3600,
    status: "done",
    doneDaysAgo: 50,
  },
  {
    slug: "gql-schema",
    topicSlug: "graphql",
    title: "Schema Design Best Practices",
    url: "https://www.apollographql.com/blog/graphql/basics/graphql-best-practices/",
    category: "article",
    tags: ["graphql", "schema"],
    duration: 1200,
    status: "done",
    doneDaysAgo: 45,
    notes: "Nullable by default is a footgun. Always use `!` for required fields.",
  },
  {
    slug: "gql-federation",
    topicSlug: "graphql",
    title: "Apollo Federation - microservices with GraphQL",
    url: "",
    category: "other",
    tags: ["graphql", "federation"],
    duration: 5400,
    status: "unread",
  },

  // ── ML ──
  {
    slug: "ml-3b1b",
    topicSlug: "ml",
    title: "3Blue1Brown Neural Networks Series",
    url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi",
    category: "video",
    tags: ["ml", "neural-networks"],
    duration: 4800,
    status: "unread",
  },
  {
    slug: "ml-intro",
    topicSlug: "ml",
    title: "Introduction to Machine Learning - Coursera",
    url: "https://www.coursera.org/learn/machine-learning",
    category: "doc",
    tags: ["ml", "coursera"],
    duration: 36000,
    status: "unread",
  },
  {
    slug: "ml-linear",
    topicSlug: "ml",
    title: "Linear Regression from Scratch in Python",
    url: "",
    category: "other",
    tags: ["ml", "python", "regression"],
    duration: 5400,
    status: "done",
    doneDaysAgo: 22,
    notes: "Built it with numpy only. MSE loss, gradient descent. Simple but foundational.",
  },

  // ── Kubernetes (completed) ──
  {
    slug: "k8s-intro",
    topicSlug: "k8s",
    title: "Kubernetes Tutorial for Beginners",
    url: "https://www.youtube.com/watch?v=X48VuDVv0do",
    category: "video",
    tags: ["kubernetes", "devops"],
    duration: 14400,
    status: "done",
    doneDaysAgo: 60,
  },
  {
    slug: "k8s-helm",
    topicSlug: "k8s",
    title: "Helm Charts Explained",
    url: "https://www.youtube.com/watch?v=Zzwq9FmZdsU",
    category: "video",
    tags: ["kubernetes", "helm"],
    duration: 1800,
    status: "done",
    doneDaysAgo: 30,
  },
  {
    slug: "k8s-hpa",
    topicSlug: "k8s",
    title: "Horizontal Pod Autoscaler deep dive",
    url: "",
    category: "article",
    tags: ["kubernetes", "scaling"],
    duration: 2400,
    status: "done",
    doneDaysAgo: 15,
  },

  // ── React Performance ──
  {
    slug: "rp-memo",
    topicSlug: "react-perf",
    title: "React.memo, useMemo, useCallback explained",
    url: "https://www.youtube.com/watch?v=DEPwA3mv_R8",
    category: "video",
    tags: ["react", "performance"],
    duration: 1200,
    status: "done",
    doneDaysAgo: 10,
    notes: "React.memo for components, useMemo for expensive computations, useCallback for stable references.",
  },
  {
    slug: "rp-virtual",
    topicSlug: "react-perf",
    title: "Virtualizing Long Lists with react-window",
    url: "https://web.dev/virtualize-long-lists-react-window/",
    category: "article",
    tags: ["react", "virtualization"],
    duration: 1800,
    status: "unread",
  },
  {
    slug: "rp-profiler",
    topicSlug: "react-perf",
    title: "React Profiler & DevTools walkthrough",
    url: "",
    category: "other",
    tags: ["react", "devtools"],
    duration: 2700,
    status: "unread",
  },

  // ── TypeScript Advanced ──
  {
    slug: "ts-mapped",
    topicSlug: "ts-advanced",
    title: "Mapped Types in TypeScript",
    url: "https://www.typescriptlang.org/docs/handbook/2/mapped-types.html",
    category: "doc",
    tags: ["typescript", "types"],
    duration: 1800,
    status: "done",
    doneDaysAgo: 8,
  },
  {
    slug: "ts-conditional",
    topicSlug: "ts-advanced",
    title: "Conditional Types & Template Literals",
    url: "https://www.youtube.com/watch?v=SbVgPQDealg",
    category: "video",
    tags: ["typescript", "advanced"],
    duration: 2400,
    status: "done",
    doneDaysAgo: 5,
  },
  {
    slug: "ts-type-challenges",
    topicSlug: "ts-advanced",
    title: "Type Challenges - GitHub",
    url: "https://github.com/type-challenges/type-challenges",
    category: "repo",
    tags: ["typescript", "practice"],
    duration: 10800,
    status: "unread",
  },

  // ── DSA ──
  {
    slug: "dsa-neetcode",
    topicSlug: "dsa",
    title: "NeetCode 150 Roadmap",
    url: "https://neetcode.io/roadmap",
    category: "doc",
    tags: ["dsa", "leetcode"],
    duration: 36000,
    status: "unread",
  },
  {
    slug: "dsa-trees",
    topicSlug: "dsa",
    title: "Binary Trees & BST - Algorithms Course",
    url: "https://www.youtube.com/watch?v=fAAZixBzIAI",
    category: "video",
    tags: ["dsa", "trees"],
    duration: 5400,
    status: "done",
    doneDaysAgo: 3,
    notes: "BFS uses a queue, DFS uses a stack (or recursion). For BST: in-order gives sorted output.",
  },
  {
    slug: "dsa-graphs",
    topicSlug: "dsa",
    title: "Graph Algorithms - BFS, DFS, Dijkstra",
    url: "https://www.youtube.com/watch?v=tWVWeAqZ0WU",
    category: "video",
    tags: ["dsa", "graphs"],
    duration: 7200,
    status: "unread",
  },
  {
    slug: "dsa-dp",
    topicSlug: "dsa",
    title: "Dynamic Programming Patterns",
    url: "",
    category: "other",
    tags: ["dsa", "dp"],
    duration: 10800,
    status: "unread",
  },
  {
    slug: "dsa-two-pointers",
    topicSlug: "dsa",
    title: "Two Pointers Technique - 10 problems",
    url: "",
    category: "other",
    tags: ["dsa", "two-pointers"],
    duration: 5400,
    status: "done",
    doneDaysAgo: 7,
  },

  // ── Standalone items (no topic) ──
  {
    slug: "standalone-1",
    topicSlug: "",
    title: "How to Read a Paper - S. Keshav",
    url: "https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf",
    category: "paper",
    tags: ["meta-learning", "reading"],
    duration: 900,
    status: "unread",
  },
  {
    slug: "standalone-2",
    topicSlug: "",
    title: "The Pragmatic Programmer podcast episode",
    url: "https://www.codingblocks.net/podcast/the-pragmatic-programmer-how-to-build-pragmatic-teams/",
    category: "podcast",
    tags: ["career", "programming"],
    duration: 3600,
    status: "done",
    doneDaysAgo: 12,
  },
];

// ── Time Log Generation ─────────────────────────────────────────────────────

function generateTimeLogs(topics: Topic[], items: Item[]): TimeLog[] {
  const logs: TimeLog[] = [];
  let logIdx = 0;

  // Auto-logged from completed items
  for (const item of items) {
    if (item.status === "done" && item.topicIds?.length && item.duration) {
      for (const topicId of item.topicIds) {
        logs.push({
          id: id("log", `auto_${logIdx++}`),
          topicId,
          seconds: item.duration,
          loggedAt: item.doneAt || daysAgo(5),
          source: "done",
        });
      }
    }
  }

  // Manual time logs — spread over 30 days for streak-like pattern
  const manualLogDefs: { topicSlug: string; daysAgo: number; minutes: number }[] = [
    // Rust — regular study
    { topicSlug: "rust", daysAgo: 28, minutes: 45 },
    { topicSlug: "rust", daysAgo: 25, minutes: 60 },
    { topicSlug: "rust", daysAgo: 22, minutes: 30 },
    { topicSlug: "rust", daysAgo: 18, minutes: 90 },
    { topicSlug: "rust", daysAgo: 14, minutes: 45 },
    { topicSlug: "rust", daysAgo: 10, minutes: 60 },
    { topicSlug: "rust", daysAgo: 5, minutes: 30 },
    { topicSlug: "rust", daysAgo: 2, minutes: 45 },
    // System Design — less frequent
    { topicSlug: "sysdesign", daysAgo: 20, minutes: 30 },
    { topicSlug: "sysdesign", daysAgo: 8, minutes: 60 },
    // DSA — daily grind
    { topicSlug: "dsa", daysAgo: 7, minutes: 60 },
    { topicSlug: "dsa", daysAgo: 6, minutes: 45 },
    { topicSlug: "dsa", daysAgo: 5, minutes: 30 },
    { topicSlug: "dsa", daysAgo: 4, minutes: 60 },
    { topicSlug: "dsa", daysAgo: 3, minutes: 90 },
    { topicSlug: "dsa", daysAgo: 2, minutes: 45 },
    { topicSlug: "dsa", daysAgo: 1, minutes: 60 },
    // TypeScript — casual
    { topicSlug: "ts-advanced", daysAgo: 12, minutes: 30 },
    { topicSlug: "ts-advanced", daysAgo: 8, minutes: 45 },
    { topicSlug: "ts-advanced", daysAgo: 3, minutes: 60 },
    // React Performance
    { topicSlug: "react-perf", daysAgo: 10, minutes: 30 },
    { topicSlug: "react-perf", daysAgo: 5, minutes: 30 },
    // ML — just started
    { topicSlug: "ml", daysAgo: 22, minutes: 30 },
    // K8s — historical
    { topicSlug: "k8s", daysAgo: 45, minutes: 120 },
    { topicSlug: "k8s", daysAgo: 35, minutes: 90 },
    { topicSlug: "k8s", daysAgo: 25, minutes: 60 },
    { topicSlug: "k8s", daysAgo: 15, minutes: 45 },
    { topicSlug: "k8s", daysAgo: 10, minutes: 30 },
  ];

  for (const def of manualLogDefs) {
    const topicId = id("top", def.topicSlug);
    logs.push({
      id: id("log", `manual_${logIdx++}`),
      topicId,
      seconds: def.minutes * 60,
      loggedAt: daysAgo(def.daysAgo),
      source: "manual",
    });
  }

  return logs;
}

// ── Main Seed Function ──────────────────────────────────────────────────────

export interface SeedResult {
  topics: number;
  items: number;
  timeLogs: number;
}

export function seedMockData(seed: number = 42): SeedResult {
  resetRng(seed);

  const now = Date.now();

  // Build topics
  const topics: Topic[] = TOPIC_DEFS.map((def, i) => ({
    id: id("top", def.slug),
    name: def.name,
    createdAt: daysAgo(def.createdDaysAgo),
    sortOrder: now - (TOPIC_DEFS.length - i) * 1000,
    status: def.status,
    completedAt: def.status === "completed" ? daysAgo(def.lastActivityDaysAgo ?? 10) : undefined,
    timeSpent: def.timeSpent,
    priority: def.priority,
    estimatedSeconds: def.estimatedSeconds,
    lastActivityDate: def.lastActivityDaysAgo !== undefined ? daysAgo(def.lastActivityDaysAgo) : undefined,
    currentInterval: def.currentInterval,
    notes: def.notes,
    dependsOn: def.dependsOn,
  }));

  // Build items
  const items: Item[] = ITEM_DEFS.map((def, i) => {
    const topicIds = def.topicSlug ? [id("top", def.topicSlug)] : undefined;
    return {
      id: id("itm", def.slug),
      title: def.title,
      url: def.url,
      category: def.category,
      tags: def.tags,
      duration: def.duration,
      addedAt: daysAgo(def.doneDaysAgo ? def.doneDaysAgo + Math.floor(rand() * 10) : Math.floor(rand() * 30)),
      sortOrder: now - (ITEM_DEFS.length - i) * 1000,
      status: def.status,
      doneAt: def.status === "done" && def.doneDaysAgo ? daysAgo(def.doneDaysAgo) : undefined,
      notes: def.notes,
      topicIds,
    };
  });

  // Build time logs
  const timeLogs = generateTimeLogs(topics, items);

  // Write all data
  writeTopics(topics);
  writeItems(items);
  writeTimeLogs(timeLogs);

  return {
    topics: topics.length,
    items: items.length,
    timeLogs: timeLogs.length,
  };
}

export function clearAllData(): void {
  writeTopics([]);
  writeItems([]);
  writeTimeLogs([]);
}
