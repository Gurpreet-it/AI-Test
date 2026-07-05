"use client";

import {
  CalendarDays,
  Circle,
  FileClock,
  FileText,
  Play,
  RefreshCw,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarTable } from "./components/CalendarTable";
import { ContentTabs } from "./components/ContentTabs";
import { ExcelLog } from "./components/ExcelLog";
import { StatusCards } from "./components/StatusCards";
import { formatDateTime } from "./components/statusStyles";
import type {
  ApiKeyHealth,
  ContentRow,
  PipelineState,
  SchedulerStatus,
  WorkbookMetadata,
  WriteLogEntry
} from "@/lib/types";

type DashboardTab = "today" | "calendar" | "log";

interface StatusResponse {
  pipeline: PipelineState;
  apiKeys: ApiKeyHealth;
  scheduler: SchedulerStatus;
  workbook: WorkbookMetadata | null;
  latestLog: WriteLogEntry | null;
  error?: string;
}

interface CalendarResponse {
  rows: ContentRow[];
  error?: string;
}

interface TodayResponse {
  row: ContentRow | null;
  error?: string;
}

interface LogResponse {
  logs: WriteLogEntry[];
  workbook: WorkbookMetadata | null;
  error?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return payload;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("today");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [today, setToday] = useState<ContentRow | null>(null);
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [logs, setLogs] = useState<WriteLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [statusPayload, todayPayload, calendarPayload, logPayload] = await Promise.all([
        fetchJson<StatusResponse>("/api/status"),
        fetchJson<TodayResponse>("/api/today"),
        fetchJson<CalendarResponse>("/api/calendar"),
        fetchJson<LogResponse>("/api/log")
      ]);

      setStatus(statusPayload);
      setToday(todayPayload.row);
      setRows(calendarPayload.rows);
      setLogs(logPayload.logs);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  async function runNow(): Promise<void> {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/run", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? `Run request failed: ${response.status}`);
      }
      await refresh();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setRunning(false);
    }
  }

  const tabTitle = useMemo(() => {
    if (activeTab === "calendar") {
      return "Calendar";
    }
    if (activeTab === "log") {
      return "Excel Log";
    }
    return "Today's Content";
  }, [activeTab]);

  const runDisabled = Boolean(status?.pipeline.running || running);

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-stone-200 bg-white p-5 lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-900 text-white">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-normal">ContentForge</h1>
              <p className="text-sm font-semibold text-stone-500">Local content pipeline</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void runNow()}
            disabled={runDisabled}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-extrabold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {runDisabled ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            Run Pipeline Now
          </button>

          <section className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-stone-500">API Keys</h2>
            <div className="mt-3 space-y-3">
              <ApiIndicator label="Groq" ok={Boolean(status?.apiKeys.groq)} />
              <ApiIndicator label="Gemini" ok={Boolean(status?.apiKeys.gemini)} />
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-stone-500">Next Run</h2>
            <p className="mt-2 text-sm font-bold text-stone-800">
              {formatDateTime(status?.scheduler.nextRunAt)}
            </p>
            <p className="mt-1 text-xs font-semibold text-stone-500">
              {status?.scheduler.timezone ?? "Local timezone"}
            </p>
          </section>

          <nav className="mt-6 grid gap-2">
            <TabButton
              active={activeTab === "today"}
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              label="Today's Content"
              onClick={() => setActiveTab("today")}
            />
            <TabButton
              active={activeTab === "calendar"}
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              label="Calendar"
              onClick={() => setActiveTab("calendar")}
            />
            <TabButton
              active={activeTab === "log"}
              icon={<FileClock className="h-4 w-4" aria-hidden="true" />}
              label="Excel Log"
              onClick={() => setActiveTab("log")}
            />
          </nav>
        </aside>

        <section className="flex-1 p-4 md:p-6 xl:p-8">
          <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide text-stone-500">Dashboard</p>
              <h2 className="text-3xl font-black tracking-normal text-stone-950">{tabTitle}</h2>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 hover:bg-stone-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </header>

          {error ? (
            <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="space-y-5">
            <StatusCards
              today={today}
              pipeline={status?.pipeline ?? null}
              workbook={status?.workbook ?? null}
              latestLog={status?.latestLog ?? null}
            />

            {loading ? (
              <div className="rounded-lg border border-stone-200 bg-white p-8 text-center text-sm font-semibold text-stone-500 shadow-panel">
                Loading dashboard.
              </div>
            ) : null}

            {!loading && activeTab === "today" ? <ContentTabs row={today} /> : null}
            {!loading && activeTab === "calendar" ? <CalendarTable rows={rows} logs={logs} /> : null}
            {!loading && activeTab === "log" ? (
              <ExcelLog rows={rows} logs={logs} workbook={status?.workbook ?? null} />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function ApiIndicator({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-stone-800">{label}</span>
      <span
        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${
          ok
            ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
            : "bg-rose-100 text-rose-800 ring-rose-200"
        }`}
      >
        <Circle className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
        {ok ? "Ready" : "Missing"}
      </span>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-3 rounded-md px-3 text-sm font-extrabold ${
        active
          ? "bg-stone-900 text-white"
          : "bg-transparent text-stone-700 hover:bg-stone-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
