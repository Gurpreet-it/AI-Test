import { NextResponse } from "next/server";
import { runTopicOnly } from "@/agents/pipeline";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runTopicOnly(body?.date);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
