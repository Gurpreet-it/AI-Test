import { useEffect, useMemo, useState } from 'react'
import UploadCard from './components/UploadCard.jsx'
import Report from './components/Report.jsx'
import Settings from './components/Settings.jsx'
import { DEFAULTS, analyze } from './lib/api.js'

const CFG_KEY = 'fta.cfg.v2'

function loadCfg() {
  try {
    const saved = JSON.parse(localStorage.getItem(CFG_KEY) || '{}')
    return { ...DEFAULTS, ...saved }
  } catch {
    return { ...DEFAULTS }
  }
}

export default function App() {
  const [cfg, setCfg] = useState(loadCfg)
  const [fileA, setFileA] = useState(null)
  const [fileB, setFileB] = useState(null)
  const [prompt, setPrompt] = useState(DEFAULTS.prompt)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [elapsed, setElapsed] = useState(null)

  useEffect(() => {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
  }, [cfg])

  // apiBase may be blank (= use the Vite proxy), so don't require it.
  const ready = useMemo(
    () => fileA && fileB && prompt.trim() && cfg.apiKey && !loading,
    [fileA, fileB, prompt, cfg, loading],
  )
  const targetLabel = cfg.apiBase || 'localhost:7861 (proxy)'

  async function run() {
    if (!ready) return
    setLoading(true)
    setError(null)
    setResult(null)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const sessionId = `ui-${Date.now()}`
      const res = await analyze(cfg, { fileA, fileB, prompt, sessionId })
      if (!res.text) throw new Error('Flow returned an empty response.')
      setResult(res)
      setElapsed(performance.now() - t0)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="grain" aria-hidden="true" />

      <header className="masthead">
        <div className="brand">
          <div className="brand-mark">⚑</div>
          <div className="brand-text">
            <h1>Flaky Test Analyzer</h1>
            <p>Compare two Playwright runs · LangFlow AI agent</p>
          </div>
        </div>
        <a className="powered" href={cfg.apiBase || 'http://localhost:7861'} target="_blank" rel="noreferrer">
          <span className="pulse" /> LangFlow
        </a>
      </header>

      <main className="stage">
        <Settings cfg={cfg} setCfg={setCfg} open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} />

        <div className="grid-two">
          <UploadCard index={1} label="Build A — baseline" file={fileA} onFile={setFileA} />
          <div className="vs">vs</div>
          <UploadCard index={2} label="Build B — candidate" file={fileB} onFile={setFileB} />
        </div>

        <div className="card prompt-card">
          <label className="prompt-label">
            <span className="card-tab-label">Instruction to the agent</span>
            <textarea
              className="prompt-input"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <button className={`run-btn ${ready ? '' : 'disabled'}`} onClick={run} disabled={!ready}>
            {loading ? (
              <>
                <span className="spinner" /> Analyzing…
              </>
            ) : (
              <>Run Analysis →</>
            )}
          </button>
        </div>

        {error && (
          <div className="card error-card">
            <strong>Request failed.</strong>
            <span>{error}</span>
            <span className="error-hint">
              Check that LangFlow is running ({targetLabel}) and the key / flow ID are correct (Connection panel).
            </span>
          </div>
        )}

        {loading && !result && (
          <div className="card skeleton-card">
            <div className="sk-line w40" />
            <div className="sk-line w90" />
            <div className="sk-line w80" />
            <div className="sk-line w60" />
          </div>
        )}

        {result && <Report result={result} elapsed={elapsed} />}

        {!result && !loading && !error && (
          <div className="empty-hint">
            <span className="empty-glyph">◇</span>
            Select two <code>results.json</code> files, then run the analysis.
          </div>
        )}
      </main>

      <footer className="page-foot">
        Local tool · talks directly to LangFlow · The Testing Academy
      </footer>
    </div>
  )
}
