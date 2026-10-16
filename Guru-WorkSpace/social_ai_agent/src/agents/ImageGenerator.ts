import fs from "fs";
import path from "path";
import { generate } from "@/lib/llm";

type Brand = "tech" | "hcl-unica";

/** Every string that ends up printed on the infographic. Kept short so it fits legibly. */
interface Spec {
  title: string;
  subtitle: string;
  chain: string[];
  what: string;
  quote: string;
  whyHeading: string;
  why: string[];
  howHeading: string;
  steps: { title: string; desc: string }[];
  examplesHeading: string;
  examples: { title: string; text: string }[];
  tipsHeading: string;
  tips: { key: string; text: string }[];
  compareHeading: string;
  weakLabel: string;
  weak: string;
  weakOut: string;
  strongLabel: string;
  strong: string;
  strongOut: string;
  bigger: string[];
  footer: string[];
  hashtags: string[];
}

const clip = (v: unknown, max: number): string => {
  const t = String(v ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
};
const list = (v: unknown, n: number, max: number): string[] =>
  (Array.isArray(v) ? v : []).map((x) => clip(x, max)).filter(Boolean).slice(0, n);
const objs = <T,>(v: unknown, n: number, pick: (o: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(v) ? v : [])
    .map((o) => (o && typeof o === "object" ? pick(o as Record<string, unknown>) : null))
    .filter((x): x is T => x !== null)
    .slice(0, n);

/** Validate/trim whatever the model returned. Returns null if it is unusable. */
function normalise(raw: unknown): Spec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const cmp = (r.compare ?? {}) as Record<string, unknown>;

  const spec: Spec = {
    title: clip(r.title, 60),
    subtitle: clip(r.subtitle, 70),
    chain: list(r.chain, 3, 24),
    // Limits are tighter than for a square canvas: 16:9 leaves less vertical room per card.
    what: clip(r.what, 190),
    quote: clip(r.quote, 70),
    whyHeading: clip(r.whyHeading, 32) || "Why it matters",
    why: list(r.why, 5, 48),
    howHeading: clip(r.howHeading, 40) || "How it works",
    steps: objs(r.steps, 5, (o) => (o.title ? { title: clip(o.title, 24), desc: clip(o.desc, 70) } : null)),
    examplesHeading: clip(r.examplesHeading, 32) || "Examples",
    examples: objs(r.examples, 4, (o) => (o.title ? { title: clip(o.title, 26), text: clip(o.text, 80) } : null)),
    tipsHeading: clip(r.tipsHeading, 36) || "Practical tips",
    tips: objs(r.tips, 6, (o) => (o.text ? { key: clip(o.key, 2).toUpperCase(), text: clip(o.text, 48) } : null)),
    compareHeading: clip(cmp.heading, 24) || "Before vs After",
    weakLabel: clip(cmp.weakLabel, 20) || "Weak approach",
    weak: clip(cmp.weak, 70),
    weakOut: clip(cmp.weakOut, 60),
    strongLabel: clip(cmp.strongLabel, 20) || "Better approach",
    strong: clip(cmp.strong, 150),
    strongOut: clip(cmp.strongOut, 60),
    bigger: list(r.bigger, 4, 64),
    footer: list(r.footer, 3, 22),
    hashtags: list(r.hashtags, 5, 24).map((h) => (h.startsWith("#") ? h : "#" + h.replace(/\s+/g, ""))),
  };

  // Need enough substance to be worth sending; otherwise fall back to the brief-only prompt.
  const ok = spec.title && spec.what && spec.why.length >= 3 && spec.steps.length >= 3 && spec.examples.length >= 3;
  return ok ? spec : null;
}

function parseJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function buildSpec(topic: string, brand: Brand): Promise<Spec | null> {
  const audience =
    brand === "hcl-unica"
      ? "marketing leaders and campaign managers evaluating HCL Unica / Unica+ (enterprise marketing automation)"
      : "working QA, DevOps and AI engineers; keep it practical and beginner-friendly";
  const rules =
    brand === "hcl-unica"
      ? `- Describe only general, well-known marketing-automation capabilities. Do NOT invent statistics, percentages, customer names, awards, pricing or roadmap claims.
- Always write "Unica+" (never "Unica Plus").
- The "compare" block should contrast a manual / siloed approach with a unified, orchestrated one — no numbers.`
      : `- No invented statistics or percentages. Use plain words and one concrete example per card.
- The "compare" block should show a weak vs a well-structured version of the same thing, with its likely result.`;

  const prompt = `You are designing the text for ONE professional educational infographic.
Topic: "${topic}"
Audience: ${audience}

Return ONLY a JSON object with exactly these keys (all text must be short, plain, and fit on a graphic):
{
 "title": "short main title, max 6 words",
 "subtitle": "punchy second line, max 9 words",
 "chain": ["word or short phrase","word or short phrase","word or short phrase"],
 "what": "2 short sentences defining the topic in plain language, max 28 words",
 "quote": "one memorable line, max 10 words",
 "whyHeading": "heading for the importance panel, e.g. Why it matters",
 "why": ["5 benefit lines, max 7 words each"],
 "howHeading": "heading for the 5-step flow",
 "steps": [{"title":"max 3 words","desc":"max 10 words"}  x5],
 "examplesHeading": "heading for the examples area",
 "examples": [{"title":"max 3 words","text":"one concrete example, max 13 words"}  x4],
 "tipsHeading": "heading for tips panel",
 "tips": [{"key":"single letter forming an acronym, or 1-6","text":"max 7 words"}  x5-6],
 "compare": {"heading":"Before vs After","weakLabel":"","weak":"max 9 words","weakOut":"max 8 words","strongLabel":"","strong":"max 24 words","strongOut":"max 8 words"},
 "bigger": ["4 closing takeaways, max 9 words each"],
 "footer": ["3 short slogan phrases, max 3 words each"],
 "hashtags": ["5 hashtags"]
}
Rules:
${rules}
- Write natural, specific content about THIS topic. No placeholders, no markdown, no emojis.`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = await generate(prompt, { temperature: 0.6, json: true });
      const spec = normalise(parseJson(out));
      if (spec) return spec;
    } catch {
      /* retry once, then fall back */
    }
  }
  return null;
}

