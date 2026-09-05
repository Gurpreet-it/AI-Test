import { Workbook } from "exceljs";
import { ContentRow } from "./types";

const EXCEL_PATH = "./content.xlsx";

export class ExcelManager {
  static async ensureFile(): Promise<void> {
    const fs = await import("fs");
    if (!fs.existsSync(EXCEL_PATH)) {
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet("Content");
      sheet.columns = [
        { header: "Date", key: "date", width: 20 },
        { header: "Topic", key: "topic", width: 50 },
        { header: "LinkedIn Post", key: "linkedinPost", width: 50 },
        { header: "IG Script", key: "igScript", width: 50 },
        { header: "Status", key: "status", width: 15 },
      ];
      await workbook.xlsx.writeFile(EXCEL_PATH);
    }
  }

  static async readAll(): Promise<ContentRow[]> {
    await this.ensureFile();
    const workbook = new Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);
    const sheet = workbook.getWorksheet("Content");
    const rows: ContentRow[] = [];
    
    sheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const values = row.values as any[];
      rows.push({
        date: values[1] || "",
        topic: values[2] || "",
        linkedinPost: values[3] || "",
        mediumArticle: "",
        igScript: values[4] || "",
        ytScript: "",
        devToArticle: "",
        status: values[5] || "Pending",
        linkedinImage: "",
        mediumImage: "",
        igImage: "",
      });
    });
    return rows;
  }

  static async getByDate(date: string): Promise<ContentRow[]> {
    const all = await this.readAll();
    return all.filter((r) => r.date === date);
  }

  static async allTopics(): Promise<string[]> {
    const all = await this.readAll();
    return all.map((r) => r.topic);
  }

  static async appendRow(row: ContentRow): Promise<void> {
    await this.ensureFile();
    const workbook = new Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);
    const sheet = workbook.getWorksheet("Content");
    
    sheet?.addRow([row.date, row.topic, row.linkedinPost, row.igScript, row.status]);
    await workbook.xlsx.writeFile(EXCEL_PATH);
  }

  static async updateByDate(date: string, updates: Partial<ContentRow>): Promise<void> {
    const workbook = new Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);
    const sheet = workbook.getWorksheet("Content");
    
    sheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (row.getCell(1).value === date) {
        if (updates.linkedinPost) row.getCell(3).value = updates.linkedinPost;
        if (updates.igScript) row.getCell(4).value = updates.igScript;
        if (updates.status) row.getCell(5).value = updates.status;
      }
    });
    await workbook.xlsx.writeFile(EXCEL_PATH);
  }

  static async clear(): Promise<void> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Content");
    sheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Topic", key: "topic", width: 50 },
      { header: "LinkedIn Post", key: "linkedinPost", width: 50 },
      { header: "IG Script", key: "igScript", width: 50 },
      { header: "Status", key: "status", width: 15 },
    ];
    await workbook.xlsx.writeFile(EXCEL_PATH);
  }
}
