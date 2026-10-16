import { generate } from "@/lib/llm";
import { AgentResult, ContentRow } from "@/lib/types";

export class ContentWriter {
  private ask(prompt: string): Promise<string> {
    return generate(prompt, { temperature: 0.7 });
  }

  async run(row: ContentRow): Promise<AgentResult> {
    try {
      const isUnica = row.brand === "hcl-unica";
      const audience = isUnica
        ? "marketing leaders and campaign managers using HCL Unica / Unica+"
        : "working QA, DevOps and AI engineers";
      const voice = isUnica
        ? "Focus on business outcomes and concrete capabilities. Do not invent metrics, customer names or pricing."
        : "Keep it practical and beginner-friendly. Explain the idea in plain words with one concrete example.";

      const linkedinPost = await this.ask(
        `Write a LinkedIn post of 300-500 words for ${audience} about: "${row.topic}".
${voice}
Style: clean flowing prose, em-dashes, a confident opinionated voice. No hashtags, no bullet points, no emojis, no headings.
Return ONLY the post text.`
      );

      const igScript = await this.ask(
        `Create a 10-slide Instagram carousel for ${audience} about: "${row.topic}".
${voice}
Format every slide exactly as:
SLIDE <n>
HEADLINE: <max 8 words>
BODY: <1-2 short sentences>
Slide 1 is a hook, slide 10 is a call to action. Return ONLY the slides.`
      );

      if (!linkedinPost || !igScript) throw new Error("Ollama returned empty content");

      return {
        success: true,
        message: `Content written: ${row.topic}`,
        data: { linkedinPost, igScript },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `ContentWriter failed: ${msg}` };
    }
  }
}
