'use strict';
const axios = require('axios');

function jiraAuth() {
  const creds = `${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`;
  return 'Basic ' + Buffer.from(creds).toString('base64');
}

async function fetchJiraIssue(storyId) {
  const base = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('JIRA_BASE_URL is not configured');

  const fields = [
    'summary', 'description', 'status', 'priority', 'issuetype',
    'assignee', 'reporter', 'labels', 'components', 'fixVersions',
    'subtasks', 'comment', 'environment',
    'customfield_10015', // Acceptance Criteria (common)
    'customfield_10300', // Acceptance Criteria (alternate)
    'customfield_10016', // Story Points
    'customfield_10014', // Epic Link
  ].join(',');

  try {
    const { data } = await axios.get(
      `${base}/rest/api/3/issue/${storyId}?fields=${fields}`,
      {
        headers: { Authorization: jiraAuth(), Accept: 'application/json' },
        timeout: 15000
      }
    );
    return data;
  } catch (err) {
    if (err.response) {
      const s = err.response.status;
      if (s === 401) throw new Error('Jira authentication failed — check JIRA_EMAIL and JIRA_TOKEN');
      if (s === 403) throw new Error('Jira access denied — check account permissions');
      if (s === 404) throw new Error(`Story ID "${storyId}" was not found in Jira`);
      throw new Error(`Jira API error: HTTP ${s}`);
    }
    if (err.code === 'ECONNABORTED') throw new Error('Jira request timed out');
    if (err.code === 'ENOTFOUND')    throw new Error(`Cannot connect to Jira at ${base}`);
    throw new Error(`Jira connection failed: ${err.message}`);
  }
}

// Recursively extract plain text from Atlassian Document Format (ADF)
function extractADF(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'rule') return '\n---\n';
  if (Array.isArray(node.content)) {
    const parts = node.content.map(extractADF).filter(Boolean);
    const sep = [
      'paragraph', 'heading', 'bulletList', 'orderedList',
      'listItem', 'blockquote', 'codeBlock'
    ].includes(node.type) ? '\n' : '';
    return parts.join(sep);
  }
  return '';
}

function buildJiraContext(issue) {
  const f = issue.fields;
  const lines = [];

  lines.push(`STORY ID: ${issue.key}`);
  lines.push(`TITLE: ${f.summary || 'N/A'}`);
  lines.push(`STATUS: ${f.status?.name || 'N/A'}`);
  lines.push(`PRIORITY: ${f.priority?.name || 'N/A'}`);
  lines.push(`TYPE: ${f.issuetype?.name || 'N/A'}`);

  if (f.labels?.length)      lines.push(`LABELS: ${f.labels.join(', ')}`);
  if (f.components?.length)  lines.push(`COMPONENTS: ${f.components.map(c => c.name).join(', ')}`);
  if (f.fixVersions?.length) lines.push(`FIX VERSIONS: ${f.fixVersions.map(v => v.name).join(', ')}`);

  const desc = extractADF(f.description)?.trim();
  lines.push(`\nDESCRIPTION:\n${desc || 'No description provided'}`);

  for (const field of ['customfield_10015', 'customfield_10300']) {
    const raw = f[field];
    if (raw) {
      const text = typeof raw === 'string' ? raw : extractADF(raw);
      if (text?.trim()) { lines.push(`\nACCEPTANCE CRITERIA:\n${text.trim()}`); break; }
    }
  }

  if (f.environment) {
    const env = typeof f.environment === 'string' ? f.environment : extractADF(f.environment);
    if (env?.trim()) lines.push(`\nENVIRONMENT:\n${env.trim()}`);
  }

  const comments = f.comment?.comments || [];
  if (comments.length) {
    lines.push(`\nCOMMENTS (${comments.length} total — last ${Math.min(comments.length, 15)}):`);
    comments.slice(-15).forEach(c => {
      const body = extractADF(c.body)?.trim();
      if (body) lines.push(`• [${c.author?.displayName || 'Unknown'}]: ${body}`);
    });
  }

  if (f.subtasks?.length) {
    lines.push('\nSUBTASKS:');
    f.subtasks.forEach(s =>
      lines.push(`• ${s.key}: ${s.fields?.summary} (${s.fields?.status?.name})`)
    );
  }

  return lines.join('\n');
}

module.exports = { fetchJiraIssue, buildJiraContext, extractADF };
