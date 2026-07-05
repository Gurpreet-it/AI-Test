# Chapter 04 - n8n AI Agents for QA

Importable n8n workflows and local AI-agent examples for QA automation, content workflows, Jira, Google Sheets, Slack, Microsoft Teams, and CSV-driven batch processing.

## Workflows

| File | Purpose |
|------|---------|
| `n8n_AIAgent/AI_3X_01_QA_Buddy.json` | Chat-triggered QA assistant using a GROQ-backed Qwen model node. |
| `n8n_AIAgent/AI_3X_02_JIRA_Agent.json` | Chat agent with a Jira tool for creating tickets in the configured project. |
| `n8n_AIAgent/AI_3X_03_Read_PRD_TestCases_Excel.json` | Fetches PRD or ticket context, generates test cases, and appends/updates Google Sheets rows. |
| `n8n_AIAgent/AI_3X_04_Read_PRD_TestCases_Excel_v2.json` | Adds CSV upload and batch Jira-ticket processing to the PRD-to-test-cases workflow. |

## Local Projects

| Folder | Purpose |
|--------|---------|
| `social_ai_agent/contentforge/` | Local Next.js + TypeScript dashboard that runs a daily content-generation pipeline, writes `content_calendar.xlsx`, and stores generated images under `public/images/`. |
| `skillfile_content_generation/` | Markdown-based content engine skill and dated output packs for The Testing Academy content. |

## ContentForge

`social_ai_agent/contentforge/` is a single-machine React/Next.js app for generating a complete content package from one topic.

It includes:

- Topic generation with Groq.
- LinkedIn, Medium, Instagram, YouTube, and Dev.to content generation.
- Gemini image generation for Medium, LinkedIn, and Instagram assets.
- Local Excel persistence in `content_calendar.xlsx`.
- A dashboard with live status, calendar table, Excel write log, image previews, and workbook download.

Run it locally:

```bash
cd social_ai_agent/contentforge
npm install
cp .env.example .env.local
npm run dev
```

Add local keys in `.env.local` or `.env`:

```bash
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

Do not commit `.env`, `.env.local`, generated workbooks, `.next`, or `node_modules`.

## Skillfile Content Generation

`skillfile_content_generation/SKILL.md` defines the content engine for producing publish-ready packs in The Testing Academy voice.

Current generated output:

| Folder | Topic |
|--------|-------|
| `skillfile_content_generation/output/2026-06-14/` | Your AI Agent Needs a QA Contract, Not More Prompts |

Each output pack contains the topic, LinkedIn post, Medium article, YouTube script, Instagram carousel copy, and image prompts.

## Import

1. Open n8n Cloud or your self-hosted n8n instance.
2. Go to **Workflows** and import one of the JSON files from `n8n_AIAgent/`.
3. Open each credential-backed node and reconnect it to your own account.
4. Save the workflow, then run the relevant trigger.

## Credentials

Depending on the workflow, configure:

- GROQ or DeepSeek LLM credentials.
- Jira Cloud credentials and project settings.
- Google Sheets credentials and target sheet.
- Slack or Microsoft Teams credentials if those triggers are enabled.

## Notes

- Imported workflows may keep node names from the training examples, such as `QWEN Brain`, `Brain`, or `Create JIRA ticket in the VWO project`.
- Review each prompt, Jira project key, Google Sheet mapping, and trigger before activating the workflow.
- Keep API keys and tokens in n8n credentials; do not hard-code secrets into workflow nodes.