// ─── Prompt assembly ────────────────────────────────────────────────────────

const PALETTE: Record<Brand, string> = {
  tech:
    "deep navy (#0B2A4A) for header/footer bands, ONE restrained teal/cyan accent (#1AA6C8) for the subtitle and small highlights, " +
    "very light blue-grey page background (#F4F7FB), white cards with a thin light border, and soft pastel section tints " +
    "(pale blue, pale mint, pale butter-yellow, pale lavender, pale blush)",
  "hcl-unica":
    "deep navy (#0B2A4A) for header/footer bands, ONE restrained warm amber accent (#E07B22) for the subtitle and small highlights, " +
    "very light neutral page background (#F6F7FA), white cards with a thin light border, and soft pastel section tints " +
    "(pale blue, pale mint, pale butter-yellow, pale lavender, pale peach)",
};

function designBlock(brand: Brand): string {
  return `FORMAT: landscape 16:9 infographic, 1920 x 1080 px, high resolution, ready for a LinkedIn post. Keep all content inside a 60 px safe margin.

VISUAL STYLE — professional and calm, NOT loud:
- Clean modern flat-vector editorial infographic, like a polished consulting / SaaS-company explainer.
- Palette: ${PALETTE[brand]}.
- Pastel tints stay low-saturation. No neon, no heavy gradients, no glow effects, no drop-shadow overload, no busy textures.
- Typography: one clean geometric sans-serif family (Inter / Poppins style). Bold navy section headings (about 30 px), regular dark-grey body text no smaller than about 20 px, title about 72 px. Strong hierarchy; text must stay readable when LinkedIn shrinks the image on a phone.
- Generous white space and consistent margins. Rounded cards (about 16 px radius) with very soft shadow. Everything aligned to a tidy 3-column grid with equal gutters (about 24 px).
- Icons: simple monoline or flat navy icons with a single accent colour, consistent stroke weight. Small, tasteful, one per card.
- No photographs, no stock-photo people, no 3D renders, no clip-art, no emoji, no watermarks, no logos.

TEXT RULES (very important):
- Render every piece of quoted text below EXACTLY as written — same wording, same spelling, same capitalisation. Do not invent, translate, summarise or add extra text.
- Do not render the layout labels (e.g. "HEADER BAND", "PANEL 1") — they are instructions only.
- Keep all text inside its card; no text cut off, overlapping or misspelled.`;
}

