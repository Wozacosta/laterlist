"use client";

import { memo, useRef, useCallback, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { db, type Item } from "@/db";
import { useToast } from "@/components/Toast";

interface LaterlistBackup {
  version: number;
  exportedAt: string;
  items: Item[];
}

function isValidItem(x: unknown): boolean {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.url === "string" &&
    typeof o.title === "string" &&
    typeof o.category === "string" &&
    Array.isArray(o.tags) &&
    typeof o.addedAt === "string" &&
    typeof o.sortOrder === "number" &&
    (o.status === "unread" || o.status === "done")
  );
}

function isValidBackup(data: unknown): data is LaterlistBackup {
  if (typeof data !== "object" || data === null) return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.version === "number" &&
    Array.isArray(o.items) &&
    o.items.every(isValidItem)
  );
}

function downloadJson(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const btnBase =
  "rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors dark:border-gray-700";
const btnGray =
  btnBase + " bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800";
const btnRed =
  btnBase + " bg-white text-red-600 hover:bg-red-50 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950";
const btnBlue =
  "rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors";

export const DataManager = memo(function DataManager() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<LaterlistBackup | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const items = await db.items.toArray();
    const backup: LaterlistBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
    };
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(backup, `laterlist-backup-${date}.json`);
    toast(`Exported ${items.length} item${items.length !== 1 ? "s" : ""}`);
  }, [toast]);

  // ── Import: file picked ───────────────────────────────────────────────────
  const handleFilePick = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!isValidBackup(data)) {
          toast("Invalid backup file", "error");
          return;
        }
        setPendingBackup(data);
        setConfirmOpen(true);
      } catch {
        toast("Could not read file", "error");
      } finally {
        setImporting(false);
      }
    },
    [toast]
  );

  // ── Import: confirmed ─────────────────────────────────────────────────────
  const handleImportConfirm = useCallback(async () => {
    if (!pendingBackup) return;
    setConfirmOpen(false);
    try {
      await db.transaction("rw", db.items, async () => {
        await db.items.clear();
        await db.items.bulkAdd(pendingBackup.items);
      });
      toast(`Imported ${pendingBackup.items.length} item${pendingBackup.items.length !== 1 ? "s" : ""}`);
      setOpen(false);
    } catch {
      toast("Import failed", "error");
    } finally {
      setPendingBackup(null);
    }
  }, [pendingBackup, toast]);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className={btnGray} title="Export / Import data">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:border dark:border-gray-800"
            aria-describedby={undefined}
          >
            <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Export / Import
            </Dialog.Title>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Back up your list to a JSON file, or restore from a previous backup.
            </p>

            <div className="mt-5 flex flex-col gap-3">
              {/* Export */}
              <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Export</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Download all items as JSON</p>
                </div>
                <button type="button" onClick={handleExport} className={btnBlue}>
                  Download
                </button>
              </div>

              {/* Import */}
              <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Import</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Replace current data with backup</p>
                </div>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => fileInputRef.current?.click()}
                  className={btnRed}
                >
                  {importing ? "Reading…" : "Restore"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFilePick}
                />
              </div>
            </div>

            <Dialog.Close className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Confirm destructive import */}
      <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:border dark:border-gray-800">
            <AlertDialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Replace all data?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This will delete your current list and replace it with{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {pendingBackup?.items.length ?? 0} item{(pendingBackup?.items.length ?? 0) !== 1 ? "s" : ""}
              </span>{" "}
              from the backup. This cannot be undone.
            </AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel className={btnGray}>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={handleImportConfirm}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Yes, replace
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
});
