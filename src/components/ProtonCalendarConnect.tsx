"use client";

import { memo, useState, useEffect, useCallback } from "react";

interface ProtonStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
  error?: string;
}

export const ProtonCalendarConnect = memo(function ProtonCalendarConnect() {
  const [status, setStatus] = useState<ProtonStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/proton");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, error: "Failed to check status" });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = useCallback(async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/proton", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus({ connected: true, email });
        setShowForm(false);
        setPassword("");
      } else {
        setStatus({ connected: false, error: data.error || "Connection failed" });
      }
    } catch {
      setStatus({ connected: false, error: "Failed to connect" });
    }
    setLoading(false);
  }, [email, password]);

  const handleDisconnect = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/calendar/proton", { method: "DELETE" });
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
          {/* Shield icon (Proton brand) */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={status.connected ? "text-purple-500" : "text-gray-400"}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Proton Calendar
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
              onClick={() => setShowForm(!showForm)}
              disabled={loading}
              className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-400 dark:hover:bg-purple-900 transition-colors disabled:opacity-50"
            >
              {showForm ? "Cancel" : "Connect"}
            </button>
          )}
        </div>
      </div>

      {/* Credential input form */}
      {showForm && !status.connected && (
        <div className="mt-3 space-y-2">
          <input
            type="email"
            placeholder="Proton email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:placeholder:text-gray-600"
          />
          <input
            type="password"
            placeholder="App-specific password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
            className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:placeholder:text-gray-600"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Generate an app password in Proton Settings
            </p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={loading || !email || !password}
              className="rounded bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Verifying..." : "Connect"}
            </button>
          </div>
        </div>
      )}

      {status.error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">
          {status.error}
        </p>
      )}
    </div>
  );
});
