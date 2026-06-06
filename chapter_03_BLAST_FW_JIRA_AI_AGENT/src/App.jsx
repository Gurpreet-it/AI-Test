import React, { useEffect, useState } from 'react';
import Settings from './components/Settings.jsx';
import Generator from './components/Generator.jsx';
import { getConfigStatus } from './lib/api.js';

const STORAGE_KEY = 'blast.jira.config';
const emptyConfig = { jiraUrl: '', jiraEmail: '', jiraToken: '', groqKey: '' };

export default function App() {
  const [tab, setTab] = useState('generate');
  const [config, setConfig] = useState(() => {
    try {
      return { ...emptyConfig, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
      return emptyConfig;
    }
  });
  const [envStatus, setEnvStatus] = useState(null);

  useEffect(() => {
    getConfigStatus().then(setEnvStatus).catch(() => setEnvStatus(null));
  }, []);

  function saveConfig(next) {
    setConfig(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🚀</span>
          <div>
            <h1>Jira → Test Plan Generator</h1>
            <p className="sub">B.L.A.S.T. · GROQ <code>openai/gpt-oss-120b</code></p>
          </div>
        </div>
        <nav className="tabs">
          <button className={tab === 'generate' ? 'active' : ''} onClick={() => setTab('generate')}>Generate</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>
        </nav>
      </header>

      <main className="content">
        {tab === 'generate' ? (
          <Generator config={config} envStatus={envStatus} goSettings={() => setTab('settings')} />
        ) : (
          <Settings config={config} onSave={saveConfig} envStatus={envStatus} />
        )}
      </main>

      <footer className="foot">Lightweight React · Express proxy · credentials stay local</footer>
    </div>
  );
}
