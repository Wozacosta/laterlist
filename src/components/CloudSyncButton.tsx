"use client";

import { memo, useCallback, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useObservable } from "dexie-react-hooks";
import { db } from "@/db";

function getSyncLabel(
  status: string,
  phase: string,
): { text: string; dotClass: string } {
  if (status === "error" || phase === "error")
    return { text: "Error", dotClass: "bg-red-500" };
  if (status === "offline" || phase === "offline" || status === "disconnected")
    return { text: "Offline", dotClass: "bg-yellow-400" };
  if (status === "connecting")
    return { text: "Connecting", dotClass: "bg-yellow-400" };
  if (phase === "pushing" || phase === "pulling" || phase === "not-in-sync")
    return { text: "Syncing", dotClass: "bg-blue-500" };
  if (phase === "in-sync")
    return { text: "Synced", dotClass: "bg-green-500" };
  return { text: "", dotClass: "" };
}

const btnClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800";

export const CloudSyncButton = memo(function CloudSyncButton() {
  const currentUser = useObservable(db.cloud.currentUser);
  const syncState = useObservable(db.cloud.syncState);

  const isLoggedIn = currentUser?.isLoggedIn ?? false;
  const displayName = currentUser?.email ?? currentUser?.name;
  const { text: syncText, dotClass } = getSyncLabel(
    syncState?.status ?? "not-started",
    syncState?.phase ?? "initial",
  );
  const syncError = syncState?.error?.message;

  const [loggingIn, setLoggingIn] = useState(false);
  const [open, setOpen] = useState(false);

  const handleLogin = useCallback(
    (provider?: "google") => {
      if (loggingIn) return;
      setLoggingIn(true);
      const opts = provider ? { provider } : undefined;
      (opts ? db.cloud.login(opts) : db.cloud.login())
        .catch(console.error)
        .finally(() => setLoggingIn(false));
    },
    [loggingIn],
  );

  const handleLoginAndClose = useCallback(
    (provider?: "google") => {
      handleLogin(provider);
      setOpen(false);
    },
    [handleLogin],
  );

  if (!isLoggedIn) {
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className={btnClass}>
            Sign in to sync
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:border dark:border-gray-800"
            aria-describedby={undefined}
          >
            <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Sign in to sync
            </Dialog.Title>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Back up your list and access it on any device.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={loggingIn}
                onClick={() => handleLoginAndClose()}
                className={btnClass}
              >
                Sign in with email
              </button>
              <button
                type="button"
                disabled={loggingIn}
                onClick={() => handleLoginAndClose("google")}
                className={btnClass}
              >
                Sign in with Google
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {syncText && (
        <span
          className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600"
          title={syncError ?? undefined}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
          {syncText}
        </span>
      )}
      <span className="text-sm text-gray-500 dark:text-gray-400">{displayName}</span>
      <button
        type="button"
        onClick={() => db.cloud.logout().catch(() => {})}
        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-400 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-600 dark:hover:bg-gray-800"
      >
        Sign out
      </button>
    </div>
  );
});
