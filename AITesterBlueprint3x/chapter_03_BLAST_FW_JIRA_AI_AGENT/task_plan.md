# Task Plan — Jira → Test Plan Generator (BLAST)

**Objective:** Lightweight React app: enter Jira config + GROQ key in Settings, give a Jira ID (e.g. `VWO-48`), auto-generate a formal Test Plan (on screen + downloadable `.md`).

> Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

## Phase 0 — Initialization
- [x] Create memory files (`task_plan.md`, `findings.md`, `progress.md`, `gemini.md`)
- [x] HALT honored until Discovery + Schema confirmed

## Phase 1 — B: Blueprint
- [x] Discovery (5 questions) — answered
- [x] Data-First — Input/Output JSON schema confirmed in `gemini.md`
- [x] Research — GROQ (OpenAI-compatible) endpoint, Jira ADF, CORS → proxy (see `findings.md`)
- [x] Tech stack chosen: Vite + React frontend, Express proxy, native fetch

## Phase 2 — L: Link (Connectivity)
- [x] `.env` wiring via `dotenv`
- [x] `tools/jiraClient.js` — fetch + normalize issue
- [x] `tools/groqClient.js` — chat completion call
- [x] `tools/handshake.js` — verify both connections (run once creds added)
- [x] Live handshake PASS — Jira VWO-48 fetched + GROQ responded (2026-06-06)

## Phase 3 — A: Architect (3-layer)
- [x] Layer 1 SOPs in `architecture/` (jira-fetch, groq-generate, test-plan-template)
- [x] Layer 2 navigation — `server.js` routing
- [x] Layer 3 tools — `testPlan.js` (prompt build + deterministic Markdown render)

## Phase 4 — S: Stylize (UI)
- [x] React UI: Settings panel, Generator, Test Plan view
- [x] Clean CSS, professional layout
- [x] Markdown render + download button
- [x] Build verified — `npm run build` OK (35 modules), server boot + endpoints OK
- [ ] User feedback on UI

## Phase 5 — T: Trigger (Deploy)
- [x] `package.json` scripts (`dev`, `build`, `start`)
- [x] README run instructions
- [x] Maintenance Log in `LLM.md` (was `gemini.md`)
- [x] Cloud deploy — Vercel serverless (`api/`), live at https://testplanbuddy.vercel.app

## Done-when
- `npm install && npm run dev`, open UI, enter creds + `VWO-48`, get a formal Markdown test plan.

## ✅ VERIFIED LIVE (2026-06-06)
- Handshake PASS (Jira + GROQ).
- `POST /api/generate {VWO-48}` → HTTP 200, full 13-section plan, 2293-byte Markdown.
- `POST /api/save` → wrote `output/test-plan-VWO-48.md`.
- Dev running: Express :8787 + Vite :5173.
- Fix: `.env` uses `JIRA_API_TOKEN`; code now accepts `JIRA_API_TOKEN` || `JIRA_TOKEN`.
