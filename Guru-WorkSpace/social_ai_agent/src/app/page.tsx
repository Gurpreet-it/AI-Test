"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentControls, TopicMode } from "@/components/AgentControls";
import { AgentLog, LogEntry } from "@/components/AgentLog";
import { ContentTable } from "@/components/ContentTable";
import { PreviewDrawer } from "@/components/PreviewDrawer";
import { ContentBrand, ContentRow, PipelineResult, PipelineStep } from "@/lib/types";

const BRANDS: Record<ContentBrand, { label: string; color: string; title: string; blurb: string; example: string }> = {
  tech: {
    label: "AI & Tech",
    example: "e.g. Agent vs Skill vs Prompt — what's the difference?",
    color: "#4f46e5",
    title: "AI & Tech content studio",
    blurb: "Practical AI, QA and DevOps topics — a LinkedIn post, a 10-slide Instagram carousel and a Gemini image prompt per idea.",
  },
  "hcl-unica": {
    label: "HCL Unica",
    example: "e.g. How Unica+ Journey orchestrates email and SMS",
    color: "#ea580c",
    title: "HCL Unica content studio",
    blurb: "Product marketing for Unica and Unica+ — capabilities and use cases as LinkedIn posts, carousels and image prompts.",
  },
};

const STEP_LABEL: Record<PipelineStep, string> = {
  full: "Generating topic, post, carousel and image prompt",
  topic: "Generating a topic",
  content: "Writing LinkedIn post and Instagram carousel",
  images: "Creating the image prompt",
};

interface Confirm {
  title: string;
  body: string;
  action: string;
  run: () => void;
}

