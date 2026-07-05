import { useRef, useState } from 'react'
import { readPlaywrightSummary, fmtDuration } from '../lib/playwright.js'

export default function UploadCard({ index, label, file, onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [summary, setSummary] = useState(null)

  async function handle(f) {
    if (!f) return
    onFile(f)
    setSummary(await readPlaywrightSummary(f))
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handle(f)
  }

  function clear(e) {
    e.stopPropagation()
    onFile(null)
    setSummary(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={`card upload ${file ? 'has-file' : ''} ${dragging ? 'dragging' : ''}`}>
      <div className="card-tab">
        <span className="card-tab-num">{String(index).padStart(2, '0')}</span>
        <span className="card-tab-label">{label}</span>
        {file && <span className="ok-dot" title="loaded" />}
      </div>

      <button
        type="button"
        className="dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => handle(e.target.files?.[0])}
        />
        {!file ? (
          <div className="dz-empty">
            <div className="dz-icon">{'{ }'}</div>
            <div className="dz-title">Drop results JSON</div>
            <div className="dz-sub">or click to browse</div>
          </div>
        ) : (
          <div className="dz-filled">
            <div className="file-row">
              <span className="file-name" title={file.name}>{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
              <button className="chip-clear" onClick={clear} title="Remove">✕</button>
            </div>

            {summary?.valid ? (
              <div className="stat-grid">
                <Stat n={summary.passed} label="passed" tone="pass" />
                <Stat n={summary.failed} label="failed" tone="fail" />
                <Stat n={summary.flaky} label="flaky" tone="flaky" />
                <Stat n={summary.skipped} label="skipped" tone="skip" />
              </div>
            ) : (
              <div className="stat-note">
                {summary?.error ? summary.error : 'Non-Playwright JSON — will still be sent'}
              </div>
            )}

            {summary?.valid && (
              <div className="meta-row">
                <span>{summary.total} tests</span>
                <span className="dot-sep">·</span>
                <span>{fmtDuration(summary.durationMs)}</span>
                {summary.version && (
                  <>
                    <span className="dot-sep">·</span>
                    <span>PW {summary.version}</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  )
}

function Stat({ n, label, tone }) {
  return (
    <div className={`stat stat-${tone} ${n > 0 ? 'live' : ''}`}>
      <span className="stat-n">{n}</span>
      <span className="stat-l">{label}</span>
    </div>
  )
}
