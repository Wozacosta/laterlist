import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

const SETTINGS_ID = "settings";

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID));

  const setDailyGoal = useCallback(async (minutes: number) => {
    const clamped = Math.max(0, Math.min(1440, Math.round(minutes)));
    const existing = await db.settings.get(SETTINGS_ID);
    if (existing) {
      await db.settings.update(SETTINGS_ID, { dailyGoalMinutes: clamped });
    } else {
      await db.settings.add({ id: SETTINGS_ID, dailyGoalMinutes: clamped });
    }
  }, []);

  const setStudyHours = useCallback(async (startHour: number, endHour: number) => {
    const start = Math.max(0, Math.min(23, Math.round(startHour)));
    const end = Math.max(start + 1, Math.min(24, Math.round(endHour)));
    const existing = await db.settings.get(SETTINGS_ID);
    if (existing) {
      await db.settings.update(SETTINGS_ID, { studyStartHour: start, studyEndHour: end });
    } else {
      await db.settings.add({ id: SETTINGS_ID, dailyGoalMinutes: 0, studyStartHour: start, studyEndHour: end });
    }
  }, []);

  return {
    dailyGoalMinutes: settings?.dailyGoalMinutes ?? 0,
    studyStartHour: settings?.studyStartHour ?? 8,
    studyEndHour: settings?.studyEndHour ?? 21,
    isLoading: settings === undefined,
    setDailyGoal,
    setStudyHours,
  };
}
