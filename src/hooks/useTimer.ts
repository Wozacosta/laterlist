"use client";

import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";

export interface ActiveTimer {
  topicId: string;
  topicName: string;
  startTime: number; // Date.now() when started
}

export type PomodoroPhase = "work" | "break";

export interface PomodoroConfig {
  enabled: boolean;
  workMinutes: number;  // default 25
  breakMinutes: number; // default 5
}

export interface TimerState {
  active: ActiveTimer | null;
  elapsed: number; // seconds since start (live-updated)
  start: (topicId: string, topicName: string) => void;
  stop: () => ActiveTimer | null;
  // Pomodoro
  pomodoro: PomodoroConfig;
  pomodoroPhase: PomodoroPhase;
  pomodoroRemaining: number; // seconds remaining in current interval
  pomodoroAlert: boolean; // true when interval just ended (for notification)
  dismissAlert: () => void;
  setPomodoroEnabled: (enabled: boolean) => void;
  setPomodoroWork: (minutes: number) => void;
  setPomodoroBreak: (minutes: number) => void;
}

const DEFAULT_POMODORO: PomodoroConfig = {
  enabled: false,
  workMinutes: 25,
  breakMinutes: 5,
};

/**
 * Hook to manage a single active study timer with optional Pomodoro mode.
 */
export function useTimerState(): TimerState {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pomodoro, setPomodoro] = useState<PomodoroConfig>(DEFAULT_POMODORO);
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("work");
  const [phaseStart, setPhaseStart] = useState(0); // Date.now() when phase started
  const [pomodoroAlert, setPomodoroAlert] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const intervalSeconds = pomodoroPhase === "work"
    ? pomodoro.workMinutes * 60
    : pomodoro.breakMinutes * 60;

  // Compute remaining time in current Pomodoro interval
  const pomodoroRemaining = pomodoro.enabled && active
    ? Math.max(0, intervalSeconds - Math.floor((Date.now() - phaseStart) / 1000))
    : 0;

  // Update elapsed every second when timer is active
  useEffect(() => {
    if (active) {
      const tick = () => {
        setElapsed(Math.floor((Date.now() - active.startTime) / 1000));
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [active]);

  // Pomodoro interval completion detection
  useEffect(() => {
    if (!active || !pomodoro.enabled) return;

    const check = () => {
      const phaseElapsed = Math.floor((Date.now() - phaseStart) / 1000);
      if (phaseElapsed >= intervalSeconds) {
        // Phase ended — switch phases and alert
        const nextPhase: PomodoroPhase = pomodoroPhase === "work" ? "break" : "work";
        setPomodoroPhase(nextPhase);
        setPhaseStart(Date.now());
        setPomodoroAlert(true);
        // Play notification sound
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = pomodoroPhase === "work" ? 880 : 660;
          gain.gain.value = 0.3;
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          // Play a second beep after a short pause
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = pomodoroPhase === "work" ? 880 : 660;
          gain2.gain.value = 0.3;
          osc2.start(ctx.currentTime + 0.4);
          osc2.stop(ctx.currentTime + 0.7);
        } catch {
          // Audio not available — visual notification is enough
        }
      }
    };

    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [active, pomodoro.enabled, phaseStart, intervalSeconds, pomodoroPhase]);

  const start = useCallback((topicId: string, topicName: string) => {
    setActive({ topicId, topicName, startTime: Date.now() });
    setPomodoroPhase("work");
    setPhaseStart(Date.now());
    setPomodoroAlert(false);
  }, []);

  const stop = useCallback((): ActiveTimer | null => {
    const stopped = active;
    setActive(null);
    setPomodoroAlert(false);
    return stopped;
  }, [active]);

  const dismissAlert = useCallback(() => {
    setPomodoroAlert(false);
  }, []);

  const setPomodoroEnabled = useCallback((enabled: boolean) => {
    setPomodoro((prev) => ({ ...prev, enabled }));
    if (enabled && active) {
      setPomodoroPhase("work");
      setPhaseStart(Date.now());
    }
  }, [active]);

  const setPomodoroWork = useCallback((minutes: number) => {
    setPomodoro((prev) => ({ ...prev, workMinutes: Math.max(1, Math.min(120, minutes)) }));
  }, []);

  const setPomodoroBreak = useCallback((minutes: number) => {
    setPomodoro((prev) => ({ ...prev, breakMinutes: Math.max(1, Math.min(60, minutes)) }));
  }, []);

  return {
    active,
    elapsed,
    start,
    stop,
    pomodoro,
    pomodoroPhase,
    pomodoroRemaining,
    pomodoroAlert,
    dismissAlert,
    setPomodoroEnabled,
    setPomodoroWork,
    setPomodoroBreak,
  };
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
