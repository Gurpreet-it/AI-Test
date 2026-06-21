// Best-effort preview of a Playwright JSON reporter file.
// Returns null if the file isn't recognizable Playwright output, so the UI
// can still upload + analyze any JSON the flow accepts.
export async function readPlaywrightSummary(file) {
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    const s = json?.stats
    if (!s || typeof s !== 'object') return { valid: false, raw: json }
    const total =
      (s.expected || 0) + (s.unexpected || 0) + (s.flaky || 0) + (s.skipped || 0)
    return {
      valid: true,
      passed: s.expected || 0,
      failed: s.unexpected || 0,
      flaky: s.flaky || 0,
      skipped: s.skipped || 0,
      total,
      durationMs: s.duration || 0,
      version: json?.config?.version || null,
      startTime: s.startTime || null,
    }
  } catch {
    return { valid: false, error: 'Not valid JSON' }
  }
}

export function fmtDuration(ms) {
  if (!ms && ms !== 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  const sec = ms / 1000
  if (sec < 60) return `${sec.toFixed(1)} s`
  const m = Math.floor(sec / 60)
  const rem = Math.round(sec % 60)
  return `${m}m ${rem}s`
}
