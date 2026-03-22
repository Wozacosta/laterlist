"use client";

import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";

export interface ActiveTimer {
  topicId: string;
  topicName: string;
  startTime: number; // Date.now() when started
}

export interface TimerState {
  active: ActiveTimer | null;
  elapsed: number; // seconds since start (live-updated)
  start: (topicId: string, topicName: string) => void;
  stop: () => ActiveTimer | null; // returns the stopped timer (so caller can log time)
}

/**
 * Hook to manage a single active study timer.
 * Timer state lives in React state — persists across page navigation
 * within the SPA but resets on full page reload.
 *
 * The `elapsed` value is updated every second via setInterval.
 */
export function useTimerState(): TimerState {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update elapsed every second when timer is active
  useEffect(() => {
    if (active) {
      const tick = () => {
        setElapsed(Math.floor((Date.now() - active.startTime) / 1000));
      };
      tick(); // immediate first tick
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [active]);

  const start = useCallback((topicId: string, topicName: string) => {
    setActive({ topicId, topicName, startTime: Date.now() });
  }, []);

  const stop = useCallback((): ActiveTimer | null => {
    const stopped = active;
    setActive(null);
    return stopped;
  }, [active]);

  return { active, elapsed, start, stop };
}

// Context for sharing timer across components
export const TimerContext = createContext<TimerState | null>(null);

export function useTimer(): TimerState {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error("useTimer must be used within a TimerContext.Provider");
  }
  return ctx;
}
