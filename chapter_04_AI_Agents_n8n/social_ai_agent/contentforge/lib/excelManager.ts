import ExcelJS from "exceljs";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ContentStatus,
  type ContentRow,
  type WorkbookMetadata,
  type WriteLogEntry,
  isContentStatus
} from "./types";
import { formatLocalDate, nowIso } from "./time";

const CALENDAR_SHEET = "Calendar";
const LOG_SHEET = "Write Log";

const CALENDAR_COLUMNS: ReadonlyArray<{
  header: string;
  key: keyof ContentRow;
  width: number;
}> = [
  { header: "Date", key: "date", width: 14 },
  { header: "Topic", key: "topic", width: 38 },
  { header: "LinkedIn POST", key: "linkedinPost", width: 42 },
  { header: "Medium Article", key: "mediumArticle", width: 56 },
  { header: "IG Script", key: "igScript", width: 42 },
  { header: "YT Script", key: "ytScript", width: 48 },
  { header: "Dev.to Article", key: "devtoArticle", width: 56 },
  { header: "Status", key: "status", width: 14 },
  { header: "LinkedIn Image", key: "linkedinImage", width: 30 },
  { header: "Medium Image", key: "mediumImage", width: 30 },
  { header: "IG Image", key: "igImage", width: 30 }
];

const LOG_HEADERS = ["Timestamp", "Agent", "Action", "Date", "Topic", "Status", "Details"] as const;

type CalendarColumnKey = (typeof CALENDAR_COLUMNS)[number]["key"];

interface ReadRowsResult {
  rows: ContentRow[];
  rowNumbersByDate: Map<string, number>;
}

export class ExcelManager {
  private readonly workbookPath: string;
  private readonly tempWorkbookPath: string;
  private queue: Promise<void> = Promise.resolve();

  constructor(rootDir = process.cwd()) {
    this.workbookPath = path.join(rootDir, "content_calendar.xlsx");
    this.tempWorkbookPath = path.join(rootDir, "content_calendar.xlsx.tmp");
  }

  async getRows(): Promise<ContentRow[]> {
    return this.withLock(async () => {
      const workbook = await this.readWorkbook();
      return this.readRows(workbook).rows;
    });
  }

  async getTodayRow(date = formatLocalDate()): Promise<ContentRow | null> {
    const rows = await this.getRows();
    return rows.find((row) => row.date === date) ?? null;
  }

  async getExistingTopics(): Promise<string[]> {
    const rows = await this.getRows();
    return rows.map((row) => row.topic).filter((topic) => topic.trim().length > 0);
  }

  async appendRow(
    row: ContentRow,
    agent: string,
    action: string,
    details: string
  ): Promise<ContentRow> {
    return this.withLock(async () => {
      const workbook = await this.readWorkbook();
      const sheet = this.getCalendarSheet(workbook);
      const inserted = sheet.addRow(this.toExcelValues(row));
      this.styleBodyRow(inserted);
      this.addLog(workbook, row, agent, action, details);
      await this.writeWorkbookAtomic(workbook);
      return row;
    });
  }

  async updateRowByDate(
    date: string,
    updates: Partial<ContentRow>,
    agent: string,
    action: string,
    details: string
  ): Promise<ContentRow> {
    return this.withLock(async () => {
      const workbook = await this.readWorkbook();
      const sheet = this.getCalendarSheet(workbook);
      const { rowNumbersByDate } = this.readRows(workbook);
      const rowNumber = rowNumbersByDate.get(date);

      if (!rowNumber) {
        throw new Error(`No content row found for ${date}.`);
      }

      const excelRow = sheet.getRow(rowNumber);
      CALENDAR_COLUMNS.forEach((column, index) => {
        const value = updates[column.key];
        if (value !== undefined) {
          excelRow.getCell(index + 1).value = value;
        }
      });
      this.styleBodyRow(excelRow);

      const updatedRow = this.rowFromExcel(excelRow);
      this.addLog(workbook, updatedRow, agent, action, details);
      await this.writeWorkbookAtomic(workbook);
      return updatedRow;
    });
  }

  async addLogEntry(entry: WriteLogEntry): Promise<void> {
    await this.withLock(async () => {
      const workbook = await this.readWorkbook();
      const sheet = this.getLogSheet(workbook);
      const row = sheet.addRow([
        entry.timestamp,
        entry.agent,
        entry.action,
        entry.date,
        entry.topic,
        entry.status,
        entry.details
      ]);
      this.styleLogRow(row);
      await this.writeWorkbookAtomic(workbook);
    });
  }

