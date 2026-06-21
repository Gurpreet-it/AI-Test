# Chapter 05 — AI Agents with LangFlow

### What Is LangFlow?

LangFlow is a visual, low-code builder for LLM apps and AI agents. You wire components
(models, prompts, tools, file loaders, parsers) on a canvas, test the flow live, and then
expose it as an HTTP API. Every published flow gets a REST endpoint
(`POST /api/v1/run/{flowId}`) so any front-end — or a CI job — can call it.

This chapter builds a real agent and a UI on top of that API.

---

## Flaky Test Analyzer (AI Agent)

A LangFlow agent that ingests **two Playwright `results.json` files** (e.g. baseline build vs.
candidate build) and reports which build is flakier — separating genuine flaky tests from
consistent failures and giving rerun / send-to-engineering recommendations.

A lightweight React UI sits in front of the agent so you can drag in two result files and read
the diagnosis as rendered markdown.

![Flaky Test Analyzer UI](flaky_test_analyzer_ai_Agent/ui/docs/screenshot.png)

### How the UI talks to the agent

The browser calls a same-origin `/api/...` path that **Vite proxies to LangFlow**
(`vite.config.js`). The proxy is required: LangFlow's file-upload endpoint does not answer the
browser's CORS preflight, so a direct cross-origin upload fails with *"Failed to fetch"*.
Routing through the proxy makes every request same-origin. Each analysis is two calls:

1. **Upload** each file → `POST /api/v1/files/upload/{flowId}` → returns a server `file_path`.
2. **Run** the flow → `POST /api/v1/run/{flowId}?stream=false` with the two paths injected as
   `tweaks` on the flow's File components (`File-daKW7`, `File-IKmcY`).

### Run it

```bash
cd flaky_test_analyzer_ai_Agent/ui
npm install
npm run dev          # http://localhost:5173
```

LangFlow must be running at `http://localhost:7861` with the agent flow imported. All connection
settings (base URL, `x-api-key`, flow ID, File component IDs) are prefilled and editable in the
**Connection** panel. Sample inputs live in `flaky_test_analyzer_ai_Agent/ui/samples/`.

### Example result

Two builds compared in the screenshot above:

| Build | File | Passed | Failed | Flaky | Skipped | Duration |
|-------|------|:------:|:------:|:-----:|:-------:|----------|
| A — baseline  | `result1.json` | 47 | 3 | 0 | 0 | 41.7 s |
| B — candidate | `result2.json` | 48 | 2 | 0 | 0 | 39.5 s |

**Analysis Report (agent output):**

> **1. FLAKY_TESTS**
> - **redirects to dashboard after successful login** — Flake hypothesis: intermittent
>   navigation timeout, possibly parallel-worker contention or a temporary network delay causing
>   `page.waitForURL` to exceed the default 60s timeout. It passed in Build 2, confirming
>   non-deterministic behaviour.
>
> **2. CONSISTENT_FAILURES**
> - **rejects login with expired session token** — Same assertion failure in both builds:
>   expected HTTP 401, received 500. Probable root cause: the backend throws an unhandled
>   exception (500) when processing an expired token instead of returning a clean 401.
>
> **3. RERUN_RECOMMENDATION** — Quarantine/rerun the flaky login-redirect test; send the
> expired-session-token failure to engineering (reproducible, not flaky).

See `flaky_test_analyzer_ai_Agent/ui/README.md` for the UI internals.
