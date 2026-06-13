# Chapter 04 - n8n AI Agents for QA

Importable n8n workflows for QA automation with LLM agents, Jira, Google Sheets, Slack, Microsoft Teams, and CSV-driven batch processing.

## Workflows

| File | Purpose |
|------|---------|
| `n8n_AIAgent/AI_3X_01_QA_Buddy.json` | Chat-triggered QA assistant using a GROQ-backed Qwen model node. |
| `n8n_AIAgent/AI_3X_02_JIRA_Agent.json` | Chat agent with a Jira tool for creating tickets in the configured project. |
| `n8n_AIAgent/AI_3X_03_Read_PRD_TestCases_Excel.json` | Fetches PRD or ticket context, generates test cases, and appends/updates Google Sheets rows. |
| `n8n_AIAgent/AI_3X_04_Read_PRD_TestCases_Excel_v2.json` | Adds CSV upload and batch Jira-ticket processing to the PRD-to-test-cases workflow. |

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
