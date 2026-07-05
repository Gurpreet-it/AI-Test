# Flaky Test Analyzer — UI

Lightweight React (Vite) front-end for the LangFlow **Flaky Test Analyzer** AI agent.
Pick two Playwright `results.json` files (Build A vs Build B), hit **Run Analysis**, and read
the agent's flaky / consistent-failure / rerun report rendered as clean markdown.

![Flaky Test Analyzer UI](docs/screenshot.png)

## How it works

The browser calls a same-origin `/api/...` path which **Vite proxies to LangFlow**
(`vite.config.js`). This is required because LangFlow's file-upload endpoint does not
answer the browser's CORS preflight, so a direct cross-origin upload fails with
"Failed to fetch". The proxy makes every request same-origin, sidestepping CORS:

1. **Upload** each file → `POST /api/v1/files/upload/{flowId}` → returns a server `file_path`.
2. **Run** the flow → `POST /api/v1/run/{flowId}?stream=false` with the two paths injected as
   `tweaks` on the flow's File components (`File-daKW7`, `File-IKmcY`).
3. Pull the assistant text out of `outputs[0].outputs[0].results.message.text` and render it.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173). LangFlow must be running at
`http://localhost:7861` with the agent flow imported.

## Configuration

Connection settings (base URL, `x-api-key`, flow ID, File component IDs) are editable in the
**Connection** panel and persist in `localStorage`. The base URL, flow ID and File component IDs
are prefilled; the **`x-api-key` is blank by default** — paste it in the panel, or set
`VITE_API_KEY` in a local `.env` (gitignored). The key is never committed. Defaults live in
`src/lib/api.js`.

## Files

| Path | Purpose |
|------|---------|
| `src/App.jsx` | Layout + run pipeline orchestration |
| `src/lib/api.js` | LangFlow upload + run + response parsing |
| `src/lib/playwright.js` | Parses `results.json` for the per-file stat preview |
| `src/components/UploadCard.jsx` | Drag/drop file card with pass/fail/flaky preview |
| `src/components/Report.jsx` | Markdown report + token usage + copy/download |
| `src/components/Settings.jsx` | Editable connection settings |
