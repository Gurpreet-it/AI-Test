import { ExcelManager } from "@/lib/ExcelManager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await ExcelManager.readAll();
    return Response.json(rows);
  } catch (err) {
    return Response.json([], { status: 500 });
  }
}
