"use client";

import { memo, useState, useEffect, useCallback } from "react";

interface CalendarStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
  error?: string;
}

export const CalendarConnect = memo(function CalendarConnect() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/oauth/google");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, error: "Failed to check status" });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Check URL params for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "true") {
      fetchStatus();
      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("calendar_error")) {
      setStatus({
        connected: false,
        error: params.get("calendar_error") ?? "Unknown error",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchStatus]);

  const handleConnect = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oauth/google", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatus({ connected: false, error: data.error || "Failed to get auth URL" });
        setLoading(false);
      }
    } catch {
      setStatus({ connected: false, error: "Failed to start OAuth flow" });
      setLoading(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/oauth/google", { method: "DELETE" });
      setStatus({ connected: false });
    } catch {
      setStatus({ connected: false, error: "Failed to disconnect" });
    }
    setLoading(false);
  }, []);

  if (!status) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Calendar icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={status.connected ? "text-green-500" : "text-gray-400"}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Google Calendar
          </span>

          {status.connected && status.email && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {status.email}
            </span>
          )}
        </div>

        <div>
          {status.connected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
            >
              {loading ? "..." : "Disconnect"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={loading}
              className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900 transition-colors disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect"}
            </button>
          )}
        </div>
      </div>

      {status.error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">
          {status.error}
        </p>
      )}
    </div>
  );
});
