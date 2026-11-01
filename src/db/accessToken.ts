import { db } from "./index";

const EXPIRY_MARGIN_MS = 60_000;

/**
 * The current user's Dexie Cloud token. Tokens last about an hour and the addon
 * only refreshes them while syncing, so an idle tab needs a sync first.
 */
export async function getAccessToken(): Promise<string | undefined> {
  const { accessTokenExpiration } = db.cloud.currentUser.value;

  if (accessTokenExpiration && accessTokenExpiration.getTime() < Date.now() + EXPIRY_MARGIN_MS) {
    await db.cloud.sync({ wait: true, purpose: "push" }).catch(() => {});
  }

  return db.cloud.currentUser.value.accessToken;
}
