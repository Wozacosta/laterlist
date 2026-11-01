import { arrayMove } from "@dnd-kit/sortable";

type Sortable = { id: string; sortOrder: number };

/**
 * Moves one topic to another's place by swapping sort orders within the list, and
 * returns only the rows that changed, so a drag writes as little as possible.
 */
export function reorderTopics(topics: Sortable[], activeId: string, overId: string): Sortable[] {
  const from = topics.findIndex((topic) => topic.id === activeId);
  const to = topics.findIndex((topic) => topic.id === overId);
  if (from < 0 || to < 0 || from === to) return [];

  const slots = topics.map((topic) => topic.sortOrder).sort((a, b) => a - b);
  let slot = -Infinity;

  return arrayMove(topics, from, to).flatMap((topic, index) => {
    slot = Math.max(slots[index], slot + 1);
    return slot === topic.sortOrder ? [] : [{ id: topic.id, sortOrder: slot }];
  });
}