export default function Dashboard() {
  const [tab, setTab] = useState<ContentBrand>("tech");
  // Topic source is remembered separately for each track.
  const [topicInput, setTopicInput] = useState<Record<ContentBrand, { mode: TopicMode; text: string }>>({
    tech: { mode: "auto", text: "" },
    "hcl-unica": { mode: "auto", text: "" },
  });
  const setTopicState = (b: ContentBrand, patch: Partial<{ mode: TopicMode; text: string }>) =>
    setTopicInput((p) => ({ ...p, [b]: { ...p[b], ...patch } }));
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [logs, setLogs] = useState<Record<ContentBrand, LogEntry[]>>({ tech: [], "hcl-unica": [] });
  const [busy, setBusy] = useState<{ brand: ContentBrand; step: PipelineStep; since: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/content", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setRows(data);
    } catch {
      /* server restarting — try again on next poll */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - busy.since) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const say = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  const log = (brand: ContentBrand, message: string, level: LogEntry["level"] = "info") =>
    setLogs((p) => ({ ...p, [brand]: [{ message, timestamp: new Date(), level }, ...p[brand]].slice(0, 40) }));

  const run = async (brand: ContentBrand, step: PipelineStep, id?: string) => {
    if (busy) return;
    // Only the topic-creating steps use the "My topic" text; regenerate/content/images never do.
    const ti = topicInput[brand];
    const customTopic =
      !id && (step === "full" || step === "topic") && ti.mode === "custom" ? ti.text.trim() : undefined;
    if (ti.mode === "custom" && !id && (step === "full" || step === "topic") && !customTopic) return;

    setBusy({ brand, step, since: Date.now() });
    log(brand, customTopic ? `▶ ${STEP_LABEL[step]} — “${customTopic}”…` : `▶ ${STEP_LABEL[step]}…`);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, step, id, topic: customTopic }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Request failed");
      const r = json.data as PipelineResult;
      const parts: [string, PipelineResult["topic"]][] = [
        ["Topic", r.topic],
        ["Content", r.content],
        ["Image prompt", r.images],
      ];
      let failed = false;
      for (const [name, part] of parts) {
        if (part.message === "Skipped") continue;
        if (!part.success) failed = true;
        log(brand, `${part.success ? "✓" : "✗"} ${name}: ${part.message}`, part.success ? "success" : "error");
      }
      say(failed ? "Finished with errors — see the activity log" : "Done ✓");
      if (!failed && customTopic) setTopicState(brand, { text: "" }); // ready for the next topic
    } catch (e) {
      log(brand, `✗ ${e instanceof Error ? e.message : String(e)}`, "error");
      say("Something went wrong — see the activity log");
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const removeOne = async (row: ContentRow) => {
    await fetch("/api/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    if (previewId === row.id) setPreviewId(null);
    log(row.brand, `🗑️ Deleted: ${row.topic}`);
    say("Item deleted");
    refresh();
  };

  const removeAll = async (brand: ContentBrand) => {
    const res = await fetch("/api/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand }),
    });
    const json = await res.json();
    setPreviewId(null);
    log(brand, `🗑️ Cleared ${json.removed ?? 0} item(s)`);
    say(`Cleared ${json.removed ?? 0} item(s)`);
    refresh();
  };

  const byBrand = useMemo(
    () => ({
      tech: rows.filter((r) => r.brand === "tech"),
      "hcl-unica": rows.filter((r) => r.brand === "hcl-unica"),
    }),
    [rows]
  );

  const current = byBrand[tab];
  const meta = BRANDS[tab];
  const stat = (s: string) => current.filter((r) => r.status === s).length;
  const preview = rows.find((r) => r.id === previewId) ?? null;
  const busyHere = busy?.brand === tab;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="logo">
            <div className="logo-mark">C</div>
            <div>
              <h1>ContentForge</h1>
              <p>LinkedIn posts · Instagram carousels · Gemini image prompts</p>
            </div>
          </div>
          <nav className="tabs">
            {(Object.keys(BRANDS) as ContentBrand[]).map((b) => (
              <button key={b} className={`tab ${tab === b ? "active" : ""}`} onClick={() => setTab(b)}>
                <span className="dot" style={{ background: BRANDS[b].color }} />
                {BRANDS[b].label}
                <span className="count">{byBrand[b].length}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="panel" data-brand={tab} key={tab}>
          <div className="hero">
            <div>
              <h2>{meta.title}</h2>
              <p>{meta.blurb}</p>
            </div>
            <AgentControls
              disabled={!!busy}
              mode={topicInput[tab].mode}
              topicText={topicInput[tab].text}
              placeholder={meta.example}
              onModeChange={(m) => setTopicState(tab, { mode: m })}
              onTopicChange={(t) => setTopicState(tab, { text: t })}
              canClear={current.length > 0}
              onRun={(step) => run(tab, step)}
              onClear={() =>
                setConfirm({
                  title: `Clear all ${meta.label} content?`,
                  body: `This permanently removes ${current.length} item(s) from the ${meta.label} library. ${
                    tab === "tech" ? "HCL Unica" : "AI & Tech"
                  } content is not affected.`,
                  action: "Clear all",
                  run: () => removeAll(tab),
                })
              }
            />
          </div>

          {busy && (
            <div className="busy">
              <div className="spinner" />
              <span>
                {busyHere ? STEP_LABEL[busy.step] : `${BRANDS[busy.brand].label}: ${STEP_LABEL[busy.step]}`}… {elapsed}s
                <span style={{ fontWeight: 400 }}> — local qwen3:14b, can take 1–2 minutes</span>
              </span>
            </div>
          )}

          <div className="stats">
            <div className="stat">
              <div className="label">Total</div>
              <div className="value">{current.length}</div>
              <div className="hint">items in library</div>
            </div>
            <div className="stat ok">
              <div className="label">Ready</div>
              <div className="value">{stat("Done")}</div>
              <div className="hint">post + carousel written</div>
            </div>
            <div className="stat warn">
              <div className="label">Pending</div>
              <div className="value">{stat("Pending") + stat("Writing") + stat("Imaging")}</div>
              <div className="hint">topic only / in progress</div>
            </div>
            <div className="stat err">
              <div className="label">Errors</div>
              <div className="value">{stat("Error")}</div>
              <div className="hint">needs a retry</div>
            </div>
          </div>

          <ContentTable
            rows={current}
            onPreview={(r) => setPreviewId(r.id)}
            onDelete={(r) =>
              setConfirm({
                title: "Delete this item?",
                body: r.topic,
                action: "Delete",
                run: () => removeOne(r),
              })
            }
          />

          <div className="card">
            <div className="card-head">
              <h3>Activity log</h3>
              <button className="btn small ghost" onClick={() => setLogs((p) => ({ ...p, [tab]: [] }))}>
                Clear log
              </button>
            </div>
            <AgentLog logs={logs[tab]} />
          </div>
        </section>
      </main>

      {preview && (
        <div className="panel" data-brand={preview.brand}>
          <PreviewDrawer
            row={preview}
            busy={!!busy}
            onClose={() => setPreviewId(null)}
            onRegenerate={(step) => run(preview.brand, step, preview.id)}
            onDelete={() =>
              setConfirm({
                title: "Delete this item?",
                body: preview.topic,
                action: "Delete",
                run: () => removeOne(preview),
              })
            }
          />
        </div>
      )}

      {confirm && (
        <>
          <div className="overlay" style={{ zIndex: 60 }} onClick={() => setConfirm(null)} />
          <div className="modal" role="alertdialog">
            <h4>{confirm.title}</h4>
            <p>{confirm.body}</p>
            <div className="row">
              <button className="btn" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn solid-danger"
                onClick={() => {
                  const fn = confirm.run;
                  setConfirm(null);
                  fn();
                }}
              >
                {confirm.action}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
