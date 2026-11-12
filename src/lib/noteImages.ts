import { db } from "@/db";

/** Longest side of a saved image, in pixels: enough to read a screenshot, small enough to sync. */
export const MAX_SIDE = 1600;

/** Scales width × height down to fit within max on both sides, never up. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** The image files among pasted, dropped or picked files. */
export function imageFiles(files: FileList | File[] | null | undefined): File[] {
  return Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
}

/** Shrinks an image file to a WebP data URL, or JPEG where the browser can't write WebP. */
export async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = canvas.toDataURL("image/webp", 0.8);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.8);
}

export async function addNoteImages(id: string, files: File[]): Promise<void> {
  if (files.length === 0) return;
  const urls = await Promise.all(files.map(shrinkImage));
  await db.transaction("rw", db.items, async () => {
    const item = await db.items.get(id);
    if (item) await db.items.update(id, { noteImages: [...(item.noteImages ?? []), ...urls] });
  });
}

export async function removeNoteImage(id: string, index: number): Promise<void> {
  await db.transaction("rw", db.items, async () => {
    const item = await db.items.get(id);
    if (item) await db.items.update(id, { noteImages: (item.noteImages ?? []).filter((_, i) => i !== index) });
  });
}
