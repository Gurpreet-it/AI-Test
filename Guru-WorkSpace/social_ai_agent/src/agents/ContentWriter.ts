import { Ollama } from "ollama";
import { AgentResult, ContentRow } from "@/lib/types";

export class ContentWriter {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ model: "mistral" });
  }

  async run(row: ContentRow): Promise<AgentResult> {
    try {
      const linkedinPrompt = `Write a 220-280 word LinkedIn post about: "${row.topic}". 
Style: Clean prose, use em-dashes, opinionated voice, no hashtags, no bullets.
Return ONLY the post text.`;

      const linkedinRes = await this.ollama.generate({
        model: "mistral",
        prompt: linkedinPrompt,
        stream: false,
      });

      const linkedinPost = (linkedinRes.response || "").trim();

      const igPrompt = `Create a 10-slide Instagram carousel script for: "${row.topic}".
Format each slide as: HEADLINE: [text] | BODY: [2-3 sentences] | CAPTION: [hook]
Return ONLY the slides.`;

      const igRes = await this.ollama.generate({
        model: "mistral",
        prompt: igPrompt,
        stream: false,
      });

      const igScript = (igRes.response || "").trim();

      return {
        success: true,
        message: `Content written for: ${row.topic}`,
        data: { linkedinPost, igScript },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `ContentWriter failed: ${msg}` };
    }
  }
}
