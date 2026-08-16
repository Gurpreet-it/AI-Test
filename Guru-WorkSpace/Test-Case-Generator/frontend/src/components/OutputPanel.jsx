import { useState, useMemo, useCallback, useEffect } from 'react';

const PAGE_SIZES = [10, 25, 50, 100];
const COLUMNS = [
  { key: 'tc_id',            label: 'TC ID',           width: 'col-id' },
  { key: 'story_id',         label: 'Story ID',        width: 'col-story' },
  { key: 'test_case_title',  label: 'Title',           width: 'col-title' },
  { key: 'test_description', label: 'Description',     width: 'col-desc' },
  { key: 'preconditions',    label: 'Preconditions',   width: 'col-pre' },
  { key: 'test_steps',       label: 'Test Steps',      width: 'col-steps' },
  { key: 'expected_result',  label: 'Expected Result', width: 'col-expected' },
  { key: 'actual_result',    label: 'Actual Result',   width: 'col-actual' },
  { key: 'status',           label: 'Status',          width: 'col-status' },
  { key: 'priority',         label: 'Priority',        width: 'col-priority' },
  { key: 'test_type',        label: 'Test Type',       width: 'col-type' },
  { key: 'comments',         label: 'Comments',        width: 'col-comments' },
];

function priorityClass(p) {
  if (!p) return '';
  return `priority-${p.toLowerCase()}`;
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="sort-icon" aria-hidden="true">↕</span>;
  return <span className="sort-icon active" aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function DetailModal({ tc, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <span className="tc-id" id="modal-title">{tc.tc_id}</span>
            <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-secondary)' }}>{tc.story_id}</span>
          </div>
          <div className="modal-badges">
            <span className={`priority-badge ${priorityClass(tc.priority)}`}>{tc.priority}</span>
            <span className="type-badge">{tc.test_type}</span>
            <button className="btn btn-icon btn-secondary" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="detail-row">
            <div className="detail-label">Test Case Title</div>
            <div className="detail-value detail-title">{tc.test_case_title}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Description</div>
            <div className="detail-value">{tc.test_description}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Preconditions</div>
            <div className="detail-value">{tc.preconditions || '—'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Test Steps</div>
            <div className="detail-value detail-steps">{tc.test_steps}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Expected Result</div>
            <div className="detail-value">{tc.expected_result}</div>
          </div>
          <div className="detail-grid">
            <div className="detail-row">
              <div className="detail-label">Actual Result</div>
              <div className="detail-value">{tc.actual_result}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Status</div>
              <div className="detail-value"><span className="status-badge">{tc.status}</span></div>
            </div>
          </div>
          {tc.comments && (
            <div className="detail-row">
              <div className="detail-label">Comments</div>
              <div className="detail-value">{tc.comments}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OutputPanel({ testCases, storyId, onClear }) {
  const [search,         setSearch]         = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType,     setFilterType]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [sortCol,        setSortCol]        = useState('tc_id');
  const [sortDir,        setSortDir]        = useState('asc');
  const [page,           setPage]           = useState(1);
  const [pageSize,       setPageSize]       = useState(10);
  const [selected,       setSelected]       = useState(null);
  const [downloading,    setDownloading]    = useState(false);
  const [dlError,        setDlError]        = useState('');

  // Unique filter values derived from data
  const priorities = useMemo(() => [...new Set(testCases.map(t => t.priority).filter(Boolean))].sort(), [testCases]);
  const types      = useMemo(() => [...new Set(testCases.map(t => t.test_type).filter(Boolean))].sort(), [testCases]);
  const statuses   = useMemo(() => [...new Set(testCases.map(t => t.status).filter(Boolean))].sort(), [testCases]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = testCases.filter(tc => {
      if (filterPriority && tc.priority  !== filterPriority) return false;
      if (filterType     && tc.test_type !== filterType)     return false;
      if (filterStatus   && tc.status    !== filterStatus)   return false;
      if (!q) return true;
      return COLUMNS.some(c => (tc[c.key] || '').toLowerCase().includes(q));
    });

    result = [...result].sort((a, b) => {
      const av = (a[sortCol] || '').toLowerCase();
      const bv = (b[sortCol] || '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return result;
  }, [testCases, search, filterPriority, filterType, filterStatus, sortCol, sortDir]);

  // Reset to page 1 when filters/search change
  useEffect(() => setPage(1), [search, filterPriority, filterType, filterStatus, sortCol]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const handleSort = useCallback((col) => {
    setSortDir(d => sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortCol(col);
  }, [sortCol]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDlError('');
    try {
      const res = await fetch('/api/download-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCases, storyId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Download failed');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href     = url;
      a.download = `TestCase_${storyId}_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDlError(err.message);
    } finally {
      setDownloading(false);
    }
  }, [testCases, storyId]);

  // Visible page numbers (window of 7)
  const pageNums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4)                return Array.from({ length: 7 }, (_, i) => i + 1);
    if (page >= totalPages - 3)   return Array.from({ length: 7 }, (_, i) => totalPages - 6 + i);
    return Array.from({ length: 7 }, (_, i) => page - 3 + i);
  }, [page, totalPages]);

  const startItem = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem   = Math.min(page * pageSize, filtered.length);

  return (
    <>
      <div className="card output-card">
        <div className="card-header">
          <span className="card-header-icon" aria-hidden="true">🧪</span>
          <h2>Generated Test Cases</h2>
          <span className="badge">{testCases.length} total</span>
        </div>

        {/* ── Toolbar ── */}
        <div className="output-toolbar" role="toolbar" aria-label="Filter and search controls">
          <input
            type="search"
            className="search-input"
            placeholder="Search test cases…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search all test case fields"
          />

          <select
            className="filter-select"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            className="filter-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            aria-label="Filter by test type"
          >
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <span className="result-count" aria-live="polite">
            {filtered.length < testCases.length
              ? <><strong>{filtered.length}</strong> of {testCases.length}</>
              : <><strong>{testCases.length}</strong> test cases</>}
          </span>

          <div className="toolbar-right">
            <select
              className="filter-select"
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              aria-label="Results per page"
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
            </select>

            <button
              className="btn btn-success"
              onClick={handleDownload}
              disabled={downloading}
              aria-label="Download all test cases as Excel file"
            >
              {downloading ? '⏳ Downloading…' : '⬇ Download Excel'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={onClear}
              aria-label="Clear all results"
            >
              ✕ Clear
            </button>
          </div>
        </div>

        {dlError && (
          <div className="messages-section">
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">❌</span> {dlError}
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="table-wrapper" role="region" aria-label="Test cases table" tabIndex={0}>
          {paged.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">🔍</div>
              <h3>No matching test cases</h3>
              <p>Adjust your search or filters to see results.</p>
            </div>
          ) : (
            <table className="test-case-table" aria-label={`Test cases — ${filtered.length} results`}>
              <thead>
                <tr>
                  {COLUMNS.map(({ key, label }) => (
                    <th
                      key={key}
                      className={`th-${key}`}
                      onClick={() => handleSort(key)}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleSort(key)}
                      tabIndex={0}
                      aria-sort={sortCol === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      title={`Sort by ${label}`}
                    >
                      {label}
                      <SortIcon col={key} sortCol={sortCol} sortDir={sortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(tc => (
                  <tr
                    key={tc.tc_id}
                    onClick={() => setSelected(tc)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelected(tc)}
                    tabIndex={0}
                    className="tc-row"
                    title="Click for full details"
                    aria-label={`${tc.tc_id}: ${tc.test_case_title}`}
                  >
                    <td><span className="tc-id">{tc.tc_id}</span></td>
                    <td><span className="cell-clamp">{tc.story_id}</span></td>
                    <td><span className="tc-title">{tc.test_case_title}</span></td>
                    <td><span className="cell-clamp">{tc.test_description}</span></td>
                    <td><span className="cell-clamp">{tc.preconditions}</span></td>
                    <td><span className="cell-steps">{tc.test_steps}</span></td>
                    <td><span className="cell-clamp">{tc.expected_result}</span></td>
                    <td><span className="cell-clamp">{tc.actual_result}</span></td>
                    <td><span className="status-badge">{tc.status}</span></td>
                    <td><span className={`priority-badge ${priorityClass(tc.priority)}`}>{tc.priority}</span></td>
                    <td><span className="type-badge">{tc.test_type}</span></td>
                    <td><span className="cell-clamp">{tc.comments}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Test case pagination">
            <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page">«</button>
            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1} aria-label="Previous page">‹</button>

            {pageNums.map(n => (
              <button
                key={n}
                className={`page-btn ${n === page ? 'active' : ''}`}
                onClick={() => setPage(n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? 'page' : undefined}
              >{n}</button>
            ))}

            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages} aria-label="Next page">›</button>
            <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Last page">»</button>

            <span className="page-info" aria-live="polite">
              {startItem}–{endItem} of {filtered.length}
            </span>
          </nav>
        )}
      </div>

      {/* ── Detail modal ── */}
      {selected && <DetailModal tc={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

export default OutputPanel;
