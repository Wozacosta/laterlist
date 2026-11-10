import { safeFetch } from "@/app/api/enrich/safeFetch";

/**
 * Looks for a sign that a link is dead. A 200 isn't proof on its own: a dead page can
 * redirect to the home page. Other errors pass, because many sites refuse bots.
 *
 * @returns what's wrong with the link, or null if it looks alive.
 */
export async function checkLink(url: string): Promise<string | null> {
  try {
    const res = await safeFetch(url, { "User-Agent": "Mozilla/5.0 (compatible; laterlist)" });
    await res.body?.cancel();

    if (res.status === 404 || res.status === 410) return `it returned ${res.status}`;

    const from = new URL(url);
    const to = new URL(res.url || url);
    if (from.pathname !== "/" && to.pathname === "/") return "it redirects to the home page";
    return null;
  } catch {
    return "it couldn't be reached";
  }
}
