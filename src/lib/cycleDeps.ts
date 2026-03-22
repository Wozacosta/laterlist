import type { Topic } from "@/db";

/**
 * Detects whether setting `topicId.dependsOn = newDeps` would create a
 * circular dependency in the topic graph.
 *
 * Uses DFS from each new dependency, following the dependsOn edges, to
 * check if any path leads back to `topicId`.
 *
 * @returns The cycle path as topic IDs if a cycle is found, or null if safe.
 */
export function detectCycle(
  topicId: string,
  newDeps: string[],
  allTopics: Topic[]
): string[] | null {
  // Build adjacency map: topicId → dependsOn (prerequisites)
  const adjMap = new Map<string, string[]>();
  for (const t of allTopics) {
    // Use the proposed newDeps for the topic being updated
    adjMap.set(t.id, t.id === topicId ? newDeps : (t.dependsOn ?? []));
  }

  // DFS from topicId following dependsOn edges — if we reach topicId again, cycle exists
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(current: string): boolean {
    if (current === topicId && path.length > 0) {
      path.push(current);
      return true; // cycle found
    }
    if (visited.has(current)) return false;
    visited.add(current);
    path.push(current);

    const deps = adjMap.get(current) ?? [];
    for (const dep of deps) {
      if (dfs(dep)) return true;
    }

    path.pop();
    return false;
  }

  // Start DFS from the topic itself
  for (const dep of newDeps) {
    visited.clear();
    path.length = 0;
    path.push(topicId);
    if (dfs(dep)) {
      return path;
    }
  }

  return null;
}
