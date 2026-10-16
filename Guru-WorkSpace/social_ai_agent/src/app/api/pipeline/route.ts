import { NextResponse } from "next/server";
import { runPipeline } from "@/agents/pipeline";
import { ContentBrand, PipelineStep } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BRANDS: ContentBrand[] = ["tech", "hcl-unica"];
const STEPS: PipelineStep[] = ["full", "topic", "content", "images"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { brand, step, id, topic } = body as {
    brand?: ContentBrand;
    step?: PipelineStep;
    id?: string;
    topic?: unknown;
  };

  if (!brand || !BRANDS.includes(brand) || !step || !STEPS.includes(step)) {
    return NextResponse.json({ ok: false, error: "Invalid brand or step" }, { status: 400 });
  }
  if (topic !== undefined && typeof topic !== "string") {
    return NextResponse.json({ ok: false, error: "topic must be a string" }, { status: 400 });
  }

  try {
    const data = await runPipeline(brand, step, id, topic?.trim() || undefined);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
