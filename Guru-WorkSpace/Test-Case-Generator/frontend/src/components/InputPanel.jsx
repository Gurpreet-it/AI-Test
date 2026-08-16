import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_SCREENSHOTS = 20;
const MAX_FILE_MB = 20;
const ALLOWED_IMG = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

// Compress image to JPEG ≤1920 px wide at 82% quality; skip if already small
function compressImage(file) {
  if (file.size < 200 * 1024) return Promise.resolve(file);
  return new Promise(resolve => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_W = 1920;
      const ratio = Math.min(MAX_W / img.naturalWidth, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.floor(img.naturalWidth  * ratio);
      canvas.height = Math.floor(img.naturalHeight * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob && blob.size < file.size) {
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        } else {
          resolve(file);
        }
      }, 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function validateStoryId(val) {
  if (!val.trim()) return 'Story ID is required';
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$/.test(val.trim())) return 'Invalid Story ID format (example: HMA-1234)';
  return '';
}

function InputPanel({ onGenerate, onClear, generationState, error, warnings }) {
  const [storyId, setStoryId]               = useState('');
  const [storyErr, setStoryErr]             = useState('');
  const [pdf, setPdf]                       = useState(null);
  const [pdfErr, setPdfErr]                 = useState('');
  const [screenshots, setScreenshots]       = useState([]); // [{file, previewUrl}]
  const [imgErr, setImgErr]                 = useState('');
  const [pdfDrag, setPdfDrag]               = useState(false);
  const [imgDrag, setImgDrag]               = useState(false);

  const pdfRef  = useRef(null);
  const imgRef  = useRef(null);
  const screenshotsRef = useRef([]);

  // Keep ref in sync for unmount cleanup
  useEffect(() => { screenshotsRef.current = screenshots; }, [screenshots]);
  useEffect(() => () => screenshotsRef.current.forEach(s => URL.revokeObjectURL(s.previewUrl)), []);

  const isLoading = generationState === 'loading';

  // ── PDF ──────────────────────────────────────────────────────────────────
  const handlePdfFile = useCallback((file) => {
    setPdfErr('');
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setPdfErr('Only PDF files are accepted for the design document');
      return;
    }
    if (file.size > MAX_FILE_MB * 1048576) {
      setPdfErr(`PDF is too large (maximum ${MAX_FILE_MB} MB)`);
      return;
    }
    setPdf(file);
  }, []);

  const removePdf = useCallback(() => {
    setPdf(null);
    setPdfErr('');
    if (pdfRef.current) pdfRef.current.value = '';
  }, []);

  // ── Screenshots ──────────────────────────────────────────────────────────
  const handleImgFiles = useCallback(async (fileList) => {
    setImgErr('');
    const rejected = [];
    const validRaw = [];

    Array.from(fileList).forEach(f => {
      if (!ALLOWED_IMG.includes(f.type)) {
        rejected.push(`${f.name} (unsupported format)`);
      } else if (f.size > MAX_FILE_MB * 1048576) {
        rejected.push(`${f.name} (too large)`);
      } else {
        validRaw.push(f);
      }
    });

    if (rejected.length) setImgErr(`Skipped: ${rejected.join(', ')}`);

    // Compress before storing — keeps total upload under Vercel's 4.5 MB limit
    const compressed = await Promise.all(validRaw.map(compressImage));

    setScreenshots(prev => {
      const combined = [...prev, ...compressed.map(f => ({ file: f, previewUrl: URL.createObjectURL(f) }))];
      return combined.slice(0, MAX_SCREENSHOTS);
    });
  }, []);

  const removeScreenshot = useCallback((idx) => {
    setScreenshots(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const err = validateStoryId(storyId);
    if (err) { setStoryErr(err); return; }

    const formData = new FormData();
    formData.append('storyId', storyId.trim().toUpperCase());
    if (pdf) formData.append('pdf', pdf);
    screenshots.forEach(s => formData.append('screenshots', s.file));

    onGenerate(formData);
  }, [storyId, pdf, screenshots, onGenerate]);

  // ── Clear ────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setStoryId('');
    setStoryErr('');
    setPdf(null);
    setPdfErr('');
    screenshots.forEach(s => URL.revokeObjectURL(s.previewUrl));
    setScreenshots([]);
    setImgErr('');
    if (pdfRef.current) pdfRef.current.value = '';
    if (imgRef.current) imgRef.current.value = '';
    onClear();
  }, [screenshots, onClear]);

  // ── Keyboard helpers ─────────────────────────────────────────────────────
  const onKeyActivate = (fn) => (e) => (e.key === 'Enter' || e.key === ' ') && fn();

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-header-icon">📋</span>
        <h2>Test Case Input</h2>
        {generationState === 'success' && <span className="badge badge-success">Generated</span>}
      </div>

      <div className="card-body">
        {/* ── Story ID ── */}
        <div className="form-group">
          <label className="form-label" htmlFor="story-id">
            Jira Story ID <span className="required">*</span>
          </label>
          <input
            id="story-id"
            type="text"
            className={`form-input ${storyErr ? 'is-error' : ''}`}
            placeholder="e.g., HMA-1234"
            value={storyId}
            maxLength={60}
            onChange={e => { setStoryId(e.target.value); if (storyErr) setStoryErr(''); }}
            onBlur={() => setStoryErr(validateStoryId(storyId))}
            disabled={isLoading}
            aria-required="true"
            aria-describedby={storyErr ? 'story-id-error' : undefined}
            aria-invalid={!!storyErr}
            autoFocus
          />
          {storyErr && (
            <div className="form-error" id="story-id-error" role="alert">
              <span>⚠</span> {storyErr}
            </div>
          )}
        </div>

        <div className="input-grid">
          {/* ── Design Document ── */}
          <div className="form-group">
            <label className="form-label">Design Document <span className="optional">(PDF)</span></label>

            {!pdf ? (
              <div
                className={`drop-zone ${pdfDrag ? 'dragover' : ''}`}
                role="button"
                tabIndex={0}
                aria-label="Upload PDF design document — click or drag and drop"
                onClick={() => pdfRef.current?.click()}
                onKeyDown={onKeyActivate(() => pdfRef.current?.click())}
                onDragOver={e => { e.preventDefault(); setPdfDrag(true); }}
                onDragLeave={() => setPdfDrag(false)}
                onDrop={e => { e.preventDefault(); setPdfDrag(false); handlePdfFile(e.dataTransfer.files[0]); }}
              >
                <div className="drop-zone-icon" aria-hidden="true">📄</div>
                <div className="drop-zone-text"><strong>Click to upload</strong> or drag and drop</div>
                <div className="drop-zone-hint">PDF only · Max {MAX_FILE_MB} MB</div>
              </div>
            ) : (
              <div className="file-item" role="status">
                <span className="file-item-icon" aria-hidden="true">📄</span>
                <div className="file-item-info">
                  <div className="file-item-name" title={pdf.name}>{pdf.name}</div>
                  <div className="file-item-size">{fmtSize(pdf.size)}</div>
                </div>
                <button
                  className="file-remove-btn"
                  onClick={removePdf}
                  aria-label={`Remove ${pdf.name}`}
                  title="Remove"
                  disabled={isLoading}
                >✕</button>
              </div>
            )}

            <input
              ref={pdfRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={e => handlePdfFile(e.target.files[0])}
              disabled={isLoading}
              aria-hidden="true"
              tabIndex={-1}
            />
            {pdfErr && <div className="form-error" role="alert"><span>⚠</span> {pdfErr}</div>}
          </div>

          {/* ── Screenshots ── */}
          <div className="form-group">
            <label className="form-label">
              UI Screenshots <span className="optional">(up to {MAX_SCREENSHOTS})</span>
            </label>

            <div
              className={`drop-zone ${imgDrag ? 'dragover' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Upload screenshots — click or drag and drop"
              onClick={() => imgRef.current?.click()}
              onKeyDown={onKeyActivate(() => imgRef.current?.click())}
              onDragOver={e => { e.preventDefault(); setImgDrag(true); }}
              onDragLeave={() => setImgDrag(false)}
              onDrop={e => { e.preventDefault(); setImgDrag(false); handleImgFiles(e.dataTransfer.files); }}
            >
              <div className="drop-zone-icon" aria-hidden="true">🖼️</div>
              <div className="drop-zone-text"><strong>Click to upload</strong> or drag and drop</div>
              <div className="drop-zone-hint">PNG, JPG, WEBP, GIF · Max {MAX_FILE_MB} MB each</div>
            </div>

            <input
              ref={imgRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleImgFiles(e.target.files)}
              disabled={isLoading}
              aria-hidden="true"
              tabIndex={-1}
            />

            {imgErr && <div className="form-error" role="alert"><span>⚠</span> {imgErr}</div>}

            {screenshots.length > 0 && (
              <>
                <div className="screenshots-grid" aria-label="Uploaded screenshots">
                  {screenshots.map((s, i) => (
                    <div key={i} className="screenshot-thumb" title={s.file.name}>
                      <img src={s.previewUrl} alt={s.file.name} loading="lazy" />
                      <button
                        className="thumb-remove"
                        onClick={() => removeScreenshot(i)}
                        aria-label={`Remove screenshot ${s.file.name}`}
                        disabled={isLoading}
                      >✕</button>
                    </div>
                  ))}
                </div>
                <div className="screenshot-count" aria-live="polite">
                  {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''} selected
                  {screenshots.length === MAX_SCREENSHOTS && ' (maximum reached)'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Status messages ── */}
      {error && (
        <div className="messages-section">
          <div className="alert alert-error" role="alert">
            <span className="alert-icon" aria-hidden="true">❌</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {warnings?.length > 0 && (
        <div className="messages-section">
          {warnings.map((w, i) => (
            <div key={i} className="alert alert-warning" role="alert">
              <span className="alert-icon" aria-hidden="true">⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {generationState === 'success' && !error && (
        <div className="messages-section">
          <div className="alert alert-success" role="status">
            <span className="alert-icon" aria-hidden="true">✅</span>
            <span>Test cases generated successfully. See results below.</span>
          </div>
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="action-bar">
        {isLoading ? (
          <div className="generating-state" aria-live="polite" aria-busy="true">
            <div className="spinner" role="status" aria-label="Generating test cases"></div>
            <div>
              <div className="progress-label">
                Generating test cases
                <span className="progress-dots" aria-hidden="true">
                  <span /><span /><span />
                </span>
              </div>
              <div className="progress-sub">Fetching Jira · Analysing documents · Running AI</div>
            </div>
          </div>
        ) : (
          <>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={isLoading}
              aria-label="Generate test cases"
            >
              <span aria-hidden="true">⚡</span> Generate Test Cases
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleClear}
              disabled={isLoading}
              aria-label="Clear all inputs and results"
            >
              <span aria-hidden="true">↺</span> Clear / Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default InputPanel;
