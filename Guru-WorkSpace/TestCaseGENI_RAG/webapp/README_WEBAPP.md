# TestCaseGENI Web App (Chat + Generate)

```
Browser UI (static/index.html)
   │  /api/chat  /api/generate  /api/export
   ▼
server.py (FastAPI, 127.0.0.1:8080)
   ├─ testcase_agent.py   chat + generation prompts, batching, de-dup
   └─ rag_core.py         Qdrant retrieval (jira_test_cases_all, all-MiniLM-L6-v2)
                          LLM (OpenAI or Ollama) · Jira · Figma · PDF/DOCX parsing
```

Uses the **same Qdrant collection and payload** that `ingest_from_excel.py` writes. No existing files were changed.

## Run
```bash
cd TestCaseGENI_RAG && source venv/bin/activate
pip install -r webapp/requirements.txt
./qdrant                      # separate terminal, port 6333
python3 webapp/server.py      # open http://127.0.0.1:8080
```

## .env keys (project root)
| Key | Required | Default | Purpose |
|---|---|---|---|
| `LLM_PROVIDER` | no | `openai` | `openai` or `ollama` |
| `OPENAI_API_KEY` | if openai | – | already in your .env |
| `OPENAI_MODEL` | no | `gpt-4o` | needs vision + JSON mode for screenshots |
| `OLLAMA_URL` / `OLLAMA_MODEL` | if ollama | localhost:11434 / qwen-128k:latest | |
| `OLLAMA_VISION` | no | `false` | set `true` only for a vision model (e.g. llava) |
| `JIRA_BASE_URL` / `JIRA_EMAIL` / `JIRA_TOKEN` | for Story ID | – | already in your .env |
| `FIGMA_TOKEN` | for Figma links | – | Figma personal access token (read-only scope). Without it, upload a screenshot instead |
| `APP_HOST` / `APP_PORT` | no | 127.0.0.1 / 8080 | keep localhost unless behind auth |
| `MAX_UPLOAD_MB`, `MAX_DOC_CHARS` | no | 15 / 15000 | input limits |

## Features
* **Chat tab**: RAG Q&A over ingested test cases. Filter by product (sidebar), Top-K is adjustable, answers cite keys like `[HMI-T18410]`, and the retrieved references can be expanded.
* **Generation pipeline (v2, anti-hallucination, full coverage)**:
  1. Each source (story, Figma, screenshot, design-doc section, notes) is analysed **separately** into atomic requirements (`STORY-01`, `FIG-03`, `SCR-02`, `DOC-07`, …). Each requirement comes with a **verbatim evidence quote**.
  2. **Grounding check** in code: requirements whose quote can't be found in the source are rejected and listed in the UI.
  3. For every group of 4 requirements, the **top-K RAG cases for that group** are retrieved and **all** cases needed to verify each requirement are written: positive, negative, boundary (only where limits are stated), and full UI checks for Figma items.
  4. Cases that don't trace to a verified requirement are dropped, duplicate titles are removed, and a **gap-fill pass** covers any requirement that is still uncovered.
  5. Missing facts become `<TBD: …>` placeholders plus **Open questions**, never invented values.
  Tuning (.env): `LLM_MAX_TOKENS` (8000), `LLM_PARALLEL` (3), `REQS_PER_CALL` (4), `HARD_CAP_CASES` (200), `DOC_SECTION_CHARS` (10000), `MAX_DOC_CHARS` (60000).
* **Generate tab**: inputs are Story ID, Figma link or screenshot, design doc (PDF/DOCX/TXT/MD) and notes, in any combination. The agent retrieves the **top-K (default 5)** similar cases as style/coverage references and generates N cases (batches of 20, no duplicates). You can view the cases, references and the merged requirement context, then export to **Excel** (Zephyr-style, one row per step, plus a "RAG References" sheet) or JSON.
* Every generation run is saved to `generated_test_cases/<STORY>_<timestamp>.json` as an audit trail.

## Security notes
* Binds to localhost by default and has **no authentication**. Add SSO/reverse-proxy auth before sharing it with others.
* Figma fetches only accept `https://*.figma.com` (SSRF guard). Story IDs are validated by regex. Uploads are size-limited.
* When `LLM_PROVIDER=openai`, story text, design docs and screenshots are sent to OpenAI. Check that this is approved for customer/confidential content, or use `ollama` to keep it local.
