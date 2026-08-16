'use strict';
const Busboy     = require('busboy');
const pdfParse   = require('pdf-parse');
const OpenAI     = require('openai');
const { fetchJiraIssue, buildJiraContext } = require('./_lib/jira');
const { buildSystemPrompt, buildUserPrompt } = require('./_lib/prompt');

const MAX_BODY_BYTES = 4 * 1024 * 1024; // 4 MB — stay under Vercel's 4.5 MB limit

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files  = { screenshots: [] };
    let totalBytes = 0;

    const bb = Busboy({
      headers: req.headers,
      limits: { fileSize: MAX_BODY_BYTES, files: 21 }
    });

    bb.on('field', (name, val) => { fields[name] = val; });

    bb.on('file', (fieldname, stream, info) => {
      const chunks = [];
      stream.on('data', d => {
        totalBytes += d.length;
        if (totalBytes > MAX_BODY_BYTES) {
          stream.destroy();
          return reject(new Error('Total upload size exceeds 4 MB. Compress your images and try again.'));
        }
        chunks.push(d);
      });
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const { filename, mimeType } = info;
        if (fieldname === 'pdf') {
          files.pdf = { buffer, filename, mimeType };
        } else if (fieldname === 'screenshots') {
          files.screenshots.push({ buffer, filename, mimeType });
        }
      });
    });

    bb.on('close', () => resolve({ fields, files }));
    bb.on('error', err => reject(new Error(`Upload parsing failed: ${err.message}`)));

    req.pipe(bb);
  });
}

function normaliseTestCase(tc, storyId, idx) {
  return {
    tc_id:            tc.tc_id            || `TC-${storyId}-${String(idx + 1).padStart(3, '0')}`,
    story_id:         tc.story_id         || storyId,
    test_case_title:  tc.test_case_title  || '',
    test_description: tc.test_description || '',
    preconditions:    tc.preconditions    || '',
    test_steps:       tc.test_steps       || '',
    expected_result:  tc.expected_result  || '',
    actual_result:    tc.actual_result    || 'TBD',
    status:           tc.status           || 'Not Executed',
    priority:         tc.priority         || 'Medium',
    test_type:        tc.test_type        || 'Functional',
    comments:         tc.comments         || ''
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Parse multipart form ─────────────────────────────────────────────────
  let fields, files;
  try {
    ({ fields, files } = await parseMultipart(req));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const storyId = (fields.storyId || '').trim().toUpperCase();
  if (!storyId) return res.status(400).json({ error: 'Story ID is required' });

  const warnings = [];

  // ── 1. Jira ───────────────────────────────────────────────────────────────
  let jiraContext = '';
  try {
    const issue = await fetchJiraIssue(storyId);
    jiraContext  = buildJiraContext(issue);
  } catch (err) {
    warnings.push(`Jira: ${err.message}`);
    jiraContext = `JIRA FETCH FAILED: ${err.message}\nStory ID: ${storyId}\nProceeding with available inputs only.`;
  }

  // ── 2. PDF text ───────────────────────────────────────────────────────────
  let pdfText = '';
  if (files.pdf) {
    try {
      const parsed = await pdfParse(files.pdf.buffer);
      pdfText = (parsed.text || '').trim();
      if (!pdfText) {
        pdfText = '[PDF has no extractable text — may be image-based or scanned]';
        warnings.push('PDF text extraction returned empty.');
      }
    } catch {
      pdfText = '[PDF processing failed — file may be corrupted or password-protected]';
      warnings.push('PDF could not be parsed.');
    }
  }

  // ── 3. Images ─────────────────────────────────────────────────────────────
  const imageContents = (files.screenshots || []).map(img => ({
    type: 'image_url',
    image_url: {
      url: `data:${img.mimeType};base64,${img.buffer.toString('base64')}`,
      detail: 'high'
    }
  }));

  // ── 4. OpenAI ─────────────────────────────────────────────────────────────
  try {
    const openai = new OpenAI({ apiKey: process.env.OpenAi });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 16000,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildUserPrompt(storyId, jiraContext, pdfText, imageContents.length) },
            ...imageContents
          ]
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content || '';

    let testCases;
    try {
      testCases = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!match) throw new Error('AI did not return a valid JSON array');
      testCases = JSON.parse(match[0]);
    }

    if (!Array.isArray(testCases) || !testCases.length) {
      throw new Error('AI returned an empty or invalid test case list');
    }

    testCases = testCases.map((tc, i) => normaliseTestCase(tc, storyId, i));

    res.status(200).json({ success: true, storyId, testCases, count: testCases.length, warnings });

  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('insufficient_quota'))  return res.status(429).json({ error: 'OpenAI quota exceeded. Check your API key billing.' });
    if (msg.includes('rate_limit_exceeded')) return res.status(429).json({ error: 'OpenAI rate limit reached. Wait a moment and retry.' });
    if (msg.includes('context_length'))      return res.status(400).json({ error: 'Input too large for the AI model. Reduce PDF or screenshot count.' });
    return res.status(500).json({ error: `AI generation failed: ${msg}` });
  }
};
