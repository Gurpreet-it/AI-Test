import { TopicGenerator } from "./TopicGenerator";
import { ContentWriter } from "./ContentWriter";
import { ImageGenerator } from "./ImageGenerator";
import { ExcelManager } from "@/lib/ExcelManager";
import { AgentResult, ContentBrand, ContentRow, PipelineResult, PipelineStep } from "@/lib/types";

const SKIPPED: AgentResult = { success: false, message: "Skipped" };

/** Row a "content only" / "images only" run should act on. */
async function pickTarget(brand: ContentBrand, id?: string, needs?: "content" | "images") {
  const rows = await ExcelManager.readAll(brand);
  if (id) return rows.find((r) => r.id === id);
  const open = rows.filter((r) =>
    needs === "content" ? !r.linkedinPost : needs === "images" ? !r.promptFile : true
  );
  return (open.length ? open : rows)[open.length ? open.length - 1 : rows.length - 1];
}

async function writeContent(row: ContentRow): Promise<AgentResult> {
  await ExcelManager.updateById(row.id, { status: "Writing" });
  const res = await new ContentWriter().run(row);
  if (res.success && res.data) {
    await ExcelManager.updateById(row.id, {
      linkedinPost: res.data.linkedinPost ?? "",
      igScript: res.data.igScript ?? "",
      status: "Done",
    });
  } else {
    await ExcelManager.updateById(row.id, { status: "Error" });
  }
  return res;
}

async function writeImagePrompt(row: ContentRow): Promise<AgentResult> {
  const res = await new ImageGenerator().run(row.topic, row.brand);
  if (res.success) await ExcelManager.updateById(row.id, { promptFile: res.filePath });
  return { success: res.success, message: res.filePath };
}

export async function runPipeline(
  brand: ContentBrand,
  step: PipelineStep,
  id?: string,
  customTopic?: string
): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  let topic = SKIPPED;
  let content = SKIPPED;
  let images = SKIPPED;

  if (step === "full" || step === "topic") {
    // customTopic set -> user-supplied topic; unset -> auto-generate
    topic = await new TopicGenerator().run(brand, customTopic);
    if (step === "topic" || !topic.success || !topic.data) {
      return { topic, content, images, ranAt };
    }
    id = topic.data.id;
  }

  if (step === "full" || step === "content") {
    const row = await pickTarget(brand, id, "content");
    content = row ? await writeContent(row) : { success: false, message: "No topic found — generate a topic first" };
  }

  if (step === "full" || step === "images") {
    const row = await pickTarget(brand, id, "images");
    images = row ? await writeImagePrompt(row) : { success: false, message: "No topic found — generate a topic first" };
  }

  return { topic, content, images, ranAt };
}

// Backwards-compatible wrappers (older API routes + the 9AM scheduler).
// The optional argument is the legacy `date` the old routes still pass; it is ignored.
export const runFullPipeline = (_date?: string) => runPipeline("tech", "full");
export const runTopicOnly = (_date?: string) => runPipeline("tech", "topic");
export const runContentOnly = (_date?: string) => runPipeline("tech", "content");
export const runImagesOnly = (_date?: string) => runPipeline("tech", "images");
export const runUnicaFullPipeline = (_date?: string) => runPipeline("hcl-unica", "full");
export const runUnicaTopicOnly = (_date?: string) => runPipeline("hcl-unica", "topic");
export const runUnicaContentOnly = (_date?: string) => runPipeline("hcl-unica", "content");
export const runUnicaImagesOnly = (_date?: string) => runPipeline("hcl-unica", "images");
