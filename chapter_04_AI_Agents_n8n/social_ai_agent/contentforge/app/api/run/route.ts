import { NextResponse } from "next/server";
import { getPipelineState, runPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  void runPipeline().catch((error: unknown) => {
    console.error("Manual ContentForge pipeline failed", error);
  });

  return NextResponse.json(
    {
      started: true,
      status: getPipelineState()
    },
    { status: 202 }
  );
}
