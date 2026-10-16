import { NextResponse } from "next/server";
import { ExcelManager } from "@/lib/ExcelManager";
import { ContentBrand } from "@/lib/types";

export const dynamic = "force-dynamic";

const isBrand = (b: unknown): b is ContentBrand => b === "tech" || b === "hcl-unica";

// GET /api/content?brand=tech|hcl-unica   (omit brand for everything)
export async function GET(req: Request) {
  try {
    const brand = new URL(req.url).searchParams.get("brand");
    const rows = await ExcelManager.readAll(isBrand(brand) ? brand : undefined);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/content  body: { id }  -> remove one item
//                      body: { brand } -> clear that brand only
export async function DELETE(req: Request) {
  try {
    const { id, brand } = await req.json().catch(() => ({}));
    if (id) {
      const ok = await ExcelManager.deleteById(String(id));
      return NextResponse.json({ ok, removed: ok ? 1 : 0 });
    }
    if (isBrand(brand)) {
      const removed = await ExcelManager.clear(brand);
      return NextResponse.json({ ok: true, removed });
    }
    return NextResponse.json({ ok: false, error: "Provide id or brand" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
