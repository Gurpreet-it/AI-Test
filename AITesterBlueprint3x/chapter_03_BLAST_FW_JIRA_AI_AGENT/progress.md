# Progress Log

## 2026-06-06 — Phase 0 + 1 (Blueprint)
- Created memory files: `task_plan.md`, `findings.md`, `progress.md`, `gemini.md`.
- Discovery answered: plan-doc-only · JIRA read via proxy · single issue · local `.md` · native template.
- Scope expanded per updated `Objective.md`: **React app + GROQ** (`openai/gpt-oss-120b`), config in Settings, `.env` provided.
- Data schema confirmed in `gemini.md` (config / generate request / normalized issue / test-plan payload).
- Research: GROQ OpenAI-compatible endpoint; Jira ADF flattening; Jira CORS → Express proxy needed.

## 2026-06-06 — Phase 2 (Link)
- Built `tools/jiraClient.js` (fetch + ADF flatten + normalize), `tools/groqClient.js` (chat), `tools/handshake.js`.
- `dotenv` wired to chapter `.env`.
- Live handshake **PENDING** — `.env` values empty; user must add creds, then `npm run handshake`.

## 2026-06-06 — Phase 3 (Architect)
- Layer 1 SOPs: `architecture/jira-fetch.md`, `groq-generate.md`, `test-plan-template.md`.
- Layer 2: `server.js` routes `/api/config`, `/api/generate`, `/api/save` + serves `dist/` in prod.
- Layer 3: `tools/testPlan.js` (prompt build, defensive normalize, deterministic Markdown render).

## 2026-06-06 — Phase 4 (Stylize)
- React UI: `App.jsx` (tabs), `Settings.jsx`, `Generator.jsx`, `TestPlanView.jsx` (formatted + raw markdown toggle), `styles.css` (dark professional theme).
- Download `.md` (client) + Save to server (`output/`).

## 2026-06-06 — Phase 5 (Trigger)
- `package.json` scripts: `dev`, `build`, `start`, `handshake`.
- `README.md` with setup/run/usage.

## Verification results
- `node --check` on all backend files → **SYNTAX OK**.
- `npm install` → 160 pkgs, no blocking errors (2 moderate audit advisories, non-blocking).
- `npm run build` → **35 modules transformed, built OK** (dist emitted).
- Server boot test (PORT 8799):
  - `GET /api/config` → `{jiraUrl:"",...,hasGroqKey:false}` ✅
  - `POST /api/generate` (no creds) → `{"error":"Missing Jira base URL"}` ✅ (graceful)
  - `GET /` → `200` (static index served) ✅

## Errors / learnings
- Pinned `express@^4` and used a regex catch-all `/^(?!\/api).*/` (avoids express 5 path-to-regexp `*` breakage).
- No live API errors yet — awaiting creds for end-to-end run.

## 2026-06-06 — LIVE RUN (creds added)
- `.env` filled by user. **Bug:** key was `JIRA_API_TOKEN`, code read `JIRA_TOKEN` → patched `server.js` + `handshake.js` to accept both (self-anneal).
- `npm run handshake` → **LINK OK ✅** (VWO-48: "Shopping cart total shows $0.00 after applying discount code"; GROQ `{"ok":true}`).
- Killed stale procs holding :8787/:5173 (leftover run), restarted.
- `npm run dev` → Express :8787 + Vite :5173 up.
- `POST /api/generate {VWO-48}` → HTTP 200; objective re: discount code "SAVE20"; 4 in-scope, 4 strategy, 2 risks; 2293-byte Markdown.
- `POST /api/save` → `output/test-plan-VWO-48.md` written.
- Opened http://localhost:5173 in browser.

## 2026-06-06 — Phase 5 (Trigger) — DEPLOYED
- Converted Express proxy → Vercel serverless functions: `api/config.js`, `api/generate.js`, `api/save.js` (save returns 501 — serverless FS read-only). Added `vercel.json` + `.vercelignore`.
- **Folder fix:** user renamed `chapter_03_BLAST_FW` → `chapter_03_BLAST_FW_JIRA_AI_AGENT` mid-session; my later writes landed in a stray `chapter_03_BLAST_FW`. Moved `api/`, `vercel.json`, `.vercelignore`, `.vercel/`, `prompt.md` into the real folder, deleted the stray. (gemini.md was renamed by user to `LLM.md`.)
- First deploy failed (`vite build` exit 127) — had deployed the empty stray folder. Re-deployed from the real folder.
- Vercel project: `luckydutta96s-projects/testplanbuddy`.
- **Live:** https://testplanbuddy.vercel.app — homepage 200, `/api/config` 200, `/api/generate` graceful error (no server-side creds).
- Env vars NOT uploaded (blocked by safety guard) → use Settings tab at runtime or add them in the Vercel dashboard.
- Git: committed; pushed to `main` + branch `chapter-03-blast-jira-testplan`.

## Status: COMPLETE — built, verified live locally, and deployed to production.
