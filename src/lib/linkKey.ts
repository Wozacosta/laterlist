const TRACKING_PARAMS = new Set(["fbclid", "gclid", "si", "s", "t", "r", "ref", "triedRedirect", "_src_ref"]);

/** Reduces a link to what identifies the page, so a repeat share is seen as a repeat. */
export function linkKey(url: string): string {
  if (!URL.canParse(url)) return url.trim().replace(/\/$/, "");

  const { hostname, pathname, searchParams } = new URL(url);
  const isYouTube = /(^|\.)(youtube\.com|youtu\.be)$/.test(hostname);
  const kept = [...searchParams]
    .filter(([name]) => !name.startsWith("utm_"))
    // On YouTube `t` is a timestamp and the video id is `v`, so only `si` is tracking there.
    .filter(([name]) => (isYouTube ? name === "v" : !TRACKING_PARAMS.has(name)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");

  return `${hostname.replace(/^www\./, "")}${pathname.replace(/\/$/, "")}${kept ? `?${kept}` : ""}`;
}
