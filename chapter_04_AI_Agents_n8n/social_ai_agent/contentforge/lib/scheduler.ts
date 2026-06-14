import cron, { type ScheduledTask } from "node-cron";
import { runPipeline } from "./pipeline";
import { getLocalTimezone, getNextLocalNineAm } from "./time";
import type { SchedulerStatus } from "./types";

const CRON_EXPRESSION = "0 9 * * *";

declare global {
  var __contentforgeSchedulerStarted: boolean | undefined;
  var __contentforgeSchedulerTask: ScheduledTask | undefined;
}

export function startScheduler(): void {
  if (globalThis.__contentforgeSchedulerStarted) {
    return;
  }

  const timezone = getLocalTimezone();
  const task = cron.schedule(
    CRON_EXPRESSION,
    () => {
      void runPipeline().catch((error: unknown) => {
        console.error("Scheduled ContentForge pipeline failed", error);
      });
    },
    { timezone }
  );

  globalThis.__contentforgeSchedulerTask = task;
  globalThis.__contentforgeSchedulerStarted = true;
}

export function getSchedulerStatus(): SchedulerStatus {
  return {
    initialized: Boolean(globalThis.__contentforgeSchedulerStarted),
    cronExpression: CRON_EXPRESSION,
    timezone: getLocalTimezone(),
    nextRunAt: getNextLocalNineAm()
  };
}
