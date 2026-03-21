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

  return {
    dailyGoalMinutes: settings?.dailyGoalMinutes ?? 0,
    isLoading: settings === undefined,
    setDailyGoal,
  };
}
