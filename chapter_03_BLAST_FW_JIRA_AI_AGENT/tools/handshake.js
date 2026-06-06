// Phase 2 (L - Link) verification. Run: npm run handshake [JIRA-ID]
// Confirms .env creds reach Jira and GROQ before any full logic runs.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchIssue } from './jiraClient.js';
import { groqChat } from './groqClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  jiraUrl: process.env.JIRA_URL || '',
  jiraEmail: process.env.JIRA_EMAIL || '',
  jiraToken: process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN || '',
  groqKey: process.env.GROQ_KEY || '',
};

const jiraId = process.argv[2] || 'VWO-48';

async function main() {
  let ok = true;

  console.log('— Jira handshake —');
  try {
    const issue = await fetchIssue(config, jiraId);
    console.log(`  PASS: ${issue.key} — "${issue.summary}"`);
  } catch (e) {
    ok = false;
    console.log(`  FAIL: ${e.message}`);
  }

  console.log('— GROQ handshake —');
  try {
    const r = await groqChat(
      config,
      [{ role: 'user', content: 'Reply with the JSON {"ok":true} and nothing else.' }],
      { json: true, temperature: 0 },
    );
    console.log(`  PASS: ${JSON.stringify(r)}`);
  } catch (e) {
    ok = false;
    console.log(`  FAIL: ${e.message}`);
  }

  console.log(ok ? '\nLINK OK ✅' : '\nLINK BROKEN ❌ (fill .env or check credentials)');
  process.exit(ok ? 0 : 1);
}

main();
