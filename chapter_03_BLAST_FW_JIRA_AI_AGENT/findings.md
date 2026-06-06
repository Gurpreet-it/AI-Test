# Findings — Research, Discoveries, Constraints

## Source objective (updated)
- Build a lightweight React app. Settings hold Jira config (email, token, base URL) + GROQ API key.
- Input a Jira ID (e.g. `VWO-48`) → fetch issue → generate Test Plan automatically.
- GROQ model: `openai/gpt-oss-120b` (FREE).
- Do NOT use the external `test-plan-create-skill`; use built-in QA test-plan knowledge.

## Environment
- Node v22.22.3, npm 10.9.8 (native `fetch` available; no node-fetch needed).
- `.env` present with empty values: `GROQ_KEY`, `JIRA_EMAIL`, `JIRA_TOKEN`, `JIRA_URL` — user fills before running.

## Research / technical constraints
- **Jira Cloud REST v3:** `GET /rest/api/3/issue/{key}`. Auth = Basic `base64("email:token")`.
  - `description` returned as **ADF** (Atlassian Document Format) JSON → must flatten to plain text recursively.
  - Request `fields=summary,description,issuetype,status,priority,labels,components,fixVersions,reporter,assignee` to keep payload small.
- **CORS:** Jira Cloud REST does not send permissive CORS headers → a browser-only React app cannot call it. **Resolution:** small Express proxy server. Bonus: keeps the Jira token off the client.
- **GROQ API:** OpenAI-compatible. `POST https://api.groq.com/openai/v1/chat/completions`, `Authorization: Bearer <key>`, body `{ model, messages, response_format:{type:"json_object"}, temperature }`.
  - Use **JSON mode** so the LLM returns the Test Plan object; deterministic code renders Markdown (keeps business logic deterministic per BLAST).
- **Vite dev proxy:** `/api` → `http://localhost:8787` so frontend and proxy run together in dev.

## Reuse decision
- Rebuild fresh for the chapter exercise (per user). Output sections mirror a standard formal QA plan from built-in knowledge — not the skill.

## Open / risks
- Live connection unverified until `.env` creds provided (handshake will confirm).
- GROQ free-tier rate limits possible; surface API errors to UI.
- ADF can be deeply nested / contain tables — flattener handles text nodes, lists, paragraphs; exotic nodes degrade to plain text.
