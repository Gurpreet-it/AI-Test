// Vercel serverless function: GET /api/config — non-secret env presence for UI prefill.
function envConfig() {
  return {
    jiraUrl: process.env.JIRA_URL || '',
    jiraEmail: process.env.JIRA_EMAIL || '',
    jiraToken: process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN || '',
    groqKey: process.env.GROQ_KEY || '',
  };
}

export default function handler(_req, res) {
  const env = envConfig();
  res.status(200).json({
    jiraUrl: env.jiraUrl,
    jiraEmail: env.jiraEmail,
    hasJiraToken: Boolean(env.jiraToken),
    hasGroqKey: Boolean(env.groqKey),
  });
}
