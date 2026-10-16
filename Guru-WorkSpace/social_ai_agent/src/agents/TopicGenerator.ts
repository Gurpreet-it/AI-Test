import { randomUUID } from "crypto";
import { ExcelManager } from "@/lib/ExcelManager";
import { generate } from "@/lib/llm";
import { AgentResult, ContentBrand, ContentRow } from "@/lib/types";

const TECH_KEYWORDS = [
  "QA", "MCP", "RAG", "LLM", "AI Agents", "n8n", "LangFlow", "Crew AI",
  "DeepEval", "LangChain", "AI Harness", "LLM Eval", "Agent vs Skill",
  "Skill vs Prompt", "Prompt Engineering", "Tool Use", "Embeddings", "How to Test GenAI",
  "Context Window", "Token Management", "Function Calling", "RAG","GenAI Testing","Loal LLM",
  "Model Evaluation", " Prompt Optimization",
] as const;

const UNICA_KEYWORDS = [
  "Unica Campaign", "Unica Interact", "Unica Journey", "Unica Plan",
  "Unica Deliver", "Unica Optimize", "Unica+ Campaign", "Unica+ Journey",
  "Campaign Management", "Customer Journey Orchestration", "Email Marketing Automation",
  "Omnichannel Marketing", "Real-time Personalization", "Audience Segmentation",
] as const;

/** Strip quotes / markdown / numbering the model likes to wrap titles in. */
function cleanTitle(raw: string): string {
  const firstLine = raw.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return firstLine
    .replace(/^(title|topic)\s*[:\-]\s*/i, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^["'“”‘’*#\s]+|["'“”‘’*#\s.]+$/g, "")
    .trim();
}

export class TopicGenerator {
  /**
   * @param customTopic  When provided, the model is NOT asked for a topic: the user's own
   *                     topic is saved as-is and the rest of the pipeline runs on it.
   */
  async run(brand: ContentBrand = "tech", customTopic?: string): Promise<AgentResult> {
    const today = new Date().toISOString().split("T")[0];

    try {
      const custom = customTopic?.replace(/\s+/g, " ").trim().slice(0, 500);
      if (custom) {
        const row: ContentRow = {
          id: randomUUID(),
          brand,
          date: today,
          topic: custom,
          linkedinPost: "",
          igScript: "",
          status: "Pending",
          promptFile: "",
        };
        await ExcelManager.appendRow(row);
        return { success: true, message: `Topic (yours): ${custom}`, data: row };
      }

      const used = await ExcelManager.allTopics(brand);
      const isUnica = brand === "hcl-unica";
      const pool = isUnica ? UNICA_KEYWORDS : TECH_KEYWORDS;

      // Prefer keywords that haven't appeared in a previous topic yet.
      const unused = pool.filter(
        (kw) => !used.some((t) => t.toLowerCase().includes(kw.toLowerCase()))
      );
      const active = unused.length > 0 ? unused : pool;
      const keyword = active[Math.floor(Math.random() * active.length)];

      const avoid = used.length
        ? `\nDo not repeat or paraphrase these existing topics:\n${used.slice(-15).map((t) => `- ${t}`).join("\n")}`
        : "";

      const prompt = isUnica
        ? `You are a B2B product marketer for HCL Unica and Unica+. Write ONE specific LinkedIn topic title about "${keyword}", framed around a business outcome or use case. Max 14 words. Always write "Unica+" not "Unica Plus".${avoid}\nReturn ONLY the title, no quotes, no explanation.`
        : `You are a practical AI/QA engineer writing for working engineers. Write ONE specific, easy-to-grasp LinkedIn topic title about "${keyword}" that hints at a concrete insight or trade-off. Max 14 words. Avoid academic or overly theoretical angles.${avoid}\nReturn ONLY the title, no quotes, no explanation.`;

      const topic = cleanTitle(await generate(prompt, { temperature: 0.9 }));
      if (!topic) throw new Error("Ollama returned an empty topic");

      const row: ContentRow = {
        id: randomUUID(),
        brand,
        date: today,
        topic,
        linkedinPost: "",
        igScript: "",
        status: "Pending",
        promptFile: "",
      };
      await ExcelManager.appendRow(row);

      return { success: true, message: `Topic: ${topic}`, data: row };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `TopicGenerator failed: ${msg}` };
    }
  }
}
