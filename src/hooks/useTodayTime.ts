import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useTodayTime() {
  const start = todayStart();

  const todaySeconds = useLiveQuery(async () => {
    const logs = await db.timeLogs
      .where("loggedAt")
      .above(start)
      .toArray();
    return logs.reduce((sum, log) => sum + log.seconds, 0);
  }, [start]);

  return todaySeconds ?? 0;
}
