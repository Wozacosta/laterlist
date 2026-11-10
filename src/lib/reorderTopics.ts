import { arrayMove } from "@dnd-kit/sortable";

type Sortable = { id: string; sortOrder: number; focus?: boolean };
type TopicMove = { id: string; sortOrder: number; focus?: boolean };

/** Sits between Focus and Later in the drag list, and only ever gets dropped on. */
export const FOCUS_LINE = "focus-line";

/**
 * Moves one topic to another's place by swapping sort orders within the list, and
 * returns only the rows that changed, so a drag writes as little as possible.
 * Crossing the Focus line changes the dragged topic's `focus`.
 */
export function reorderTopics(topics: Sortable[], activeId: string, overId: string): TopicMove[] {
  const inFocus = topics.filter((topic) => topic.focus);
  const later = topics.filter((topic) => !topic.focus);
  const ids = [...inFocus, { id: FOCUS_LINE }, ...later].map((topic) => topic.id);
  const dragged = topics.find((topic) => topic.id === activeId);
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (!dragged || to < 0 || from === to) return [];

  const moved = arrayMove(ids, from, to);
  const focus = moved.indexOf(activeId) < moved.indexOf(FOCUS_LINE);
  const focusChange = focus === Boolean(dragged.focus) ? {} : { focus };

  const slots = topics.map((topic) => topic.sortOrder).sort((a, b) => a - b);
  let slot = -Infinity;

  return moved
    .filter((id) => id !== FOCUS_LINE)
    .flatMap((id, index) => {
      const topic = topics.find((row) => row.id === id)!;
      slot = Math.max(slots[index], slot + 1);
      const change = id === activeId ? focusChange : {};
      return slot === topic.sortOrder && !("focus" in change) ? [] : [{ id, sortOrder: slot, ...change }];
    });
}
