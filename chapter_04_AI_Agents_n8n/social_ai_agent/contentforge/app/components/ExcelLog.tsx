"use client";

import { Download } from "lucide-react";
import type { ContentRow, WorkbookMetadata, WriteLogEntry } from "@/lib/types";
import { formatDateTime, statusPillClass } from "./statusStyles";

interface ExcelLogProps {
  rows: ContentRow[];
  logs: WriteLogEntry[];
  workbook: WorkbookMetadata | null;
}

export function ExcelLog({ rows, logs, workbook }: ExcelLogProps) {
  const latestByDate = new Map<string, WriteLogEntry>();
  logs.forEach((log) => {
    if (log.date && !latestByDate.has(log.date)) {
      latestByDate.set(log.date, log);
    }
  });

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-stone-950">Excel Workbook</h2>
            <p className="mt-1 text-sm text-stone-600">
              Modified: {formatDateTime(workbook?.modifiedAt)}
            </p>
          </div>
          <a
            href="/api/download"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-bold text-white hover:bg-stone-800"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download XLSX
          </a>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white shadow-panel">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-lg font-extrabold text-stone-950">Per-Row Last Update</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-700">
              <tr>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Topic</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">When</th>
                <th className="px-4 py-3 font-bold">How</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((row) => {
                  const latest = latestByDate.get(row.date);
                  return (
                    <tr key={`${row.date}-${row.topic}`} className="border-t border-stone-200">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{row.date}</td>
                      <td className="max-w-[360px] px-4 py-3 font-semibold text-stone-900">{row.topic}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusPillClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {latest ? formatDateTime(latest.timestamp) : "-"}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {latest ? `${latest.agent}: ${latest.action}` : "-"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white shadow-panel">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-lg font-extrabold text-stone-950">Write Log</h2>
        </div>
        <div className="divide-y divide-stone-200">
          {logs.map((log) => (
            <article key={`${log.timestamp}-${log.agent}-${log.action}`} className="px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-bold text-stone-950">
                    {log.agent}: {log.action}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">{log.topic || log.date}</p>
                  {log.details ? <p className="mt-2 text-sm text-stone-500">{log.details}</p> : null}
                </div>
                <div className="shrink-0 text-sm font-semibold text-stone-600">
                  {formatDateTime(log.timestamp)}
                </div>
              </div>
            </article>
          ))}
        </div>
        {logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-semibold text-stone-500">
            No Excel writes logged yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
