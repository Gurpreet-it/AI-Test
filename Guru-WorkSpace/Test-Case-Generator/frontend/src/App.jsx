import { useState, useCallback } from 'react';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const [theme,           setTheme]           = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [testCases,       setTestCases]       = useState([]);
  const [storyId,         setStoryId]         = useState('');
  const [generationState, setGenerationState] = useState('idle'); // idle | loading | success | error
  const [error,           setError]           = useState(null);
  const [warnings,        setWarnings]        = useState([]);

  const toggleTheme = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), []);

  const handleGenerate = useCallback(async (formData) => {
    setGenerationState('loading');
    setError(null);
    setWarnings([]);
    setTestCases([]);

    try {
      const res = await fetch('/api/generate', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error: HTTP ${res.status}`);

      setTestCases(data.testCases || []);
      setStoryId(data.storyId || '');
      setGenerationState('success');
      if (data.warnings?.length) setWarnings(data.warnings);
    } catch (err) {
      setError(err.message);
      setGenerationState('error');
    }
  }, []);

  const handleClear = useCallback(() => {
    setTestCases([]);
    setStoryId('');
    setGenerationState('idle');
    setError(null);
    setWarnings([]);
  }, []);

  const isIdle = generationState === 'idle' && testCases.length === 0;

  return (
    <div className="app" data-theme={theme}>

      {/* ── Branded header — always dark gradient, text always white ── */}
      <header className="app-header" role="banner">
        <div className="header-content">
          <div className="header-brand">
            <div className="header-logo" aria-hidden="true">
              <span className="header-logo-inner">⚡</span>
            </div>
            <div className="header-text">
              <div className="header-title-row">
                <h1 className="header-title">AI Test Case Generator</h1>
                <span className="header-model-badge">GPT-4o</span>
              </div>
              <span className="header-subtitle">Evidence-based QA</span>
            </div>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div className="header-glow" aria-hidden="true" />
      </header>

      <main className="app-main" role="main">

        {/* ── Hero banner — visible only before first generation ── */}
        {isIdle && (
          <div className="hero">
            <p className="hero-eyebrow">Powered by OpenAI GPT-4o Vision</p>
            <h2 className="hero-headline">From story to test suite in seconds</h2>
            <p className="hero-body">
              Connect your Jira story, upload a design document and UI screenshots —
              GPT-4o analyses every source and generates comprehensive, evidence-based test cases.
            </p>
            <div className="hero-chips" aria-label="Features">
              {[
                ['📋', 'Jira Integration'],
                ['📄', 'PDF Analysis'],
                ['🖼️', 'Vision AI'],
                ['📊', 'Excel Export'],
                ['🌙', 'Dark Mode'],
              ].map(([icon, label]) => (
                <span key={label} className="hero-chip">
                  <span aria-hidden="true">{icon}</span> {label}
                </span>
              ))}
            </div>
          </div>
        )}

        <InputPanel
          onGenerate={handleGenerate}
          onClear={handleClear}
          generationState={generationState}
          error={error}
          warnings={warnings}
        />

        {generationState === 'success' && testCases.length > 0 && (
          <OutputPanel
            testCases={testCases}
            storyId={storyId}
            onClear={handleClear}
          />
        )}
      </main>

      <footer className="app-footer" role="contentinfo">
        AI Test Case Generator &nbsp;·&nbsp; Evidence-based QA
      </footer>
    </div>
  );
}

export default App;
