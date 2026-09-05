import cron from "node-cron";

export function startScheduler() {
  cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Running daily 9AM pipeline...");
    try {
      const { runFullPipeline } = await import("@/agents/pipeline");
      await runFullPipeline();
    } catch (err) {
      console.error("[Scheduler] Error:", err);
    }
  });
  console.log("[Scheduler] Started: daily at 9 AM");
}
