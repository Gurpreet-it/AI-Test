# gemini.md — Project Constitution

> Single source of architectural truth. `gemini.md` is **law**; the planning files are memory.

## 1. Mission
A lightweight **React app + Express proxy** that takes Jira config + a GROQ key in **Settings**, fetches a Jira issue by ID (e.g. `VWO-48`), and auto-generates a **formal QA Test Plan** rendered on screen and downloadable as Markdown.

## 2. Integrations
| Service | Use | Endpoint | Auth |
|---|---|---|---|
| Jira Cloud | Fetch issue | `GET {JIRA_URL}/rest/api/3/issue/{id}` | Basic `base64(email:token)` |
| GROQ | Generate plan | `POST https://api.groq.com/openai/v1/chat/completions` | `Bearer GROQ_KEY` |

- **Model:** `openai/gpt-oss-120b` (FREE).
- **Why a proxy:** Jira Cloud REST blocks browser CORS; proxy also keeps the API token off the client.

## 3. Data Schema (Input / Output) — ✅ CONFIRMED

### 3a. Config (from `.env` defaults, overridable in Settings UI)
```json
{
  "jiraUrl": "https://your-domain.atlassian.net",
  "jiraEmail": "you@example.com",
  "jiraToken": "ATATT...",
  "groqKey": "gsk_..."
}
```
`.env` keys: `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, `GROQ_KEY`.

### 3b. Generate request (frontend → proxy)
```json
{ "jiraId": "VWO-48", "config": { "...": "see 3a (optional; falls back to .env)" } }
```

### 3c. Normalized Jira issue (proxy internal)
```json
{
  "key": "VWO-48",
  "summary": "string",
  "description": "string (ADF flattened to text)",
  "issueType": "Story | Bug | Task | ...",
  "status": "string",
  "priority": "string",
  "components": ["string"],
  "labels": ["string"],
  "fixVersions": ["string"],
  "reporter": "string",
  "assignee": "string | null"
}
```

### 3d. Test Plan payload (GROQ JSON output → deterministic Markdown)
```json
{
  "testPlanId": "TP-VWO-48",
  "sourceIssue": "VWO-48",
  "title": "Test Plan — <summary>",
  "objective": "string",
  "scope": { "inScope": ["string"], "outOfScope": ["string"] },
  "inclusions": ["string"],
  "testEnvironments": ["string"],
  "defectReporting": "string",
  "testStrategy": ["string"],
  "schedule": [{ "phase": "string", "owner": "string", "dates": "string" }],
  "deliverables": ["string"],
  "entryCriteria": ["string"],
  "exitCriteria": ["string"],
  "tools": ["string"],
  "risks": [{ "risk": "string", "mitigation": "string" }],
  "approvals": [{ "role": "string", "name": "string" }]
}
```
Output rendered in UI + downloadable to `output/test-plan-<jiraId>.md`.

## 4. Behavioral Rules
- **Tone:** formal, professional QA.
- **Native template only:** test-plan sections come from built-in QA knowledge — do NOT depend on the external `test-plan-create-skill`.
- **Do Not fabricate:** where the ticket is silent, emit `TBD` / flag the gap; never invent Jira data.
- **Deterministic boundary:** GROQ produces *content* (JSON); Markdown rendering and file I/O are deterministic code in `tools/`.
- **Secrets:** tokens live in `.env` / Settings only; never logged, never committed.

## 5. Architectural Invariants (A.N.T. 3-layer)
- **Layer 1 — Architecture (`architecture/`):** Markdown SOPs for jira-fetch, groq-generate, test-plan template.
- **Layer 2 — Navigation:** `server.js` routes request → jiraClient → testPlan(groqClient) → response.
- **Layer 3 — Tools (`tools/`):** atomic JS engines — `jiraClient.js`, `groqClient.js`, `testPlan.js`.
- **Source of truth:** single Jira issue, live fetch. No linked issues, no Confluence.
- **Delivery:** on-screen render + local `.md` download.
- `.tmp/` for intermediates; `output/` for deliverable plans.

## 6. Maintenance Log
- 2026-06-06: Initial build complete (all 5 BLAST phases). Frontend builds, server boots, endpoints verified with empty creds (graceful errors).
- **Express pinned to v4**; catch-all route uses regex `/^(?!\/api).*/` (express 5 breaks `app.get('*')`).
- **Live API path unverified** until `.env` creds added → run `npm run handshake`.
- Self-anneal protocol: on a tool failure, read the error, patch the `tools/` file, re-test, then record the learning in the matching `architecture/*.md`.
- 2026-06-06: Live handshake PASS (Jira VWO-48 + GROQ). End-to-end generate verified locally.
- 2026-06-06: **Deployed to Vercel** → https://testplanbuddy.vercel.app (project `testplanbuddy`). Express proxy converted to serverless functions in `api/`; `/api/save` disabled on serverless (use client Download .md). Production env vars must be set in the Vercel dashboard (or entered in the Settings tab at runtime).
- Note: this file was `gemini.md` (BLAST default name); renamed to `LLM.md` for this Claude-based project. Still the constitution / law.
