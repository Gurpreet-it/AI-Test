// Layer 2 — Navigation. Express proxy: routes request -> jiraClient -> testPlan(groqClient) -> response.
// Also fixes browser CORS to Jira and keeps the API token server-side.
import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchIssue } from './tools/jiraClient.js';
import { generateTestPlan, renderMarkdown } from './tools/testPlan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 8787;
const app = express();
app.use(express.json({ limit: '1mb' }));

function envConfig() {
  return {
    jiraUrl: process.env.JIRA_URL || '',
    jiraEmail: process.env.JIRA_EMAIL || '',
    jiraToken: process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN || '',
    groqKey: process.env.GROQ_KEY || '',
  };
}

// UI-provided non-empty values override .env defaults.
function mergeConfig(body = {}) {
  const env = envConfig();
  const c = body.config || {};
  return {
    jiraUrl: (c.jiraUrl || '').trim() || env.jiraUrl,
    jiraEmail: (c.jiraEmail || '').trim() || env.jiraEmail,
    jiraToken: (c.jiraToken || '').trim() || env.jiraToken,
    groqKey: (c.groqKey || '').trim() || env.groqKey,
  };
}

// Non-secret config presence, so the UI can prefill + warn.
app.get('/api/config', (_req, res) => {
  const env = envConfig();
  res.json({
    jiraUrl: env.jiraUrl,
    jiraEmail: env.jiraEmail,
    hasJiraToken: Boolean(env.jiraToken),
    hasGroqKey: Boolean(env.groqKey),
  });
});

app.post('/api/generate', async (req, res) => {
  try {
    const jiraId = (req.body?.jiraId || '').trim();
    if (!jiraId) return res.status(400).json({ error: 'Missing jiraId' });

    const config = mergeConfig(req.body);
    const issue = await fetchIssue(config, jiraId);
    const plan = await generateTestPlan(config, issue);
    const markdown = renderMarkdown(plan, issue);

    res.json({ issue, plan, markdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save', (req, res) => {
  try {
    const jiraId = (req.body?.jiraId || 'plan').trim().replace(/[^A-Za-z0-9_-]/g, '_');
    const markdown = req.body?.markdown || '';
    const dir = path.join(__dirname, 'output');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `test-plan-${jiraId}.md`), markdown, 'utf8');
    res.json({ path: `output/test-plan-${jiraId}.md` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the built frontend in production (after `npm run build`).
const dist = path.join(__dirname, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`[server] proxy listening on http://localhost:${PORT}`));
