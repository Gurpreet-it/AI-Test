import { useState, useEffect, useCallback } from "react";
import "./App.css";

const API = "http://localhost:8000";

// ── Utility ──────────────────────────────────────────────────────────────────

const api = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
};

// ── Pipeline Flow Diagram ─────────────────────────────────────────────────────

const INGEST_STEPS = [
  { id: "pdf",    icon: "📄", label: "PDF File" },
  { id: "extract",icon: "📝", label: "Extract Text" },
  { id: "chunk",  icon: "✂️",  label: "Chunking" },
  { id: "embed",  icon: "🔢", label: "Nomic Embed" },
  { id: "store",  icon: "🗄️", label: "ChromaDB" },
];

const QUERY_STEPS = [
  { id: "question", icon: "❓", label: "Question" },
  { id: "qembed",   icon: "🔢", label: "Embed Query" },
  { id: "search",   icon: "🔍", label: "Search DB" },
  { id: "retrieve", icon: "📋", label: "Top-4 Chunks" },
  { id: "llm",      icon: "🤖", label: "Groq LLM" },
  { id: "answer",   icon: "💬", label: "Answer" },
];

function PipelineStep({ icon, label, active, done, isLast, direction = "right" }) {
  return (
    <div className="pipeline-step-wrap">
      <div className={`pipeline-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
        <span className="pipeline-icon">{icon}</span>
        <span className="pipeline-label">{label}</span>
      </div>
      {!isLast && (
        <span className={`pipeline-arrow ${direction === "left" ? "arrow-left" : ""}`}>
          {direction === "left" ? "◄" : "►"}
        </span>
      )}
    </div>
  );
}

function PipelineFlow({ ingestActive, ingestDone, queryActive, queryDone }) {
  return (
    <div className="pipeline-container">
      <div className="pipeline-row">
        <span className="pipeline-row-label ingest-label">INGEST</span>
        {INGEST_STEPS.map((s, i) => (
          <PipelineStep
            key={s.id}
            {...s}
            active={ingestActive === s.id}
            done={ingestDone.includes(s.id)}
            isLast={i === INGEST_STEPS.length - 1}
          />
        ))}
      </div>
      <div className="pipeline-row">
        <span className="pipeline-row-label query-label">QUERY</span>
        {QUERY_STEPS.map((s, i) => (
          <PipelineStep
            key={s.id}
            {...s}
            active={queryActive === s.id}
            done={queryDone.includes(s.id)}
            isLast={i === QUERY_STEPS.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ── Status Bar ────────────────────────────────────────────────────────────────

function StatusBar({ status }) {
  const dot = (ok) => (
    <span className={`status-dot ${ok ? "ok" : "error"}`}>{ok ? "●" : "●"}</span>
  );
  if (!status) return <div className="status-bar">Checking system status…</div>;

  return (
    <div className="status-bar">
      {dot(status.ollama.ok)}
      <span>Ollama</span>
      {dot(status.ollama.nomic_available)}
      <span>Nomic Embed</span>
      {dot(status.chromadb.ok)}
      <span>ChromaDB ({status.chromadb.chunks} chunks)</span>
      {dot(status.groq.ok)}
      <span>Groq ({status.groq.model})</span>
      {!status.ready && (
        <span className="status-warning">⚠ System not fully ready — check setup</span>
      )}
    </div>
  );
}

// ── Ingestion Panel ───────────────────────────────────────────────────────────

function IngestPanel({ onIngestDone, onPipelineUpdate }) {
  const [files,    setFiles]    = useState([]);
  const [selected, setSelected] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState("");
  const [chunks,   setChunks]   = useState([]);

  useEffect(() => {
    api("/data/files").then(d => {
      setFiles(d.files);
      if (d.files.length > 0) setSelected(d.files[0].name);
    }).catch(() => {});
  }, []);

  const INGEST_IDS = ["pdf", "extract", "chunk", "embed", "store"];

  const ingest = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    setResult(null);
    setChunks([]);

    // Animate pipeline steps
    for (let i = 0; i < INGEST_IDS.length; i++) {
      onPipelineUpdate({ ingestActive: INGEST_IDS[i], ingestDone: INGEST_IDS.slice(0, i) });
      if (i < INGEST_IDS.length - 1) await new Promise(r => setTimeout(r, 400));
    }

    try {
      const data = await api(`/ingest?filename=${encodeURIComponent(selected)}`, { method: "POST" });
      setResult(data);
      setChunks(data.chunks || []);
      onPipelineUpdate({ ingestActive: null, ingestDone: INGEST_IDS });
      onIngestDone();
    } catch (e) {
      setError(e.message);
      onPipelineUpdate({ ingestActive: null, ingestDone: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel ingest-panel">
      <h2>📥 Ingestion</h2>

      {files.length === 0 ? (
        <div className="empty-state">
          No PDF files found in <code>data/</code> folder.<br />
          Drop a PDF there and refresh.
        </div>
      ) : (
        <div className="file-selector">
          <label>PDF File</label>
          <select value={selected} onChange={e => setSelected(e.target.value)}>
            {files.map(f => (
              <option key={f.name} value={f.name}>{f.name} ({f.size_kb} KB)</option>
            ))}
          </select>
        </div>
      )}

      <button
        className="btn primary"
        onClick={ingest}
        disabled={loading || !selected}
      >
        {loading ? "⏳ Ingesting…" : "🚀 Ingest PDF"}
      </button>

      {error && <div className="error-box">❌ {error}</div>}

      {result && (
        <div className="ingest-stats">
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-val">{result.total_chars.toLocaleString()}</span>
              <span className="stat-lbl">Characters</span>
            </div>
            <div className="stat">
              <span className="stat-val">{result.chunk_count}</span>
              <span className="stat-lbl">Chunks</span>
            </div>
            <div className="stat">
              <span className="stat-val">{result.chunk_size}</span>
              <span className="stat-lbl">Chunk Size</span>
            </div>
            <div className="stat">
              <span className="stat-val">{result.overlap}</span>
              <span className="stat-lbl">Overlap</span>
            </div>
          </div>

          {chunks.length > 0 && (
            <div className="chunk-list">
              <h3>Chunks stored in ChromaDB</h3>
              <div className="chunk-scroll">
                {chunks.map((c) => (
                  <div key={c.id} className="chunk-card">
                    <div className="chunk-header">
                      <span className="chunk-id">{c.id}</span>
                      <span className="chunk-chars">{c.chars} chars</span>
                    </div>
                    <p className="chunk-preview">{c.preview}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Query Panel ────────────────────────────────────────────────────────────────

const QUERY_IDS = ["question", "qembed", "search", "retrieve", "llm", "answer"];

function QueryPanel({ onPipelineUpdate }) {
  const [question, setQuestion] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState("");

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    // Animate steps up to "retrieve" while waiting
    for (let i = 0; i < QUERY_IDS.length - 1; i++) {
      onPipelineUpdate({ queryActive: QUERY_IDS[i], queryDone: QUERY_IDS.slice(0, i) });
      await new Promise(r => setTimeout(r, 350));
    }

    try {
      const data = await api("/query", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question, top_k: 4 }),
      });
      setResult(data);
      onPipelineUpdate({ queryActive: null, queryDone: QUERY_IDS });
    } catch (e) {
      setError(e.message);
      onPipelineUpdate({ queryActive: null, queryDone: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
  };

  return (
    <div className="panel query-panel">
      <h2>🔍 Query</h2>

      <div className="query-input-row">
        <textarea
          className="query-input"
          placeholder="Ask a question about the document…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          rows={3}
        />
        <button
          className="btn primary ask-btn"
          onClick={ask}
          disabled={loading || !question.trim()}
        >
          {loading ? "⏳" : "Ask"}
        </button>
      </div>

      {error && <div className="error-box">❌ {error}</div>}

      {result && (
        <div className="results">
          {/* Retrieved Chunks */}
          <div className="section">
            <h3>📋 Top {result.chunks_used} Retrieved Chunks</h3>
            <div className="retrieved-grid">
              {result.retrieved_chunks.map((c, i) => (
                <div key={c.id} className="retrieved-chunk">
                  <div className="rc-header">
                    <span className="rc-rank">#{i + 1}</span>
                    <span className="rc-id">{c.id}</span>
                    <span className="rc-sim" title="Cosine similarity">
                      {(c.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <div className="rc-meta">
                    Source: {c.metadata?.source || "—"}
                  </div>
                  <p className="rc-text">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* LLM Answer */}
          <div className="section answer-section">
            <h3>🤖 Answer <span className="model-badge">{result.model}</span></h3>
            <div className="answer-box">
              {result.answer.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chunks Viewer ─────────────────────────────────────────────────────────────

function ChunksViewer({ triggerRefresh }) {
  const [chunks,   setChunks]   = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page,     setPage]     = useState(0);
  const PAGE = 50;

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const data = await api(`/chunks?limit=${PAGE}&offset=${p * PAGE}`);
      setChunks(data.chunks || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch {
      setChunks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load, triggerRefresh]);

  const filtered = chunks.filter(c =>
    !search || c.text.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search)
  );

  const pages = Math.ceil(total / PAGE);

  return (
    <div className="chunks-viewer">
      {/* Toolbar */}
      <div className="cv-toolbar">
        <div className="cv-stats">
          <span className="cv-total">{total}</span>
          <span className="cv-total-lbl">chunks in ChromaDB</span>
          {search && <span className="cv-filtered">· {filtered.length} matching</span>}
        </div>
        <input
          className="cv-search"
          placeholder="🔍  Filter chunks by text or ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn primary cv-refresh" onClick={() => load(0)} disabled={loading}>
          {loading ? "⏳" : "↻ Refresh"}
        </button>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="cv-pagination">
          <button className="btn" onClick={() => load(page - 1)} disabled={page === 0}>‹ Prev</button>
          <span className="cv-page-info">Page {page + 1} / {pages}</span>
          <button className="btn" onClick={() => load(page + 1)} disabled={page >= pages - 1}>Next ›</button>
        </div>
      )}

      {/* Chunk list */}
      {total === 0 && !loading ? (
        <div className="empty-state">No chunks found. Ingest a PDF first.</div>
      ) : (
        <div className="cv-list">
          {filtered.map(c => (
            <div
              key={c.id}
              className={`cv-row ${expanded === c.id ? "cv-row-open" : ""}`}
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <div className="cv-row-header">
                <span className="chunk-id">{c.id}</span>
                <span className="cv-source">{c.metadata?.source || "—"}</span>
                <span className="cv-chars">{c.text.length} chars</span>
                <span className="cv-toggle">{expanded === c.id ? "▲" : "▼"}</span>
              </div>
              <p className={`cv-text ${expanded === c.id ? "cv-text-full" : "cv-text-preview"}`}>
                {c.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "explorer", label: "🔬 Explorer" },
  { id: "chunks",   label: "🗄️ Chunks DB" },
];

export default function App() {
  const [sysStatus,    setSysStatus]    = useState(null);
  const [activeTab,    setActiveTab]    = useState("explorer");
  const [ingestActive, setIngestActive] = useState(null);
  const [ingestDone,   setIngestDone]   = useState([]);
  const [queryActive,  setQueryActive]  = useState(null);
  const [queryDone,    setQueryDone]    = useState([]);
  const [chunkRefresh, setChunkRefresh] = useState(0);

  const refreshStatus = useCallback(() => {
    api("/status").then(setSysStatus).catch(() => setSysStatus(null));
  }, []);

  useEffect(() => {
    refreshStatus();
    const t = setInterval(refreshStatus, 10000);
    return () => clearInterval(t);
  }, [refreshStatus]);

  const handleIngestPipeline = ({ ingestActive: ia, ingestDone: id }) => {
    setIngestActive(ia);
    setIngestDone(id ?? []);
  };

  const handleQueryPipeline = ({ queryActive: qa, queryDone: qd }) => {
    setQueryActive(qa);
    setQueryDone(qd ?? []);
  };

  const handleIngestDone = () => {
    refreshStatus();
    setChunkRefresh(n => n + 1);   // trigger ChunksViewer reload
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-title">
          <span className="logo">⚡</span>
          <h1>RAG Explorer</h1>
          <span className="subtitle">Retrieval-Augmented Generation — End-to-End Demo</span>
        </div>
        <StatusBar status={sysStatus} />
      </header>

      {/* Pipeline Diagram */}
      <PipelineFlow
        ingestActive={ingestActive}
        ingestDone={ingestDone}
        queryActive={queryActive}
        queryDone={queryDone}
      />

      {/* Tab Bar */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? "tab-active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "explorer" && (
        <div className="panels">
          <IngestPanel
            onIngestDone={handleIngestDone}
            onPipelineUpdate={handleIngestPipeline}
          />
          <QueryPanel
            onPipelineUpdate={handleQueryPipeline}
          />
        </div>
      )}

      {activeTab === "chunks" && (
        <div className="tab-content">
          <ChunksViewer triggerRefresh={chunkRefresh} />
        </div>
      )}
    </div>
  );
}
