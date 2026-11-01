// Common file names read like domains ("node.js", "notes.md"), so these never count as one.
const FILE_ENDINGS = /\.(js|jsx|ts|tsx|py|rs|md|sh|json|txt|html|css)$/i;

/** Returns true when pasted text is a link rather than a title. */
export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/\s/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (FILE_ENDINGS.test(trimmed)) return false;
  return /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#]|$)/i.test(trimmed);
}

export function toUrl(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
