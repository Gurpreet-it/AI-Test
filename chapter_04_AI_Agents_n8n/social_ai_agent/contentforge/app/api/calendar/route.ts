import { NextResponse } from "next/server";
import { getExcelManager } from "@/lib/excelManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getExcelManager().getRows();
    return NextResponse.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
