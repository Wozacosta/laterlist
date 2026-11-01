import type { DragEvent } from "react";

const ITEM_TYPE = "application/x-laterlist-item";

/** Makes an element carry an item when dragged, so it can be dropped on a sidebar topic. */
export function itemDragProps(id: string) {
  return {
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.setData(ITEM_TYPE, id);
      event.dataTransfer.effectAllowed = "move";
    },
  };
}

export function isItemDrag(event: DragEvent): boolean {
  return event.dataTransfer.types.includes(ITEM_TYPE);
}

export function draggedItemId(event: DragEvent): string {
  return event.dataTransfer.getData(ITEM_TYPE);
}
