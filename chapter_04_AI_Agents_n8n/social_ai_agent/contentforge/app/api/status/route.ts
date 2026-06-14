import { NextResponse } from "next/server";
import { getApiKeyHealth } from "@/lib/env";
import { getExcelManager } from "@/lib/excelManager";
import { getPipelineState } from "@/lib/pipeline";
import { getSchedulerStatus } from "@/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [workbook, logs] = await Promise.all([
      getExcelManager().getWorkbookMetadata(),
      getExcelManager().getWriteLog()
    ]);

    return NextResponse.json({
      pipeline: getPipelineState(),
      apiKeys: getApiKeyHealth(),
      scheduler: getSchedulerStatus(),
      workbook,
      latestLog: logs[0] ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        pipeline: getPipelineState(),
        apiKeys: getApiKeyHealth(),
        scheduler: getSchedulerStatus(),
        workbook: null,
        latestLog: null,
        error: message
      },
      { status: 500 }
    );
  }
}