function specPrompt(topic: string, brand: Brand, s: Spec): string {
  const q = (t: string) => `"${t}"`;
  const chain = s.chain.length ? s.chain.map(q).join("  →  ") : "";
  const steps = s.steps
    .map((st, i) => `   ${i + 1}. ${q(st.title)} — ${q(st.desc)}`)
    .join("\n");
  const examples = s.examples.map((e) => `   • ${q(e.title)} — ${q(e.text)}`).join("\n");
  const tips = s.tips.map((t) => `   ${t.key || "•"}  ${q(t.text)}`).join("\n");
  const stepTints = ["pale blue", "pale mint", "pale butter-yellow", "pale lavender", "pale blush"];

  return `Create a professional educational infographic about: ${topic}

${designBlock(brand)}

LAYOUT — landscape 16:9, all text in quotes is final. The canvas is: header band, a three-column body, a takeaway strip, and a footer band.

HEADER BAND (full width, deep navy, top 16% of the height):
 - Left: large bold white title ${q(s.title)}; below it the subtitle ${q(s.subtitle)} in the accent colour.
${chain ? ` - Under the subtitle, one thin line with arrows: ${chain}.\n` : ""} - Right side: a simple, calm, abstract flat illustration that visually represents the topic (for example a stepped path, a rising chart, connected nodes or a mountain-and-flag metaphor) in navy/blue tones with one small accent detail. Keep it subtle.

BODY — three columns of equal height under the header (left about 28% of the width, middle about 44%, right about 28%; 24 px gutters).

LEFT COLUMN — two stacked cards:
 - Card 1 (pale blue tint, lightbulb icon): heading "What is it?" with the body text ${q(s.what)}${s.quote ? `, and below it a small pull-quote box with large quotation marks: ${q(s.quote)}` : ""}.
 - Card 2 (pale blush tint, target icon): heading ${q(s.whyHeading)} with a checklist of navy check-circle bullets:
${s.why.map((w) => `   ✔ ${q(w)}`).join("\n")}

MIDDLE COLUMN — two stacked blocks:
 - Top block: heading ${q(s.howHeading)}, then ${s.steps.length} steps as a compact vertical flow of rounded bars joined by small down-arrows. Each bar has a different pastel tint (${stepTints.slice(0, s.steps.length).join(", ")}), a numbered badge, a small icon, a bold title and a one-line description:
${steps}
 - Bottom block: heading ${q(s.examplesHeading)}, then ${s.examples.length} white cards in a neat 2-by-2 grid, each with a small navy icon, a bold title and a short example:
${examples}

RIGHT COLUMN — two stacked cards:
 - Card 1 (white, accent target icon): heading ${q(s.tipsHeading)}; a vertical list with small muted rounded-square letter/number badges:
${tips}
 - Card 2 (pale mint tint): heading ${q(s.compareHeading)}; two stacked mini-cards.
     Top mini-card with a red cross icon, label ${q(s.weakLabel)}: ${q(s.weak)} ; small caption "Output": ${q(s.weakOut)}
     Bottom mini-card with a green check icon, label ${q(s.strongLabel)}: ${q(s.strong)} ; small caption "Output": ${q(s.strongOut)}

TAKEAWAY STRIP (full width, pale yellow tint, about 9% of the height): at the left the label "The Bigger Picture", then ${s.bigger.length} short statements in one row, each preceded by a small round muted icon:
${s.bigger.map((b) => `   • ${q(b)}`).join("\n")}

FOOTER BAND (full width, deep navy, bottom 7% of the height):
 - Centre: three short phrases separated by thin vertical dividers: ${s.footer.map(q).join(" | ")}.
${s.hashtags.length ? ` - Right side or beneath them, small light-grey text: ${s.hashtags.join("  ")}\n` : ""}
Final check: balanced 16:9 composition, equal column heights, consistent spacing, calm professional colour use, no tiny unreadable text, every quoted string spelled exactly as given.`;
}

/** Used only if the local model could not produce usable structured text. */
function briefPrompt(topic: string, brand: Brand): string {
  const sector = brand === "hcl-unica" ? "enterprise marketing automation (HCL Unica / Unica+)" : "AI, QA and DevOps engineering";
  return `Create a professional educational infographic about: ${topic}
Context: ${sector}. Do not invent statistics, customer names or pricing.

${designBlock(brand)}

LAYOUT — landscape 16:9 (write concise, accurate text yourself, short phrases only):
1. HEADER BAND (navy, top 16%): bold white title based on the topic, accent-colour subtitle, a thin "A → B → C" tagline, and a subtle abstract illustration on the right.
2. BODY — three equal-height columns (about 28% / 44% / 28% of the width):
   - Left: card "What is it?" (2 short sentences + a pull-quote); card "Why it matters" (5 check-mark benefits).
   - Middle: "How it works" — 5 pastel numbered steps as a compact vertical flow (icon, 3-word title, one short line); below it "Examples" — 4 white cards in a 2-by-2 grid, each with an icon, a short title and one concrete example.
   - Right: card "Practical tips" (5-6 lettered/numbered badges); card "Before vs After" (weak vs strong version, each with its likely result).
3. TAKEAWAY STRIP (pale yellow, about 9%): "The Bigger Picture" with 4 short statements in one row.
4. FOOTER BAND (navy, bottom 7%): three short slogan phrases separated by dividers, plus 4-5 small hashtags.
Spell every word correctly; no cut-off, overlapping or tiny unreadable text.`;
}

export class ImageGenerator {
  async run(
    topic: string,
    brand: Brand = "tech"
  ): Promise<{ success: boolean; filePath: string }> {
    try {
      const now = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
      const filename = `prompts-${brand}-${stamp}.txt`;
      const dir = path.join(process.cwd(), "public", "images");
      fs.mkdirSync(dir, { recursive: true });

      const spec = await buildSpec(topic, brand);
      const prompt = spec ? specPrompt(topic, brand, spec) : briefPrompt(topic, brand);
      fs.writeFileSync(path.join(dir, filename), prompt, "utf-8");

      return { success: true, filePath: `/images/${filename}` };
    } catch (err) {
      return { success: false, filePath: err instanceof Error ? err.message : String(err) };
    }
  }
}
