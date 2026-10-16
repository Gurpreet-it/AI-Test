import cron from "node-cron";

export function startScheduler() {
  cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Running daily 9AM pipeline for both tracks...");
    try {
      const { runPipeline } = await import("@/agents/pipeline");
      // Sequential on purpose: one local model, one Excel file.
      await runPipeline("tech", "full");
      await runPipeline("hcl-unica", "full");
    } catch (err) {
      console.error("[Scheduler] Error:", err);
    }
  });
  console.log("[Scheduler] Started: daily at 9 AM (tech + hcl-unica)");
}
