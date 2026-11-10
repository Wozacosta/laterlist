import { type NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { captureItem } from "@/lib/server/captureItem";
import { requireCaptureToken } from "@/lib/server/mcpAuth";

const MAX_URL_LENGTH = 2048;

/** POST /api/capture — saves a link from a phone shortcut. The token can only add. */
export async function POST(request: NextRequest) {
  const denied = requireCaptureToken(request);
  if (denied) return denied;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip).allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const url = body?.url;
  if (typeof url !== "string" || url.length > MAX_URL_LENGTH || !/^https?:\/\//i.test(url) || !URL.canParse(url)) {
    return Response.json({ error: "Send a link in `url`" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.slice(0, 300) : undefined;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 5000) : undefined;

  try {
    return Response.json(await captureItem({ url, title, notes }), { status: 201 });
  } catch {
    return Response.json({ error: "Couldn't save it" }, { status: 502 });
  }
}
