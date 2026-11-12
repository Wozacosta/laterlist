"use client";

import { useEffect, useState } from "react";
import type { Item } from "@/db";
import { addNoteImages, imageFiles, removeNoteImage } from "@/lib/noteImages";

/** Lets a note's textarea take pasted and dropped images. Text pastes as usual. */
export function noteImageHandlers(itemId: string) {
  function take(e: React.ClipboardEvent | React.DragEvent, files: FileList | undefined) {
    const images = imageFiles(files);
    if (images.length === 0) return;
    e.preventDefault();
    void addNoteImages(itemId, images);
  }

  return {
    onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => take(e, e.clipboardData?.files),
    onDrop: (e: React.DragEvent<HTMLTextAreaElement>) => take(e, e.dataTransfer?.files),
  };
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a data URL from the note */}
      <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg" />
    </div>
  );
}

/** A note's images as thumbnails. Click one to see it full size; editable adds Add image and remove. */
export function NoteImages({ item, editable = false }: { item: Item; editable?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const images = item.noteImages ?? [];
  if (!editable && images.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {images.map((src, i) => (
        <div key={i} className="relative">
          <button
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open image ${i + 1} from the note on "${item.title}"`}
            className="block cursor-zoom-in overflow-hidden rounded border border-gray-200 dark:border-gray-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL from the note */}
            <img src={src} alt="" className="h-20 w-auto max-w-40 object-cover" />
          </button>
          {editable && (
            <button
              type="button"
              onClick={() => removeNoteImage(item.id, i)}
              aria-label={`Remove image ${i + 1}`}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gray-800 text-xs text-white opacity-80 hover:opacity-100 dark:bg-gray-200 dark:text-gray-900"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {editable && (
        <label className="cursor-pointer rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-within:ring-1 focus-within:ring-blue-500 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300">
          + Image
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-label={`Add an image to the note on "${item.title}"`}
            onChange={(e) => {
              void addNoteImages(item.id, imageFiles(e.target.files));
              e.target.value = "";
            }}
          />
        </label>
      )}
      {open !== null && images[open] && (
        <Lightbox src={images[open]} alt={`Image ${open + 1} from the note`} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
