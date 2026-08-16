'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const ExcelJS = require('exceljs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', apiLimiter);

// ─── File upload ────────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 21 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdf') {
      if (file.mimetype !== 'application/pdf') {
        return cb(new Error('Only PDF files are accepted for design documents'));
      }
    } else if (file.fieldname === 'screenshots') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return cb(new Error(`Unsupported image type: ${file.originalname}`));
      }
    }
    cb(null, true);
  }
});

// ─── OpenAI client ──────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OpenAi });

// ─── Jira helpers ───────────────────────────────────────────────────────────
function jiraAuthHeader() {
  const creds = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`).toString('base64');
  return `Basic ${creds}`;
}

async function fetchJiraIssue(storyId) {
  const base = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('JIRA_BASE_URL is not configured');

  const fields = [
    'summary', 'description', 'status', 'priority', 'issuetype',
    'assignee', 'reporter', 'labels', 'components', 'fixVersions',
    'subtasks', 'comment', 'environment',
    'customfield_10015', // Acceptance Criteria (common field)
    'customfield_10300', // Acceptance Criteria (alternate)
    'customfield_10016', // Story Points
    'customfield_10014', // Epic Link
  ].join(',');

  try {
    const { data } = await axios.get(
      `${base}/rest/api/3/issue/${storyId}?fields=${fields}`,
      {
        headers: { Authorization: jiraAuthHeader(), Accept: 'application/json' },
        timeout: 20000
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
    if (err.code === 'ENOTFOUND') throw new Error(`Cannot connect to Jira at ${base}`);
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
    const sep = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock'].includes(node.type) ? '\n' : '';
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

  // Acceptance Criteria — try known custom fields
  for (const field of ['customfield_10015', 'customfield_10300']) {
    const raw = f[field];
    if (raw) {
      const text = typeof raw === 'string' ? raw : extractADF(raw);
      if (text?.trim()) {
        lines.push(`\nACCEPTANCE CRITERIA:\n${text.trim()}`);
        break;
      }
    }
  }

  if (f.environment) {
    const env = typeof f.environment === 'string' ? f.environment : extractADF(f.environment);
    if (env?.trim()) lines.push(`\nENVIRONMENT:\n${env.trim()}`);
  }

  // Recent comments (last 15)
  const comments = f.comment?.comments || [];
  if (comments.length) {
    lines.push(`\nCOMMENTS (${comments.length} total — showing last ${Math.min(comments.length, 15)}):`);
    comments.slice(-15).forEach(c => {
      const body = extractADF(c.body)?.trim();
      if (body) lines.push(`• [${c.author?.displayName || 'Unknown'}]: ${body}`);
    });
  }

  // Subtasks
  if (f.subtasks?.length) {
    lines.push(`\nSUBTASKS:`);
    f.subtasks.forEach(s => {
      lines.push(`• ${s.key}: ${s.fields?.summary} (${s.fields?.status?.name})`);
    });
  }

  return lines.join('\n');
}

// ─── OpenAI prompt ──────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are a Senior QA Automation & Manual Test Engineer with deep expertise in enterprise and marketing applications, functional testing, UI testing, security testing, accessibility testing, and regression testing.

Your task: Generate comprehensive, evidence-based test cases for a software feature.

## CRITICAL RULES
1. Base test cases ONLY on information from the Jira story, design document, and screenshots.
2. DO NOT invent requirements, field limits, business rules, UI elements, or validations not present in the source material.
3. If a boundary is not explicitly defined, do NOT invent one.
4. Every test case must be unique — remove all semantic duplicates.
5. Minimum 30 test cases when evidence supports it. More for complex features.

## COVERAGE PRIORITIES (in order)
1. Functional (happy path, alternative flows, business rules, acceptance criteria, subtasks)
2. UI (layout, labels, controls, messages, states visible in screenshots)
3. Field Validation (only for documented fields — never invent limits)
4. Negative (missing inputs, invalid inputs, unauthorized ops, error recovery)
5. Boundary (only for explicitly defined boundaries)
6. Navigation / Usability
7. Accessibility (keyboard, focus, screen reader, contrast — where applicable)
8. Security (auth, authorization, XSS, SQLi, CSRF — only where applicable)
9. Regression (for identified affected areas only)
10. Integration (for documented integrations only)

## PRIORITY DEFINITIONS
- Critical: data loss, security impact, critical business rule failure, blocking
- High: major functional failure, acceptance criteria failure, validation failure
- Medium: UI issues, navigation, error messages, non-critical functional
- Low: cosmetic, minor visual

## TEST CASE WRITING RULES
- Titles: specific and scenario-oriented. Never "Test button" — always "Verify that [user action] [produces observable outcome]"
- Test steps: sequential, action-oriented, specific, reproducible
- Expected results: specific, observable, measurable. Never "system works correctly"
- Use ONLY behavior supported by the source material

## REQUIRED OUTPUT FORMAT
Return ONLY a valid JSON array — no markdown, no code fences, no text outside the array.

[
  {
    "tc_id": "TC-{STORYID}-001",
    "story_id": "{STORYID}",
    "test_case_title": "...",
    "test_description": "...",
    "preconditions": "...",
    "test_steps": "1. Step one\\n2. Step two\\n3. Step three",
    "expected_result": "...",
    "actual_result": "TBD",
    "status": "Not Executed",
    "priority": "Critical|High|Medium|Low",
    "test_type": "Functional|UI|Validation|Negative|Boundary|Security|Accessibility|Regression|Integration|Usability",
    "comments": ""
  }
]

Use sequential IDs: TC-{STORYID}-001, TC-{STORYID}-002, etc.
No additional text outside the JSON array.`;
}

