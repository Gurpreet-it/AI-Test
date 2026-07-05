import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { getExcelManager } from "@/lib/excelManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manager = getExcelManager();
    await manager.getWorkbookMetadata();
    const file = await fs.readFile(manager.getWorkbookPath());

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="content_calendar.xlsx"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
