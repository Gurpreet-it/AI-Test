'use strict';
const ExcelJS = require('exceljs');

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

const WRAP_COLS = new Set(['test_steps', 'expected_result', 'test_description', 'preconditions', 'comments']);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = await readJson(req); }
  catch (err) { return res.status(400).json({ error: err.message }); }

  const { testCases, storyId } = body || {};
  if (!Array.isArray(testCases) || !testCases.length) {
    return res.status(400).json({ error: 'No test cases to export' });
  }

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator   = 'AI Test Case Generator';
    wb.created   = new Date();
    wb.modified  = new Date();

    const ws = wb.addWorksheet('Test Cases');
    ws.columns = COLS;

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2330' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height    = 22;

    // Freeze header row and enable auto-filter
    ws.views       = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }];
    ws.autoFilter  = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } };

    // Set word wrap on long-text columns
    COLS.forEach(c => {
      if (WRAP_COLS.has(c.key)) {
        ws.getColumn(c.key).alignment = { wrapText: true, vertical: 'top' };
      }
    });

    // Data rows
    testCases.forEach(tc => {
      const row = ws.addRow(
        COLS.reduce((obj, c) => { obj[c.key] = tc[c.key] || ''; return obj; }, {})
      );
      row.alignment = { vertical: 'top' };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const name   = `TestCase_${storyId || 'UNKNOWN'}_${date}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buffer));

  } catch (err) {
    res.status(500).json({ error: `Excel generation failed: ${err.message}` });
  }
};