  async getWriteLog(): Promise<WriteLogEntry[]> {
    return this.withLock(async () => {
      const workbook = await this.readWorkbook();
      const sheet = this.getLogSheet(workbook);
      const entries: WriteLogEntry[] = [];

      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        const timestamp = this.cellToString(row.getCell(1).value);
        if (!timestamp) {
          continue;
        }

        const status = this.cellToString(row.getCell(6).value);
        entries.push({
          timestamp,
          agent: this.cellToString(row.getCell(2).value),
          action: this.cellToString(row.getCell(3).value),
          date: this.cellToString(row.getCell(4).value),
          topic: this.cellToString(row.getCell(5).value),
          status: isContentStatus(status) ? status : "",
          details: this.cellToString(row.getCell(7).value)
        });
      }

      return entries.reverse();
    });
  }

  async getWorkbookMetadata(): Promise<WorkbookMetadata> {
    return this.withLock(async () => {
      await this.readWorkbook();
      const stats = await fs.stat(this.workbookPath);
      return {
        path: this.workbookPath,
        exists: true,
        modifiedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size
      };
    });
  }

  getWorkbookPath(): string {
    return this.workbookPath;
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.queue.then(operation, operation);
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async readWorkbook(): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const exists = await this.fileExists(this.workbookPath);

    if (exists) {
      await workbook.xlsx.readFile(this.workbookPath);
      this.ensureWorkbookShape(workbook);
      return workbook;
    }

    this.ensureWorkbookShape(workbook);
    await this.writeWorkbookAtomic(workbook);
    return workbook;
  }

  private ensureWorkbookShape(workbook: ExcelJS.Workbook): void {
    this.getCalendarSheet(workbook);
    this.getLogSheet(workbook);
  }

  private getCalendarSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    const sheet = workbook.getWorksheet(CALENDAR_SHEET) ?? workbook.addWorksheet(CALENDAR_SHEET);
    const headerRow = sheet.getRow(1);

    CALENDAR_COLUMNS.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      if (!this.cellToString(cell.value)) {
        cell.value = column.header;
      }
      sheet.getColumn(index + 1).width = column.width;
    });

    this.styleHeaderRow(headerRow);
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return sheet;
  }

  private getLogSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    const sheet = workbook.getWorksheet(LOG_SHEET) ?? workbook.addWorksheet(LOG_SHEET);
    const headerRow = sheet.getRow(1);

    LOG_HEADERS.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      if (!this.cellToString(cell.value)) {
        cell.value = header;
      }
      sheet.getColumn(index + 1).width = index === 6 ? 70 : 24;
    });

    this.styleHeaderRow(headerRow);
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return sheet;
  }

  private readRows(workbook: ExcelJS.Workbook): ReadRowsResult {
    const sheet = this.getCalendarSheet(workbook);
    const rows: ContentRow[] = [];
    const rowNumbersByDate = new Map<string, number>();

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const contentRow = this.rowFromExcel(row);
      if (!contentRow.date && !contentRow.topic) {
        continue;
      }

      rows.push(contentRow);
      if (contentRow.date) {
        rowNumbersByDate.set(contentRow.date, rowNumber);
      }
    }

    return { rows, rowNumbersByDate };
  }

  private rowFromExcel(row: ExcelJS.Row): ContentRow {
    const valueFor = (key: CalendarColumnKey): string => {
      const columnIndex = CALENDAR_COLUMNS.findIndex((column) => column.key === key);
      return this.cellToString(row.getCell(columnIndex + 1).value);
    };

    const rawStatus = valueFor("status");

    return {
      date: valueFor("date"),
      topic: valueFor("topic"),
      linkedinPost: valueFor("linkedinPost"),
      mediumArticle: valueFor("mediumArticle"),
      igScript: valueFor("igScript"),
      ytScript: valueFor("ytScript"),
      devtoArticle: valueFor("devtoArticle"),
      status: isContentStatus(rawStatus) ? rawStatus : ContentStatus.Pending,
      linkedinImage: valueFor("linkedinImage"),
      mediumImage: valueFor("mediumImage"),
      igImage: valueFor("igImage")
    };
  }

  private toExcelValues(row: ContentRow): string[] {
    return CALENDAR_COLUMNS.map((column) => String(row[column.key] ?? ""));
  }

  private addLog(
    workbook: ExcelJS.Workbook,
    row: ContentRow,
    agent: string,
    action: string,
    details: string
  ): void {
    const logSheet = this.getLogSheet(workbook);
    const logRow = logSheet.addRow([
      nowIso(),
      agent,
      action,
      row.date,
      row.topic,
      row.status,
      details
    ]);
    this.styleLogRow(logRow);
  }

  private styleHeaderRow(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF263238" }
      };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    row.height = 22;
  }

  private styleBodyRow(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }

  private styleLogRow(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }

  private async writeWorkbookAtomic(workbook: ExcelJS.Workbook): Promise<void> {
    await fs.mkdir(path.dirname(this.workbookPath), { recursive: true });
    await workbook.xlsx.writeFile(this.tempWorkbookPath);
    await fs.rename(this.tempWorkbookPath, this.workbookPath);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private cellToString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (value instanceof Date) {
      return formatLocalDate(value);
    }

    if (typeof value === "object") {
      const record = value as unknown as Record<string, unknown>;
      const text = record.text;
      if (typeof text === "string") {
        return text;
      }

      const richText = record.richText;
      if (Array.isArray(richText)) {
        return richText
          .map((part) => {
            if (typeof part === "object" && part !== null && "text" in part) {
              const typedPart = part as { text?: unknown };
              return typeof typedPart.text === "string" ? typedPart.text : "";
            }
            return "";
          })
          .join("");
      }

      const result = record.result;
      if (typeof result === "string" || typeof result === "number" || typeof result === "boolean") {
        return String(result);
      }

      return "";
    }

    return String(value);
  }
}

let excelManagerSingleton: ExcelManager | null = null;

export function getExcelManager(): ExcelManager {
  excelManagerSingleton ??= new ExcelManager();
  return excelManagerSingleton;
}
