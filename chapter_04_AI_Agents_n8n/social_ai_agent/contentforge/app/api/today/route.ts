import { NextResponse } from "next/server";
import { getExcelManager } from "@/lib/excelManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await getExcelManager().getTodayRow();
    return NextResponse.json({ row });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
