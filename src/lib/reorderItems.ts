import { arrayMove } from "@dnd-kit/sortable";

type Sortable = { id: string; sortOrder: number };

/**
 * Moves one item to another's place by reusing the sort orders of the rows in view.
 * The same field orders topic queues, so a filtered drag must leave every other row
 * alone. Returns only the rows that changed.
 */
export function reorderItems(items: Sortable[], activeId: string, overId: string): Sortable[] {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return [];

  const slots = items.map((item) => item.sortOrder).sort((a, b) => b - a);
  let slot = Infinity;

  return arrayMove(items, from, to).flatMap((item, index) => {
    slot = Math.min(slots[index], slot - 1);
    return slot === item.sortOrder ? [] : [{ id: item.id, sortOrder: slot }];
  });
}
