import { TopicGenerator } from "./TopicGenerator";
import { ContentWriter } from "./ContentWriter";
import { ImageGenerator } from "./ImageGenerator";
import { ExcelManager } from "@/lib/ExcelManager";
import { PipelineResult, ContentRow } from "@/lib/types";

async function processContent(brand: "tech" | "hcl-unica"): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const tg = new TopicGenerator();
  const topicResult = await tg.run(brand);

  let contentResult = { success: false, message: "Skipped" };
  let imageResult = { success: false, message: "Skipped" };
  
  if (topicResult.success && topicResult.data) {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const row: ContentRow = {
        date: topicResult.data.date || new Date().toISOString().split("T")[0],
        topic: topicResult.data.topic || "",
        linkedinPost: "",
        mediumArticle: "",
        igScript: "",
        ytScript: "",
        devToArticle: "",
        status: "Writing",
        linkedinImage: "",
        mediumImage: "",
        igImage: "",
      };

      if (row.topic && row.topic.length > 0) {
        // Content
        const cw = new ContentWriter();
        const cwResult = await cw.run(row);
        
        if (cwResult.success && cwResult.data) {
          await ExcelManager.updateByDate(row.date, {
            linkedinPost: cwResult.data.linkedinPost || "",
            igScript: cwResult.data.igScript || "",
            status: "Done",
          });
          contentResult = cwResult;
        } else {
          contentResult = cwResult;
        }

        // Images
        const ig = new ImageGenerator();
        const igResult = await ig.run(row.topic, brand);
        imageResult = { success: igResult.success, message: igResult.filePath };
      }
    } catch (err) {
      contentResult = { success: false, message: `Error: ${err}` };
    }
  }

  return { topic: topicResult, content: contentResult, images: imageResult, ranAt };
}

export async function runFullPipeline(): Promise<PipelineResult> {
  return processContent("tech");
}

export async function runTopicOnly(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const tg = new TopicGenerator();
  const topicResult = await tg.run("tech");
  return { topic: topicResult, content: { success: false, message: "Skipped" }, images: { success: false, message: "Skipped" }, ranAt };
}

export async function runContentOnly(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const rows = await ExcelManager.readAll();
  const latestRow = rows[rows.length - 1];
  let contentResult = { success: false, message: "No row found" };
  if (latestRow && latestRow.topic) {
    const cw = new ContentWriter();
    const cwResult = await cw.run(latestRow);
    if (cwResult.success && cwResult.data) {
      await ExcelManager.updateByDate(latestRow.date, {
        linkedinPost: cwResult.data.linkedinPost || "",
        igScript: cwResult.data.igScript || "",
        status: "Done",
      });
    }
    contentResult = cwResult;
  }
  return { topic: { success: false, message: "Skipped" }, content: contentResult, images: { success: false, message: "Skipped" }, ranAt };
}

export async function runImagesOnly(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const rows = await ExcelManager.readAll();
  const latestRow = rows[rows.length - 1];
  let imageResult = { success: false, message: "Skipped" };
  if (latestRow && latestRow.topic) {
    const ig = new ImageGenerator();
    const igResult = await ig.run(latestRow.topic, "tech");
    imageResult = { success: igResult.success, message: igResult.filePath };
  }
  return { topic: { success: false, message: "Skipped" }, content: { success: false, message: "Skipped" }, images: imageResult, ranAt };
}

export async function runUnicaFullPipeline(): Promise<PipelineResult> {
  return processContent("hcl-unica");
}

export async function runUnicaTopicOnly(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const tg = new TopicGenerator();
  const topicResult = await tg.run("hcl-unica");
  return { topic: topicResult, content: { success: false, message: "Skipped" }, images: { success: false, message: "Skipped" }, ranAt };
}

export async function runUnicaContentOnly(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const rows = await ExcelManager.readAll();
  const latestRow = rows[rows.length - 1];
  let contentResult = { success: false, message: "No row found" };
  if (latestRow && latestRow.topic) {
    const cw = new ContentWriter();
    const cwResult = await cw.run(latestRow);
    if (cwResult.success && cwResult.data) {
      await ExcelManager.updateByDate(latestRow.date, {
        linkedinPost: cwResult.data.linkedinPost || "",
        igScript: cwResult.data.igScript || "",
        status: "Done",
      });
    }
    contentResult = cwResult;
  }
  return { topic: { success: false, message: "Skipped" }, content: contentResult, images: { success: false, message: "Skipped" }, ranAt };
}

export async function runUnicaImagesOnly(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const rows = await ExcelManager.readAll();
  const latestRow = rows[rows.length - 1];
  let imageResult = { success: false, message: "Skipped" };
  if (latestRow && latestRow.topic) {
    const ig = new ImageGenerator();
    const igResult = await ig.run(latestRow.topic, "hcl-unica");
    imageResult = { success: igResult.success, message: igResult.filePath };
  }
  return { topic: { success: false, message: "Skipped" }, content: { success: false, message: "Skipped" }, images: imageResult, ranAt };
}
