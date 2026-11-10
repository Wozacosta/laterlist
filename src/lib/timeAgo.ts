const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(time: number): number {
  return new Date(time).setHours(0, 0, 0, 0);
}

/** A short age in calendar days: "today", "yesterday", "3d ago", "2w ago", "4mo ago", "1y ago". */
export function timeAgo(iso: string, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso).getTime())) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
