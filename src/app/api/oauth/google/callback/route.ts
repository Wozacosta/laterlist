import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode } from "@/lib/server/calendarOAuth";

/**
 * GET /api/oauth/google/callback — Google OAuth redirect handler
 *
 * Google redirects here after the user consents. Exchanges the auth code
 * for tokens and redirects back to the app.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const appBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    // User denied access or other error
    return NextResponse.redirect(
      `${appBase}?calendar_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appBase}?calendar_error=${encodeURIComponent("No authorization code received")}`
    );
  }

  try {
    const tokens = await exchangeCode(code);
    const email = tokens.email ? `&calendar_email=${encodeURIComponent(tokens.email)}` : "";
    return NextResponse.redirect(`${appBase}?calendar_connected=true${email}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    return NextResponse.redirect(
      `${appBase}?calendar_error=${encodeURIComponent(message)}`
    );
  }
}
