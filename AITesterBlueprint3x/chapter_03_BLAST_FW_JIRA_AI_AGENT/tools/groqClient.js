// Layer 3 Tool — GROQ chat completion (OpenAI-compatible). Atomic.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'openai/gpt-oss-120b';

export async function groqChat(config, messages, { json = true, temperature = 0.3 } = {}) {
  if (!config.groqKey) throw new Error('Missing GROQ API key');

  const body = { model: GROQ_MODEL, messages, temperature };
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GROQ ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  if (!json) return content;

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('GROQ did not return valid JSON');
  }
}
