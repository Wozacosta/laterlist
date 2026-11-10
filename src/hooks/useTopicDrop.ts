"use client";

import { useCallback, useEffect, useRef } from "react";

function topicAtPoint(x: number, y: number): HTMLElement | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const topic = element.closest<HTMLElement>("[data-topic-id]");
    if (topic) return topic;
  }
  return null;
}

/**
 * Item rows and the sidebar sit in separate drag contexts, so a dragged item
 * finds its topic from the pointer rather than through dnd-kit's droppables.
 */
export function useTopicDrop(onDrop: (itemId: string, topicId: string) => void) {
  const target = useRef<HTMLElement | null>(null);
  const stopTracking = useRef(() => {});

  const start = useCallback(() => {
    const mark = (next: HTMLElement | null) => {
      target.current?.removeAttribute("data-drop-target");
      next?.setAttribute("data-drop-target", "");
      target.current = next;
    };
    const move = (e: PointerEvent) => mark(topicAtPoint(e.clientX, e.clientY));

    window.addEventListener("pointermove", move, true);
    stopTracking.current = () => {
      window.removeEventListener("pointermove", move, true);
      mark(null);
    };
  }, []);

  const cancel = useCallback(() => stopTracking.current(), []);

  /** Returns whether the item landed on a topic. */
  const finish = useCallback(
    (itemId: string) => {
      const topicId = target.current?.dataset.topicId;
      stopTracking.current();
      if (topicId) onDrop(itemId, topicId);
      return topicId !== undefined;
    },
    [onDrop]
  );

  useEffect(() => cancel, [cancel]);

  return { start, cancel, finish };
}
