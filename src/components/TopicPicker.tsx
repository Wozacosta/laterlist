"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import type { Topic } from "@/db";

interface TopicPickerProps {
  topicIds: string[];
  topics: Topic[];
  onAssign: (topicId: string) => void;
  onUnassign: (topicId: string) => void;
}

export const TopicPicker = memo(function TopicPicker({
  topicIds,
  topics,
  onAssign,
  onUnassign,
}: TopicPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const assignedTopics = topics.filter((t) => topicIds.includes(t.id));
  const availableTopics = topics.filter((t) => !topicIds.includes(t.id) && t.status === "active");

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleAssign = useCallback(
    (topicId: string) => {
      onAssign(topicId);
      setOpen(false);
    },
    [onAssign]
  );

  return (
    <div ref={containerRef} className="relative flex flex-wrap items-center gap-1" data-no-expand="true">
      {/* Assigned topic chips */}
      {assignedTopics.map((topic) => (
        <span
          key={topic.id}
          className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        >
          {topic.name}
          <button
            type="button"
            onClick={() => onUnassign(topic.id)}
            className="ml-0.5 text-blue-400 hover:text-blue-700 leading-none dark:hover:text-blue-200"
            aria-label={`Remove topic ${topic.name}`}
          >
            ×
          </button>
        </span>
      ))}

      {/* Add topic button */}
      {availableTopics.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-dashed border-blue-300 px-2 py-0.5 text-xs text-blue-400 hover:border-blue-400 hover:text-blue-600 transition-colors dark:border-blue-700 dark:text-blue-500 dark:hover:border-blue-600 dark:hover:text-blue-400"
          aria-label="Add topic"
        >
          + topic
        </button>
      )}

      {/* Dropdown */}
      {open && availableTopics.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {availableTopics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => handleAssign(topic.id)}
              className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-950 dark:hover:text-blue-300"
            >
              {topic.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