function buildUserPrompt(storyId, jiraContext, pdfText, imageCount) {
  let prompt = `Generate comprehensive test cases for the following feature.\n\n`;
  prompt += `=== JIRA STORY ===\n${jiraContext}\n\n`;

  if (pdfText) {
    prompt += `=== DESIGN DOCUMENT (extracted text) ===\n${pdfText.slice(0, 40000)}\n\n`;
  } else {
    prompt += `=== DESIGN DOCUMENT ===\nNot provided.\n\n`;
  }

  if (imageCount > 0) {
    prompt += `=== UI SCREENSHOTS ===\n${imageCount} screenshot(s) attached. Analyze every visible UI element — buttons, inputs, labels, tables, messages, navigation, icons, tooltips, states.\n\n`;
  } else {
    prompt += `=== UI SCREENSHOTS ===\nNone provided.\n\n`;
  }

  prompt += `Generate test cases for Story ID: ${storyId}\n`;
  prompt += `Test Case IDs must follow the format: TC-${storyId}-001, TC-${storyId}-002 ...\n`;
  prompt += `Return ONLY the JSON array. No other text.`;
  return prompt;
}

// ─── Routes ─────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Verify a Jira story before generating
app.post('/api/fetch-jira', async (req, res) => {
  const storyId = (req.body?.storyId || '').trim().toUpperCase();
  if (!storyId) return res.status(400).json({ error: 'Story ID is required' });

  try {
    const issue = await fetchJiraIssue(storyId);
    res.json({
      success: true,
      story: {
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        priority: issue.fields.priority?.name,
        type: issue.fields.issuetype?.name
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Main generation endpoint
app.post('/api/generate',
  upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'screenshots', maxCount: 20 }]),
  async (req, res) => {
    const storyId = (req.body?.storyId || '').trim().toUpperCase();
    if (!storyId) return res.status(400).json({ error: 'Story ID is required' });

    const warnings = [];

    // 1. Jira
    let jiraContext = '';
    try {
      const issue = await fetchJiraIssue(storyId);
      jiraContext = buildJiraContext(issue);
    } catch (err) {
      warnings.push(`Jira: ${err.message}`);
      jiraContext = `JIRA FETCH FAILED: ${err.message}\nStory ID requested: ${storyId}\nProceeding with design document and screenshots only.`;
    }

    // 2. PDF text
    let pdfText = '';
    if (req.files?.pdf?.[0]) {
      try {
        const parsed = await pdfParse(req.files.pdf[0].buffer);
        pdfText = (parsed.text || '').trim();
        if (!pdfText) {
          pdfText = '[PDF uploaded but contains no extractable text — may be a scanned/image-based PDF]';
          warnings.push('PDF appears to be image-based; text extraction returned empty.');
        }
      } catch {
        pdfText = '[PDF processing failed — file may be corrupted or password-protected]';
        warnings.push('PDF could not be parsed.');
      }
    }

    // 3. Encode screenshots for OpenAI vision
    const imageContents = [];
    if (req.files?.screenshots) {
      for (const img of req.files.screenshots) {
        imageContents.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimetype};base64,${img.buffer.toString('base64')}`,
            detail: 'high'
          }
        });
      }
    }

    // 4. Call OpenAI
    try {
      const userContent = [
        { type: 'text', text: buildUserPrompt(storyId, jiraContext, pdfText, imageContents.length) },
        ...imageContents
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 16000,
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: userContent }
        ]
      });

      const raw = completion.choices[0]?.message?.content || '';

      // Robust JSON extraction
      let testCases;
      try {
        testCases = JSON.parse(raw);
      } catch {
        const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!match) throw new Error('AI did not return a valid JSON array');
        testCases = JSON.parse(match[0]);
      }

      if (!Array.isArray(testCases) || testCases.length === 0) {
        throw new Error('AI returned an empty or invalid test case list');
      }

      // Normalise and validate each test case
      testCases = testCases.map((tc, i) => ({
        tc_id:            tc.tc_id            || `TC-${storyId}-${String(i + 1).padStart(3, '0')}`,
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
      }));

      res.json({ success: true, storyId, testCases, count: testCases.length, warnings });

    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('insufficient_quota'))  return res.status(429).json({ error: 'OpenAI quota exceeded. Check your API key billing.' });
      if (msg.includes('rate_limit_exceeded')) return res.status(429).json({ error: 'OpenAI rate limit reached. Wait a moment and try again.' });
      if (msg.includes('context_length'))      return res.status(400).json({ error: 'Input is too large for the AI model. Reduce PDF or screenshot count.' });
      return res.status(500).json({ error: `AI generation failed: ${msg}` });
    }
  }
);

// Excel download
app.post('/api/download-excel', async (req, res) => {
  const { testCases, storyId } = req.body || {};
  if (!Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({ error: 'No test cases to export' });
  }

  try {
    const COLS = [
      { header: 'TC ID',            key: 'tc_id',            width: 18 },
      { header: 'Story ID',         key: 'story_id',         width: 14 },
      { header: 'Test Case Title',  key: 'test_case_title',  width: 52 },
      { header: 'Test Description', key: 'test_description', width: 40 },
      { header: 'Preconditions',    key: 'preconditions',    width: 32 },
      { header: 'Test Steps',       key: 'test_steps',       width: 60 },
      { header: 'Expected Result',  key: 'expected_result',  width: 44 },
      { header: 'Actual Result',    key: 'actual_result',    width: 20 },
      { header: 'Status',           key: 'status',           width: 16 },
      { header: 'Priority',         key: 'priority',         width: 12 },
      { header: 'Test Type',        key: 'test_type',        width: 20 },
      { header: 'Comments',         key: 'comments',         width: 32 },
    ];

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Test Cases');
    ws.columns = COLS;

    // Style header row
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2330' } };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(1).height = 22;

    // Freeze header row and enable auto-filter
    ws.views = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }];
    ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + COLS.length)}1` };

    // Wrap-text columns: test_steps, expected_result, test_description
    const wrapCols = ['test_steps', 'expected_result', 'test_description', 'preconditions', 'comments'];
    wrapCols.forEach(key => {
      ws.getColumn(key).alignment = { wrapText: true, vertical: 'top' };
    });

    // Data rows
    testCases.forEach(tc => {
      const row = ws.addRow(COLS.reduce((o, c) => { o[c.key] = tc[c.key] || ''; return o; }, {}));
      row.alignment = { vertical: 'top' };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `TestCase_${storyId || 'UNKNOWN'}_${date}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buffer));

  } catch (err) {
    res.status(500).json({ error: `Excel generation failed: ${err.message}` });
  }
});

// ─── Error handler (multer + generic) ───────────────────────────────────────
app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Maximum 20 MB per file.' });
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) return res.status(400).json({ error: err.message });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
