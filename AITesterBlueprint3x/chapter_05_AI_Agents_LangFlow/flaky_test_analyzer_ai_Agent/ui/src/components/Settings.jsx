import { useState } from 'react'

const FIELDS = [
  { key: 'apiBase', label: 'LangFlow base URL (blank = dev proxy)', type: 'text' },
  { key: 'apiKey', label: 'x-api-key', type: 'secret' },
  { key: 'flowId', label: 'Flow ID', type: 'text' },
  { key: 'fileIdA', label: 'File component A', type: 'text' },
  { key: 'fileIdB', label: 'File component B', type: 'text' },
]

export default function Settings({ cfg, setCfg, open, onToggle }) {
  const [reveal, setReveal] = useState(false)

  return (
    <div className={`settings ${open ? 'open' : ''}`}>
      <button className="settings-toggle" onClick={onToggle}>
        <span className="gear">⚙</span> Connection
        <span className="caret">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="settings-body">
          {FIELDS.map((f) => (
            <label className="field" key={f.key}>
              <span className="field-label">{f.label}</span>
              <input
                className="field-input mono"
                type={f.type === 'secret' && !reveal ? 'password' : 'text'}
                value={cfg[f.key]}
                onChange={(e) => setCfg({ ...cfg, [f.key]: e.target.value })}
                spellCheck={false}
              />
              {f.type === 'secret' && (
                <button type="button" className="reveal" onClick={() => setReveal((v) => !v)}>
                  {reveal ? 'hide' : 'show'}
                </button>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
