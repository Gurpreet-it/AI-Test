// Layer 3 Tool — Jira issue fetch + normalize. Atomic, deterministic.

// Recursively flatten Atlassian Document Format (ADF) into plain text.
function flattenAdf(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(flattenAdf).join('');

  let text = '';
  if (node.type === 'text' && typeof node.text === 'string') text += node.text;
  if (node.content) text += flattenAdf(node.content);

  // Add line breaks around block-level nodes so the text stays readable.
  if (['paragraph', 'heading', 'listItem', 'blockquote', 'bulletList', 'orderedList'].includes(node.type)) {
    text += '\n';
  }
  if (node.type === 'hardBreak' || node.type === 'rule') text += '\n';
  return text;
}

export function normalizeIssue(raw) {
  const f = raw.fields || {};
  const description = typeof f.description === 'string'
    ? f.description
    : flattenAdf(f.description).replace(/\n{3,}/g, '\n\n').trim();

  return {
    key: raw.key,
    summary: f.summary || '',
    description: description || '',
    issueType: f.issuetype?.name || 'Unknown',
    status: f.status?.name || 'Unknown',
    priority: f.priority?.name || 'Unspecified',
    components: (f.components || []).map((c) => c.name),
    labels: f.labels || [],
    fixVersions: (f.fixVersions || []).map((v) => v.name),
    reporter: f.reporter?.displayName || 'Unknown',
    assignee: f.assignee?.displayName || null,
  };
}

export async function fetchIssue(config, jiraId) {
  const base = (config.jiraUrl || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('Missing Jira base URL');
  if (!config.jiraEmail || !config.jiraToken) throw new Error('Missing Jira email or API token');
  if (!jiraId) throw new Error('Missing Jira ID');

  const fields = 'summary,description,issuetype,status,priority,labels,components,fixVersions,reporter,assignee';
  const url = `${base}/rest/api/3/issue/${encodeURIComponent(jiraId)}?fields=${fields}`;
  const auth = Buffer.from(`${config.jiraEmail}:${config.jiraToken}`).toString('base64');

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira ${res.status} fetching ${jiraId}: ${body.slice(0, 300)}`);
  }

  return normalizeIssue(await res.json());
}
