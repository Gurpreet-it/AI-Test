import { Ollama } from "ollama";

/** Local Ollama model. Override with OLLAMA_MODEL in .env.local if you switch again. */
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:14b";

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434" });

/**
 * One text generation call.
 * - think:false  -> Qwen3 skips its long reasoning phase (faster, answer goes in `response`).
 * - The regex strips any <think>…</think> block a model/Ollama version still leaks into the text,
 *   so reasoning never ends up in a topic or LinkedIn post.
 */
export async function generate(
  prompt: string,
  opts: { temperature?: number; json?: boolean } = {}
): Promise<string> {
  const res = await ollama.generate({
    model: OLLAMA_MODEL,
    prompt,
    stream: false,
    think: false,
    ...(opts.json ? { format: "json" } : {}), // constrains output to valid JSON
    options: { temperature: opts.temperature ?? 0.7 },
  });
  return (res.response || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*<\/think>/i, "") // unmatched closing tag: drop everything before it
    .trim();
}
