'use strict';
const { fetchJiraIssue } = require('./_lib/jira');

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = await readJson(req); }
  catch (err) { return res.status(400).json({ error: err.message }); }

  const storyId = (body?.storyId || '').trim().toUpperCase();
  if (!storyId) return res.status(400).json({ error: 'Story ID is required' });

  try {
    const issue = await fetchJiraIssue(storyId);
    res.status(200).json({
      success: true,
      story: {
        key:      issue.key,
        summary:  issue.fields.summary,
        status:   issue.fields.status?.name,
        priority: issue.fields.priority?.name,
        type:     issue.fields.issuetype?.name
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
