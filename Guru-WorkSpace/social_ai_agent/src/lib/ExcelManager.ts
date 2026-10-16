import { Workbook, Worksheet } from "exceljs";
import { randomUUID } from "crypto";
import { ContentBrand, ContentRow, ContentStatus } from "./types";

const EXCEL_PATH = "./content.xlsx";
const SHEET = "Content";

const COLUMNS = [
  { header: "ID", key: "id", width: 38 },
  { header: "Date", key: "date", width: 14 },
  { header: "Brand", key: "brand", width: 12 },
  { header: "Topic", key: "topic", width: 60 },
  { header: "LinkedIn Post", key: "linkedinPost", width: 80 },
  { header: "IG Script", key: "igScript", width: 80 },
  { header: "Status", key: "status", width: 12 },
  { header: "Prompt File", key: "promptFile", width: 40 },
];

// Single in-process queue so concurrent API calls never interleave
// read-modify-write cycles on the .xlsx file. Stored on globalThis because
// Next.js dev mode may load this module more than once.
const g = globalThis as unknown as { __excelQueue?: Promise<unknown> };

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = g.__excelQueue ?? Promise.resolve();
  const next = prev.then(fn, fn);
  g.__excelQueue = next.catch(() => undefined);
  return next;
}

const cellText = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const o = v as { text?: string; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text) return o.text;
    return String(v);
  }
  return String(v);
};

function newSheet(workbook: Workbook): Worksheet {
  const sheet = workbook.addWorksheet(SHEET);
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  return sheet;
}

/** Loads the workbook; creates it, or migrates the old 5-column layout, if needed. */
async function load(): Promise<{ workbook: Workbook; sheet: Worksheet }> {
  const fs = await import("fs");
  const workbook = new Workbook();

  if (!fs.existsSync(EXCEL_PATH)) {
    const sheet = newSheet(workbook);
    await workbook.xlsx.writeFile(EXCEL_PATH);
    return { workbook, sheet };
  }

  await workbook.xlsx.readFile(EXCEL_PATH);
  let sheet = workbook.getWorksheet(SHEET);
  if (!sheet) {
    sheet = newSheet(workbook);
    return { workbook, sheet };
  }

  // Old layout: Date | Topic | LinkedIn Post | IG Script | Status  -> migrate
  if (cellText(sheet.getRow(1).getCell(1).value) === "Date") {
    const old: string[][] = [];
    sheet.eachRow((row, n) => {
      if (n === 1) return;
      old.push([1, 2, 3, 4, 5].map((c) => cellText(row.getCell(c).value)));
    });
    workbook.removeWorksheet(sheet.id);
    const fresh = newSheet(workbook);
    for (const [date, topic, li, ig, status] of old) {
      const brand: ContentBrand = /unica/i.test(topic) ? "hcl-unica" : "tech";
      fresh.addRow({
        id: randomUUID(),
        date,
        brand,
        topic,
        linkedinPost: li,
        igScript: ig,
        status: status || "Pending",
        promptFile: "",
      });
    }
    await workbook.xlsx.writeFile(EXCEL_PATH);
    return { workbook, sheet: fresh };
  }

  sheet.columns = COLUMNS; // restore keys (exceljs drops them on read)
  return { workbook, sheet };
}

function toRow(row: import("exceljs").Row): ContentRow {
  const t = (c: number) => cellText(row.getCell(c).value);
  return {
    id: t(1),
    date: t(2),
    brand: (t(3) as ContentBrand) || "tech",
    topic: t(4),
    linkedinPost: t(5),
    igScript: t(6),
    status: (t(7) as ContentStatus) || "Pending",
    promptFile: t(8),
  };
}

export class ExcelManager {
  static readAll(brand?: ContentBrand): Promise<ContentRow[]> {
    return withLock(async () => {
      const { sheet } = await load();
      const rows: ContentRow[] = [];
      sheet.eachRow((row, n) => {
        if (n === 1) return;
        const r = toRow(row);
        if (r.id && (!brand || r.brand === brand)) rows.push(r);
      });
      return rows;
    });
  }

  static async getById(id: string): Promise<ContentRow | undefined> {
    return (await this.readAll()).find((r) => r.id === id);
  }

  static async allTopics(brand?: ContentBrand): Promise<string[]> {
    return (await this.readAll(brand)).map((r) => r.topic);
  }

  static appendRow(row: ContentRow): Promise<void> {
    return withLock(async () => {
      const { workbook, sheet } = await load();
      sheet.addRow(row);
      await workbook.xlsx.writeFile(EXCEL_PATH);
    });
  }

  static updateById(id: string, updates: Partial<ContentRow>): Promise<boolean> {
    return withLock(async () => {
      const { workbook, sheet } = await load();
      let found = false;
      sheet.eachRow((row, n) => {
        if (n === 1 || cellText(row.getCell(1).value) !== id) return;
        found = true;
        if (updates.topic !== undefined) row.getCell(4).value = updates.topic;
        if (updates.linkedinPost !== undefined) row.getCell(5).value = updates.linkedinPost;
        if (updates.igScript !== undefined) row.getCell(6).value = updates.igScript;
        if (updates.status !== undefined) row.getCell(7).value = updates.status;
        if (updates.promptFile !== undefined) row.getCell(8).value = updates.promptFile;
      });
      if (found) await workbook.xlsx.writeFile(EXCEL_PATH);
      return found;
    });
  }

  static deleteById(id: string): Promise<boolean> {
    return withLock(async () => {
      const { workbook, sheet } = await load();
      let target = -1;
      sheet.eachRow((row, n) => {
        if (n > 1 && cellText(row.getCell(1).value) === id) target = n;
      });
      if (target < 0) return false;
      sheet.spliceRows(target, 1);
      await workbook.xlsx.writeFile(EXCEL_PATH);
      return true;
    });
  }

  /** Deletes all rows for one brand, or every row when brand is omitted. Returns rows removed. */
  static clear(brand?: ContentBrand): Promise<number> {
    return withLock(async () => {
      const { workbook, sheet } = await load();
      const targets: number[] = [];
      sheet.eachRow((row, n) => {
        if (n === 1) return;
        if (!brand || cellText(row.getCell(3).value) === brand) targets.push(n);
      });
      // splice bottom-up so earlier row numbers stay valid
      for (const n of targets.reverse()) sheet.spliceRows(n, 1);
      await workbook.xlsx.writeFile(EXCEL_PATH);
      return targets.length;
    });
  }
}
