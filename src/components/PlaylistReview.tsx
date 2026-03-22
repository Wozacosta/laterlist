"use client";

import { memo, useState, useCallback } from "react";
import type { PlaylistVideo } from "@/app/api/playlist/route";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

interface PlaylistReviewProps {
  title: string;
  videos: PlaylistVideo[];
  onConfirm: (selectedVideos: PlaylistVideo[]) => void;
  onCancel: () => void;
}

export const PlaylistReview = memo(function PlaylistReview({
  title,
  videos,
  onConfirm,
  onCancel,
}: PlaylistReviewProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(videos.map((v) => v.videoId))
  );

  const toggleVideo = useCallback((videoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === videos.length) {
        return new Set<string>();
      }
      return new Set(videos.map((v) => v.videoId));
    });
  }, [videos]);

  const handleConfirm = useCallback(() => {
    const selectedVideos = videos.filter((v) => selected.has(v.videoId));
    onConfirm(selectedVideos);
  }, [videos, selected, onConfirm]);

  const totalDuration = videos
    .filter((v) => selected.has(v.videoId))
    .reduce((sum, v) => sum + (v.duration ?? 0), 0);

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {selected.size} of {videos.length} selected
            {totalDuration > 0 && ` · ${formatTime(totalDuration)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>

      {/* Select all toggle */}
      <button
        type="button"
        onClick={toggleAll}
        className="mb-2 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {selected.size === videos.length ? "Deselect all" : "Select all"}
      </button>

      {/* Video list with checkboxes */}
      <div className="max-h-80 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {videos.map((video) => (
            <label
              key={video.videoId}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <input
                type="checkbox"
                checked={selected.has(video.videoId)}
                onChange={() => toggleVideo(video.videoId)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-200">
                {video.title}
              </span>
              {video.duration != null && video.duration > 0 && (
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {formatTime(video.duration)}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Confirm button */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selected.size === 0}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Import {selected.size} video{selected.size !== 1 ? "s" : ""}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
});
