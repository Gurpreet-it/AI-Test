import React, { useState } from 'react';
import { generatePlan, savePlan } from '../lib/api.js';
import TestPlanView from './TestPlanView.jsx';

export default function Generator({ config, envStatus, goSettings }) {
  const [jiraId, setJiraId] = useState('VWO-48');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [savedPath, setSavedPath] = useState('');

  const hasJira =
    (config.jiraUrl || envStatus?.jiraUrl) &&
    (config.jiraEmail || envStatus?.jiraEmail) &&
    (config.jiraToken || envStatus?.hasJiraToken);
  const hasGroq = config.groqKey || envStatus?.hasGroqKey;
  const ready = Boolean(hasJira && hasGroq);

  async function onGenerate(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setSavedPath('');
    setLoading(true);
    try {
      const data = await generatePlan(jiraId.trim(), config);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-plan-${jiraId.trim()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveServer() {
    setError('');
    try {
      const r = await savePlan(jiraId.trim(), result.markdown);
      setSavedPath(r.path);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <h2>Generate Test Plan</h2>

      {!ready && (
        <div className="warn">
          Missing credentials. <button className="link" onClick={goSettings}>Open Settings</button> or fill the
          server <code>.env</code>.
        </div>
      )}

      <form onSubmit={onGenerate} className="genrow">
        <input
          className="jira-input"
          value={jiraId}
          onChange={(e) => setJiraId(e.target.value)}
          placeholder="VWO-48"
          spellCheck="false"
        />
        <button type="submit" className="primary" disabled={loading || !jiraId.trim()}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {loading && <div className="loader">Fetching issue + asking GROQ…</div>}
      {error && <div className="error">⚠ {error}</div>}

      {result && (
        <>
          <div className="actions">
            <button onClick={download} className="ghost">⬇ Download .md</button>
            <button onClick={saveServer} className="ghost">💾 Save to server</button>
            {savedPath && (
              <span className="ok">
                Saved → <code>{savedPath}</code>
              </span>
            )}
          </div>
          <TestPlanView plan={result.plan} issue={result.issue} markdown={result.markdown} />
        </>
      )}
    </section>
  );
}
