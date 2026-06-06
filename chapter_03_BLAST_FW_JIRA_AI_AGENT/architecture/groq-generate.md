# SOP — GROQ Test Plan Generation (Layer 1)

**Tools:** `tools/groqClient.js` · `groqChat()` and `tools/testPlan.js` · `generateTestPlan()` / `renderMarkdown()`

## Goal
Turn a normalized Jira issue into a structured Test Plan object, then render deterministic Markdown.

## Model
- `openai/gpt-oss-120b` (GROQ, FREE).
- Endpoint: `POST https://api.groq.com/openai/v1/chat/completions` (OpenAI-compatible).
- Auth: `Authorization: Bearer <GROQ_KEY>`.

## Logic
1. `buildMessages(issue)` — system prompt sets the QA-Lead persona + "do not fabricate" rule; user prompt carries the issue fields + the exact JSON schema.
2. `groqChat()` calls GROQ with `response_format: { type: "json_object" }`, `temperature: 0.3`.
3. Parse JSON; on parse failure throw `GROQ did not return valid JSON`.
4. `generateTestPlan()` defensively normalizes every key (arrays default to `[]`, strings to `TBD`).
5. `renderMarkdown()` deterministically builds the `.md` (no LLM in this step).

## The deterministic boundary (BLAST)
LLM = probabilistic content. Markdown layout, tables, and file I/O = deterministic code. Never let the LLM control formatting or file writes.

## Edge cases / learnings
- Free tier may rate-limit → surface `GROQ <status>` to the UI.
- Schema drift: defensive defaults in `generateTestPlan()` keep the renderer crash-proof.

## Output shape
See `gemini.md` §3d (Test Plan payload).
