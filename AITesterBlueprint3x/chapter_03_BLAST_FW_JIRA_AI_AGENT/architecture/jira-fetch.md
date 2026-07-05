# SOP — Jira Issue Fetch (Layer 1)

**Tool:** `tools/jiraClient.js` · `fetchIssue(config, jiraId)`

## Goal
Retrieve a single Jira Cloud issue and normalize it to a flat object the test-plan generator can consume.

## Inputs
- `config.jiraUrl` — e.g. `https://your-domain.atlassian.net` (trailing slashes stripped).
- `config.jiraEmail`, `config.jiraToken` — Basic auth pair.
- `jiraId` — issue key, e.g. `VWO-48`.

## Logic
1. Build `GET {jiraUrl}/rest/api/3/issue/{key}?fields=...` (only the fields we render).
2. Auth header: `Basic base64("email:token")`.
3. On non-2xx: throw `Jira <status> fetching <key>: <body slice>`.
4. Normalize via `normalizeIssue()`.

## Edge cases / learnings
- **ADF description:** API v3 returns `description` as Atlassian Document Format (nested JSON), not text. `flattenAdf()` walks `content` recursively, keeps `text` nodes, inserts newlines around block nodes (paragraph/heading/list/blockquote/rule/hardBreak).
- **CORS:** browsers cannot call this endpoint directly → must go through the Express proxy.
- **Missing optional fields:** `priority`, `assignee`, `components`, etc. may be absent → defaults applied.

## Output shape
See `gemini.md` §3c (normalized issue).
