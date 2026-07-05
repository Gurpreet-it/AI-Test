import { GoogleGenAI, Modality } from "@google/genai";
import Groq from "groq-sdk";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  getGeminiImageModelCandidates,
  getGroqModel,
  requireEnv
} from "./env";
import { getExcelManager, type ExcelManager } from "./excelManager";
import { formatLocalDate } from "./time";
import { ContentStatus, type ContentRow } from "./types";

const KEYWORD_POOL = [
  "QA",
  "MCP",
  "RAG",
  "LLM",
  "AI Agents",
  "n8n",
  "LangFlow",
  "Crew AI",
  "DeepEval",
  "LangChain",
  "AI Harness",
  "LLM Eval"
] as const;

const EMPTY_CONTENT = {
  linkedinPost: "",
  mediumArticle: "",
  igScript: "",
  ytScript: "",
  devtoArticle: "",
  linkedinImage: "",
  mediumImage: "",
  igImage: ""
} satisfies Omit<ContentRow, "date" | "topic" | "status">;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function groqText(
  systemPrompt: string,
  userPrompt: string,
  maxCompletionTokens: number
): Promise<string> {
  const groq = new Groq({ apiKey: requireEnv("GROQ_API_KEY") });
  const response = await groq.chat.completions.create({
    model: getGroqModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.75,
    top_p: 0.9,
    max_completion_tokens: maxCompletionTokens
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  return content;
}

function cleanTopicTitle(rawTopic: string): string {
  return rawTopic
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^topic:\s*/i, "")
    .split("\n")[0]
    .trim();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "contentforge";
}

function fallbackTopic(existingTopics: string[], date: string): string {
  const existing = new Set(existingTopics.map((topic) => topic.toLowerCase()));

  for (const keyword of KEYWORD_POOL) {
    const candidate = `${keyword} field notes for ${date}`;
    if (!existing.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `AI testing field notes for ${date}`;
}

function baseContentRow(date: string, topic: string, status: ContentStatus): ContentRow {
  return {
    date,
    topic,
    status,
    ...EMPTY_CONTENT
  };
}

export class TopicGeneratorAgent {
  constructor(private readonly excel: ExcelManager = getExcelManager()) {}

  async run(date = formatLocalDate()): Promise<ContentRow> {
    const existingToday = await this.excel.getTodayRow(date);
    if (existingToday?.topic) {
      return existingToday;
    }

    const existingTopics = await this.excel.getExistingTopics();

    try {
      const topic = await this.generateTopic(existingTopics);
      const row = baseContentRow(date, topic, ContentStatus.Pending);
      return await this.excel.appendRow(
        row,
        "Topic Generator",
        "Created topic",
        `Generated from keyword pool: ${KEYWORD_POOL.join(", ")}`
      );
    } catch (error) {
      const row = baseContentRow(date, fallbackTopic(existingTopics, date), ContentStatus.Error);
      await this.excel.appendRow(
        row,
        "Topic Generator",
        "Topic generation failed",
        errorMessage(error)
      );
      throw error;
    }
  }

  private async generateTopic(existingTopics: string[]): Promise<string> {
    const userPrompt = [
      "Generate one fresh technical content topic title.",
      `Keyword pool: ${KEYWORD_POOL.join(", ")}`,
      "Avoid these existing topics exactly and conceptually:",
      existingTopics.length > 0 ? existingTopics.join("\n") : "None yet.",
      "Return only the title. No bullets. No quotation marks."
    ].join("\n\n");

    const topic = cleanTopicTitle(
      await groqText(
        "You are a direct technical editor for AI testing, automation, and agent engineering content.",
        userPrompt,
        120
      )
    );

    if (!topic) {
      throw new Error("Topic title was empty.");
    }

    const duplicate = existingTopics.some(
      (existing) => existing.trim().toLowerCase() === topic.trim().toLowerCase()
    );

    return duplicate ? fallbackTopic(existingTopics, formatLocalDate()) : topic;
  }
}

export class ContentWriterAgent {
  constructor(private readonly excel: ExcelManager = getExcelManager()) {}

  async run(date = formatLocalDate()): Promise<ContentRow> {
    const today = await this.excel.getTodayRow(date);
    if (!today?.topic) {
      throw new Error(`No topic row found for ${date}.`);
    }

    await this.excel.updateRowByDate(
      date,
      { status: ContentStatus.Writing },
      "Content Writer",
      "Started writing",
      `Topic: ${today.topic}`
    );

    try {
      const linkedinPost = await this.generateLinkedInPost(today.topic);
      await this.excel.updateRowByDate(
        date,
        { linkedinPost },
        "Content Writer",
        "Wrote LinkedIn post",
        `${linkedinPost.length} characters`
      );

      const mediumArticle = await this.generateMediumArticle(today.topic);
      await this.excel.updateRowByDate(
        date,
        { mediumArticle },
        "Content Writer",
        "Wrote Medium article",
        `${mediumArticle.length} characters`
      );

      const igScript = await this.generateInstagramScript(today.topic);
      await this.excel.updateRowByDate(
        date,
        { igScript },
        "Content Writer",
        "Wrote IG script",
        `${igScript.length} characters`
      );

      const ytScript = await this.generateYouTubeScript(today.topic);
      await this.excel.updateRowByDate(
        date,
        { ytScript },
        "Content Writer",
        "Wrote YouTube script",
        `${ytScript.length} characters`
      );

      const devtoArticle = await this.generateDevToArticle(today.topic);
      return await this.excel.updateRowByDate(
        date,
        { devtoArticle, status: ContentStatus.Imaging },
        "Content Writer",
        "Finished content package",
        `${devtoArticle.length} Dev.to characters; status set to Imaging`
      );
    } catch (error) {
      await this.excel.updateRowByDate(
        date,
        { status: ContentStatus.Error },
        "Content Writer",
        "Writing failed",
        errorMessage(error)
      );
      throw error;
    }
  }

  private async generateLinkedInPost(topic: string): Promise<string> {
    return groqText(
      this.writerSystemPrompt(),
      `Write a hook-driven LinkedIn post about "${topic}" in 150-200 words. Use short paragraphs, concrete examples, and one pointed takeaway. Avoid filler phrases like "game-changer" and "dive deep".`,
      700
    );
  }

  private async generateMediumArticle(topic: string): Promise<string> {
    return groqText(
      this.writerSystemPrompt(),
      `Write a 3000-word Medium article in markdown about "${topic}". Use H1/H2/H3 headings, a practical example, implementation tradeoffs, failure modes, and a concise conclusion. Keep the voice direct, opinionated, and technical.`,
      5200
    );
  }

  private async generateInstagramScript(topic: string): Promise<string> {
    return groqText(
      this.writerSystemPrompt(),
      `Create an Instagram reel/carousel script about "${topic}". Include slide or scene labels, on-screen copy, narration, and a short CTA. Keep it practical and punchy without hype.`,
      1000
    );
  }

  private async generateYouTubeScript(topic: string): Promise<string> {
    return groqText(
      this.writerSystemPrompt(),
      `Write a YouTube script about "${topic}" with timestamps. Include intro, body sections, demos or examples, and outro. Make it useful for technical learners and avoid filler.`,
      2200
    );
  }

  private async generateDevToArticle(topic: string): Promise<string> {
    return groqText(
      this.writerSystemPrompt(),
      `Write a 2000-word Dev.to article in markdown about "${topic}". Include code or pseudo-code where useful, testing notes, limitations, and a practical checklist.`,
      3600
    );
  }

  private writerSystemPrompt(): string {
    return [
      "You write direct, opinionated technical content for QA engineers, automation engineers, and AI agent builders.",
      "Use short paragraphs, real examples, clear claims, and no generic hype.",
      "Never use the phrases: game-changer, dive deep, unlock the power, in today's fast-paced world."
    ].join(" ");
  }
}

export class ImageGeneratorAgent {
  constructor(private readonly excel: ExcelManager = getExcelManager()) {}

  async run(date = formatLocalDate()): Promise<ContentRow> {
    const today = await this.excel.getTodayRow(date);
    if (!today?.topic) {
      throw new Error(`No topic row found for ${date}.`);
    }

    await this.excel.updateRowByDate(
      date,
      { status: ContentStatus.Imaging },
      "Image Generator",
      "Started image generation",
      `Topic: ${today.topic}`
    );

    try {
      const mediumImage = await this.generateImage(today.topic, "medium-cover", "16:9");
      await this.excel.updateRowByDate(
        date,
        { mediumImage },
        "Image Generator",
        "Generated Medium image",
        mediumImage
      );

      const linkedinImage = await this.generateImage(today.topic, "linkedin", "1200x627");
      await this.excel.updateRowByDate(
        date,
        { linkedinImage },
        "Image Generator",
        "Generated LinkedIn image",
        linkedinImage
      );

      const igImage = await this.generateImage(today.topic, "instagram", "1080x1080 square");
      return await this.excel.updateRowByDate(
        date,
        { igImage, status: ContentStatus.Done },
        "Image Generator",
        "Finished image package",
        igImage
      );
    } catch (error) {
      await this.excel.updateRowByDate(
        date,
        { status: ContentStatus.Error },
        "Image Generator",
        "Image generation failed",
        errorMessage(error)
      );
      throw error;
    }
  }

  private async generateImage(topic: string, kind: string, sizeHint: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
    const prompt = this.imagePrompt(topic, kind, sizeHint);
    const triedModels: string[] = [];
    let lastError = "";

    for (const model of getGeminiImageModelCandidates()) {
      triedModels.push(model);

      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE]
          }
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        const imagePart = parts.find((part) => Boolean(part.inlineData?.data));
        const imageBase64 = imagePart?.inlineData?.data;

        if (!imageBase64) {
          lastError = `Model ${model} returned no image data.`;
          continue;
        }

        const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";
        const extension = mimeType.includes("jpeg")
          ? "jpg"
          : mimeType.includes("webp")
            ? "webp"
            : "png";
        const fileName = `${formatLocalDate()}-${kind}-${slugify(topic)}-${randomUUID().slice(0, 8)}.${extension}`;
        const imageDir = path.join(process.cwd(), "public", "images");
        const outputPath = path.join(imageDir, fileName);

        await fs.mkdir(imageDir, { recursive: true });
        await fs.writeFile(outputPath, Buffer.from(imageBase64, "base64"));

        return `/images/${fileName}`;
      } catch (error) {
        lastError = `Model ${model} failed: ${errorMessage(error)}`;
        console.warn(lastError);
      }
    }

    throw new Error(
      `Gemini image generation failed for ${kind}. Tried: ${triedModels.join(", ")}. ${lastError}`
    );
  }

  private imagePrompt(topic: string, kind: string, sizeHint: string): string {
    return [
      `Create a polished editorial image for ${kind}.`,
      `Topic: ${topic}.`,
      `Target framing: ${sizeHint}.`,
      "Visual direction: modern software engineering workspace, AI workflow diagrams, testing signals, automation nodes, and readable composition.",
      "Avoid logos, brand names, tiny unreadable text, stock-photo smiles, and clutter."
    ].join(" ");
  }
}

export function getKeywordPool(): readonly string[] {
  return KEYWORD_POOL;
}
