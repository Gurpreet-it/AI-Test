import { NextResponse } from "next/server";
import { getExcelManager } from "@/lib/excelManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await getExcelManager().getWriteLog();
    const workbook = await getExcelManager().getWorkbookMetadata();
    return NextResponse.json({ logs, workbook });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
