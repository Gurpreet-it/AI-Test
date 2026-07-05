import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Report({ result, elapsed }) {
  const [copied, setCopied] = useState(false)
  const { text, usage, model } = result

  function copy() {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  function download() {
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flaky-analysis.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="report card">
      <header className="report-head">
        <div className="report-title">
          <span className="report-kicker">Diagnosis</span>
          <h2>Analysis Report</h2>
        </div>
        <div className="report-actions">
          <button className="ghost-btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
          <button className="ghost-btn" onClick={download}>Download .md</button>
        </div>
      </header>

      <div className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>

      <footer className="report-foot">
        {model && <span className="tag">model · {model}</span>}
        {usage && (
          <span className="tag">
            tokens · {usage.input_tokens}↑ {usage.output_tokens}↓ ({usage.total_tokens})
          </span>
        )}
        {elapsed != null && <span className="tag">latency · {(elapsed / 1000).toFixed(1)}s</span>}
      </footer>
    </section>
  )
}
