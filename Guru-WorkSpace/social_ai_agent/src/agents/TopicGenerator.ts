import { Ollama } from "ollama";
import { ExcelManager } from "@/lib/ExcelManager";
import { AgentResult, ContentBrand, ContentRow } from "@/lib/types";

const TECH_KEYWORDS = [
  "QA", "MCP", "RAG", "LLM", "AI Agents", "n8n", "LangFlow", "Crew AI",
  "DeepEval", "LangChain", "AI Harness", "LLM Eval", "Agent vs Skill",
  "Skill vs Prompt", "Prompt Engineering", "Tool Use", "Embeddings",
  "Context Window", "Token Management", "Function Calling",
] as const;

const UNICA_KEYWORDS = [
  "Unica Campaign", "Unica Interact", "Unica Journey", "Unica Plan",
  "Unica Deliver", "Unica Optimize", "Unica+ Campaign", "Unica+ Journey",
  "Campaign Management", "Customer Journey Orchestration", "Email Marketing Automation",
  "Omnichannel Marketing", "Real-time Personalization", "Audience Segmentation",
] as const;

const TECH_ANGLES: Record<string, string[]> = {
  QA: ["why shift-left QA fails without eval harnesses"],
  MCP: ["Model Context Protocol for tool-use in AI"],
  RAG: ["why RAG hallucinations happen"],
};

export class TopicGenerator {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ model: "mistral" });
  }

  async run(brand: ContentBrand = "tech", dateOverride?: string): Promise<AgentResult> {
    const today = dateOverride ?? new Date().toISOString().split("T")[0];

    try {
      const usedTopics = await ExcelManager.allTopics();
      const isUnica = brand === "hcl-unica";
      const pool = isUnica ? UNICA_KEYWORDS : TECH_KEYWORDS;

      const unusedPool = [...pool].filter(
        (kw) => !usedTopics.some((t) => t.toLowerCase().includes(kw.toLowerCase()))
      );
      const activePool = unusedPool.length > 0 ? unusedPool : [...pool];
      const keyword = activePool[Math.floor(Math.random() * activePool.length)];

      const prompt = isUnica
        ? `You are a product marketer for HCL Unica. Generate ONE specific topic title about "${keyword}". Return ONLY the title, no explanation.`
        : `You are a principal engineer. Generate ONE specific topic title about "${keyword}". Return ONLY the title, no explanation.`;

      const response = await this.ollama.generate({
        model: "mistral",
        prompt,
        stream: false,
      });

      const topic = (response.response || "").trim();
      if (!topic) throw new Error("Ollama returned empty response");

      const newRow: ContentRow = {
        date: today,
        topic,
        linkedinPost: "",
        mediumArticle: "",
        igScript: "",
        ytScript: "",
        devToArticle: "",
        status: "Pending",
        linkedinImage: "",
        mediumImage: "",
        igImage: "",
      };

      await ExcelManager.appendRow(newRow);

      return {
        success: true,
        message: `[${brand}] Topic for ${today}: "${topic}"`,
        data: { date: today, topic, status: "Pending" },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `TopicGenerator failed: ${msg}` };
    }
  }
}
