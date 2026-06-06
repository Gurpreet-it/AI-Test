// Layer 3 Tool — build the prompt, generate the plan via GROQ, render deterministic Markdown.
// Boundary rule (BLAST): GROQ produces CONTENT (JSON); Markdown rendering is deterministic code.
import { groqChat } from './groqClient.js';

const SCHEMA_HINT = `Return ONLY a JSON object with EXACTLY these keys:
{
  "testPlanId": string,                 // e.g. "TP-<KEY>"
  "sourceIssue": string,                // the Jira key
  "title": string,                      // "Test Plan — <summary>"
  "objective": string,
  "scope": { "inScope": string[], "outOfScope": string[] },
  "inclusions": string[],
  "testEnvironments": string[],
  "defectReporting": string,
  "testStrategy": string[],
  "schedule": [ { "phase": string, "owner": string, "dates": string } ],
  "deliverables": string[],
  "entryCriteria": string[],
  "exitCriteria": string[],
  "tools": string[],
  "risks": [ { "risk": string, "mitigation": string } ],
  "approvals": [ { "role": string, "name": string } ]
}`;

export function buildMessages(issue) {
  const system = [
    'You are a senior QA Lead writing a FORMAL software Test Plan.',
    'Base everything strictly on the provided Jira issue.',
    'If information is missing, use "TBD" — never invent specific facts (names, dates, versions).',
    'Be concrete, professional, and concise. Output strictly valid JSON.',
  ].join(' ');

  const user = [
    'Create a formal Test Plan for the following Jira issue.',
    '',
    `Key: ${issue.key}`,
    `Summary: ${issue.summary}`,
    `Type: ${issue.issueType} | Status: ${issue.status} | Priority: ${issue.priority}`,
    `Components: ${issue.components.join(', ') || 'none'}`,
    `Labels: ${issue.labels.join(', ') || 'none'}`,
    `Fix Versions: ${issue.fixVersions.join(', ') || 'none'}`,
    `Reporter: ${issue.reporter} | Assignee: ${issue.assignee || 'Unassigned'}`,
    '',
    'Description / Acceptance Criteria:',
    issue.description || '(none provided)',
    '',
    SCHEMA_HINT,
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

const arr = (v) => (Array.isArray(v) ? v : []);

export async function generateTestPlan(config, issue) {
  const plan = await groqChat(config, buildMessages(issue), { json: true, temperature: 0.3 });

  // Defensive normalization so the renderer never crashes on a missing key.
  return {
    testPlanId: plan.testPlanId || `TP-${issue.key}`,
    sourceIssue: plan.sourceIssue || issue.key,
    title: plan.title || `Test Plan — ${issue.summary}`,
    objective: plan.objective || 'TBD',
    scope: {
      inScope: arr(plan.scope?.inScope),
      outOfScope: arr(plan.scope?.outOfScope),
    },
    inclusions: arr(plan.inclusions),
    testEnvironments: arr(plan.testEnvironments),
    defectReporting: plan.defectReporting || 'TBD',
    testStrategy: arr(plan.testStrategy),
    schedule: arr(plan.schedule),
    deliverables: arr(plan.deliverables),
    entryCriteria: arr(plan.entryCriteria),
    exitCriteria: arr(plan.exitCriteria),
    tools: arr(plan.tools),
    risks: arr(plan.risks),
    approvals: arr(plan.approvals),
  };
}

function bullets(list) {
  if (!list || !list.length) return ['- TBD'];
  return list.map((i) => `- ${i}`);
}

export function renderMarkdown(plan, issue) {
  const L = [];
  L.push(`# ${plan.title}`, '');
  L.push(`**Test Plan ID:** ${plan.testPlanId}  `);
  L.push(`**Source Issue:** ${plan.sourceIssue}  `);
  L.push(`**Issue Type:** ${issue.issueType} | **Priority:** ${issue.priority} | **Status:** ${issue.status}  `);
  L.push('');

  L.push('## 1. Objective', '', plan.objective, '');

  L.push('## 2. Scope', '');
  L.push('**In Scope**', '', ...bullets(plan.scope.inScope), '');
  L.push('**Out of Scope**', '', ...bullets(plan.scope.outOfScope), '');

  L.push('## 3. Inclusions', '', ...bullets(plan.inclusions), '');
  L.push('## 4. Test Environments', '', ...bullets(plan.testEnvironments), '');
  L.push('## 5. Defect Reporting', '', plan.defectReporting, '');
  L.push('## 6. Test Strategy', '', ...bullets(plan.testStrategy), '');

  L.push('## 7. Schedule', '');
  if (plan.schedule.length) {
    L.push('| Phase | Owner | Dates |', '| --- | --- | --- |');
    plan.schedule.forEach((s) => L.push(`| ${s.phase || 'TBD'} | ${s.owner || 'TBD'} | ${s.dates || 'TBD'} |`));
  } else L.push('TBD');
  L.push('');

  L.push('## 8. Deliverables', '', ...bullets(plan.deliverables), '');
  L.push('## 9. Entry Criteria', '', ...bullets(plan.entryCriteria), '');
  L.push('## 10. Exit Criteria', '', ...bullets(plan.exitCriteria), '');
  L.push('## 11. Tools', '', ...bullets(plan.tools), '');

  L.push('## 12. Risks & Mitigations', '');
  if (plan.risks.length) {
    L.push('| Risk | Mitigation |', '| --- | --- |');
    plan.risks.forEach((r) => L.push(`| ${r.risk || 'TBD'} | ${r.mitigation || 'TBD'} |`));
  } else L.push('TBD');
  L.push('');

  L.push('## 13. Approvals', '');
  if (plan.approvals.length) {
    L.push('| Role | Name |', '| --- | --- |');
    plan.approvals.forEach((a) => L.push(`| ${a.role || 'TBD'} | ${a.name || 'TBD'} |`));
  } else L.push('TBD');

  L.push('', '---', `_Generated from ${plan.sourceIssue} via GROQ (${'openai/gpt-oss-120b'}). Review before use._`);
  return L.join('\n');
}
