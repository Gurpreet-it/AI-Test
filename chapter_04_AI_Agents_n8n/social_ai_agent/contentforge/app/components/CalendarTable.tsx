"use client";

import type { ContentRow, WriteLogEntry } from "@/lib/types";
import { formatDateTime, statusPillClass } from "./statusStyles";

interface CalendarTableProps {
  rows: ContentRow[];
  logs: WriteLogEntry[];
}

export function CalendarTable({ rows, logs }: CalendarTableProps) {
  const latestByDate = new Map<string, WriteLogEntry>();
  logs.forEach((log) => {
    if (log.date && !latestByDate.has(log.date)) {
      latestByDate.set(log.date, log);
    }
  });

  const sortedRows = [...rows].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-panel">
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
          <thead className="bg-stone-900 text-white">
            <tr>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Topic</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">LinkedIn</th>
              <th className="px-4 py-3 font-bold">Medium</th>
              <th className="px-4 py-3 font-bold">IG</th>
              <th className="px-4 py-3 font-bold">YouTube</th>
              <th className="px-4 py-3 font-bold">Dev.to</th>
              <th className="px-4 py-3 font-bold">Last Write</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const latest = latestByDate.get(row.date);
              return (
                <tr key={`${row.date}-${row.topic}`} className="border-t border-stone-200">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-stone-800">{row.date}</td>
                  <td className="max-w-[280px] px-4 py-3 font-semibold text-stone-950">{row.topic}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusPillClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.linkedinPost ? "Written" : "-"}</td>
                  <td className="px-4 py-3">{row.mediumArticle ? "Written" : "-"}</td>
                  <td className="px-4 py-3">{row.igScript ? "Written" : "-"}</td>
                  <td className="px-4 py-3">{row.ytScript ? "Written" : "-"}</td>
                  <td className="px-4 py-3">{row.devtoArticle ? "Written" : "-"}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {latest ? `${latest.agent} - ${formatDateTime(latest.timestamp)}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sortedRows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm font-semibold text-stone-500">
          No calendar rows yet.
        </div>
      ) : null}
    </div>
  );
}
