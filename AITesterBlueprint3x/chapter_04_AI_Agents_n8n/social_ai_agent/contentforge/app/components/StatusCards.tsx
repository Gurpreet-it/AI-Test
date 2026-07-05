"use client";

import { Activity, CalendarClock, FileSpreadsheet, Sparkles } from "lucide-react";
import type { ContentRow, PipelineState, WorkbookMetadata, WriteLogEntry } from "@/lib/types";
import { statusPillClass, formatDateTime } from "./statusStyles";

interface StatusCardsProps {
  today: ContentRow | null;
  pipeline: PipelineState | null;
  workbook: WorkbookMetadata | null;
  latestLog: WriteLogEntry | null;
}

export function StatusCards({ today, pipeline, workbook, latestLog }: StatusCardsProps) {
  const status = today?.status ?? pipeline?.stage ?? "idle";
  const updatedAt = latestLog?.timestamp ?? pipeline?.lastUpdatedAt ?? workbook?.modifiedAt ?? null;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-stone-500">Today's Topic</p>
          <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
        </div>
        <h2 className="mt-3 line-clamp-3 text-xl font-extrabold text-stone-950">
          {today?.topic || "No topic yet"}
        </h2>
      </article>

      <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-stone-500">Current Status</p>
          <Activity className="h-5 w-5 text-sky-600" aria-hidden="true" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${statusPillClass(status)}`}>
            {String(status)}
          </span>
          {pipeline?.running ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
              Running
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm text-stone-600">{pipeline?.message ?? "Idle"}</p>
      </article>

      <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-stone-500">Last Updated</p>
          <CalendarClock className="h-5 w-5 text-violet-600" aria-hidden="true" />
        </div>
        <p className="mt-4 text-base font-bold text-stone-950">{formatDateTime(updatedAt)}</p>
        <p className="mt-2 text-sm text-stone-600">{latestLog?.agent ?? "No writes logged"}</p>
      </article>

      <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-stone-500">Workbook</p>
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        </div>
        <p className="mt-4 text-base font-bold text-stone-950">
          {workbook?.exists ? "content_calendar.xlsx" : "Not created"}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          {workbook ? `${Math.max(1, Math.round(workbook.sizeBytes / 1024))} KB` : "Waiting for first read"}
        </p>
      </article>
    </section>
  );
}
