// Thin client for the LangFlow Flaky Test Analyzer flow.
//
// Two calls per analysis:
//   1) upload each JSON file -> POST /api/v1/files/upload/{flowId}  -> returns a server file_path
//   2) run the flow          -> POST /api/v1/run/{flowId}?stream=false  with those paths as tweaks
//
// The flow has two File components. These IDs were read from the live flow
// definition (GET /api/v1/flows/{flowId}); they are overridable from Settings.
export const DEFAULTS = {
  // Blank => same-origin requests that go through the Vite dev proxy
  // (see vite.config.js). This avoids LangFlow's broken upload-preflight CORS.
  // Set to a full URL (e.g. http://localhost:7861) to call LangFlow directly.
  apiBase: '',
  // Left blank on purpose — never commit a real key to a public repo.
  // Paste your LangFlow x-api-key in the Connection panel (saved to localStorage),
  // or set VITE_API_KEY in a local .env (gitignored).
  apiKey: import.meta.env.VITE_API_KEY || '',
  flowId: 'a468f029-e319-4ed4-bbc9-27836ac4cdc1',
  fileIdA: 'File-daKW7',
  fileIdB: 'File-IKmcY',
  prompt:
    'Analyze these two Playwright runs and tell me which build has the most failing/flaky test.',
}

function trimBase(base) {
  return (base || '').replace(/\/+$/, '')
}

async function readError(res) {
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.detail || body?.message || JSON.stringify(body)
  } catch {
    try {
      detail = await res.text()
    } catch {
      detail = ''
    }
  }
  return `${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`
}

// Uploads one file and returns the server-relative path to feed into tweaks.
export async function uploadFile({ apiBase, apiKey, flowId }, file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${trimBase(apiBase)}/api/v1/files/upload/${flowId}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  })
  if (!res.ok) throw new Error(`Upload failed for "${file.name}": ${await readError(res)}`)
  const data = await res.json()
  if (!data?.file_path) throw new Error(`Upload of "${file.name}" returned no file_path`)
  return data.file_path
}

// Runs the flow with the two uploaded paths and a prompt. Returns the raw response.
export async function runFlow(cfg, { pathA, pathB, prompt, sessionId }) {
  const { apiBase, apiKey, flowId, fileIdA, fileIdB } = cfg
  const res = await fetch(`${trimBase(apiBase)}/api/v1/run/${flowId}?stream=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      output_type: 'chat',
      input_type: 'text',
      input_value: prompt,
      session_id: sessionId,
      tweaks: {
        [fileIdA]: { path: [pathA] },
        [fileIdB]: { path: [pathB] },
      },
    }),
  })
  if (!res.ok) throw new Error(`Analysis failed: ${await readError(res)}`)
  return res.json()
}

// Digs the assistant text + token usage out of LangFlow's deeply nested response.
export function parseResult(resp) {
  const out = resp?.outputs?.[0]?.outputs?.[0]
  const message = out?.results?.message
  const text =
    message?.text ??
    out?.artifacts?.message ??
    out?.outputs?.message?.message ??
    out?.messages?.[0]?.message ??
    ''
  const usage = message?.properties?.usage || null
  const model = message?.properties?.source?.source || message?.properties?.source?.display_name || null
  return { text, usage, model, sessionId: resp?.session_id || null }
}

// Full pipeline used by the UI.
export async function analyze(cfg, { fileA, fileB, prompt, sessionId }) {
  const [pathA, pathB] = await Promise.all([
    uploadFile(cfg, fileA),
    uploadFile(cfg, fileB),
  ])
  const raw = await runFlow(cfg, { pathA, pathB, prompt, sessionId })
  return { ...parseResult(raw), raw, pathA, pathB }
}
