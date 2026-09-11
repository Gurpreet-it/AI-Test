# Unica MaxAI DeepEval Suite

DeepEval test suite for the Unica MaxAI orchestrator chatbot/RAG API
(`POST /maxai/orchestrator/v1/query/form`). Sends test questions to the API,
captures the responses, and scores them with DeepEval metrics judged by a
locally-hosted Mistral model.

## Web UI Dashboard

Run the interactive web dashboard with product selection and real-time reporting:

```bash
cd "Guru-WorkSpace/DeepEval/ui"
python server.py --port 8000
# Or from DeepEval root:
cd "Guru-WorkSpace/DeepEval"
cd ui
python server.py --port 8000
# Open http://localhost:8000 in your browser
# Select a product from the dropdown and click "Run Tests"
```

The dashboard features:
- **Product selector** (Campaign, Interact, Journey, Deliver, Offer)
- **Real-time test execution** with loading indicators
- **Same color theme** as DeepEval Dashboard (dark header, light cards, green/red status)
- **Metrics bar** showing subsystem info and token usage
- **Summary bar** with pass/fail/error counts
- **Per-test-case result cards** with scores, thresholds, and details

### Running the Dashboard

1. Start the server from DeepEval root:
   ```bash
   cd "Guru-WorkSpace/DeepEval"
   cd ui
   python server.py --port 8000
   ```

2. Open http://localhost:8000 in your browser

3. Select a product from the dropdown (e.g., "Interact")

4. Click "Run Tests" to execute all test cases for that product

5. View real-time results with scores, reasons, and statistics

**Note:** If you see "Address already in use" error, another instance is running. Check with:
```bash
lsof -i :8000 | grep LISTEN
# To stop the server: kill <PID>
```

The server automatically serves:
- The dashboard UI (`index.html`)
- Test cases JSON (`unica_maxai/test_cases.json`)
- API endpoint (`/ask`) for running individual test cases

### Installation of Deepeval
* ```python3 -m venv venv```
* ```source venv/bin/activate```
* ```pip install --upgrade pip```
* ```pip install -U deepeval requests```

## Contents

```
DeepEval/
├── .env.example                # required config vars (no secrets)
├── requirements.txt
├── run_unica_maxai_suite.py    # CLI entrypoint -> custom report format
├── Unica-MaxAi-DeepEval.py     # pytest / `deepeval test run` entrypoint
└── unica_maxai/
    ├── config.py       # env-driven config: API, auth, Mistral judge, thresholds
    ├── api_client.py   # token -> login -> query chain, retries, error handling
    ├── judge.py        # local Mistral model wrapped as a DeepEval judge
    ├── models.py       # MaxAITestCase data model
    ├── test_cases/     # test case data, one file per Unica product
    │   ├── campaign.py
    │   ├── interact.py
    │   ├── journey.py
    │   ├── deliver.py
    │   ├── offer.py
    │   └── __init__.py # aggregates all products into TEST_CASES
    ├── metrics.py      # builds the 7 DeepEval metrics
    ├── report.py       # per-test-case + summary report formatting
    ├── html_report.py  # self-contained interactive HTML report
    └── runner.py       # orchestration used by both entrypoints
```

## Setup

```bash
cd "Guru-WorkSpace/DeepEval"
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env.local
# edit .env.local: set MAXAI_USERNAME / MAXAI_PASSWORD at minimum

# start a local OpenAI-compatible Mistral server, e.g. via Ollama:
ollama pull mistral
ollama serve
```

`.env.local` is git-ignored — never commit real credentials.

## Authentication

The orchestrator endpoint is session-protected, so `api_client.py` performs a
three-step chain automatically before the first question. All of it is handled
inside `MaxAIClient` — callers just use `ask()`.

```
1. POST /unica/api/manager/authentication/login   -> m_tokenId       (fetch_token)
2. POST /maxai/platform/login                     -> MAXAISESSIONID  (login)
3. POST /maxai/orchestrator/v1/query/form         -> answer          (ask)
```

| Step | Endpoint | Sends | Returns |
|---|---|---|---|
| 1. Token | `/unica/api/manager/authentication/login` | `m_user_name`, `m_user_password` (query params + headers), `sso_destapp` | `m_tokenId` in the JSON body |
| 2. Login | `/maxai/platform/login` | `m_tokenId`, `sso_destapp`, `api-auth-mode` | `MAXAISESSIONID` cookie |
| 3. Query | `/maxai/orchestrator/v1/query/form` | `m_tokenId`, `m_user_name`, `api_auth_mode`, `sso_destapp`, `Cookie: MAXAISESSIONID=...`, question as `multipart/form-data` | answer JSON |

Notes:

- `m_user_password` is sent **only** in step 1. Steps 2 and 3 authenticate
  with the token and session cookie.
- The token and session id are cached on the client (`client.token_id`,
  `client.session_id`), so the chain runs once per client, not once per
  question.
- **Retry on expiry:** if the query returns `401`/`403`, the client discards
  the cached token/session, re-runs steps 1–2, and retries the question once.
  Likewise, if a reused `MAXAI_TOKEN_ID` is rejected at step 2, a fresh token
  is fetched and login is retried. Non-auth failures (e.g. `500`) are not
  retried.
- Setting `MAXAI_TOKEN_ID` is optional and only skips step 1; leave it empty
  to always fetch a fresh token.

## Running

**Custom report (matches the spec's exact per-test / summary format):**
```bash
python run_unica_maxai_suite.py
python run_unica_maxai_suite.py --output-json results.json
```

### Shareable HTML report

```bash
python run_unica_maxai_suite.py --output-html maxai_report.html
python run_unica_maxai_suite.py --product interact --output-html interact.html
```

Produces one self-contained `.html` file (no CDN or network access needed) —
safe to email or drop in a shared drive. It includes:

- summary cards: total / passed / failed / pass rate / API errors
- average score per metric with bars, `N/A` where a metric wasn't evaluated
- live search across questions, answers and metric reasons
- filters by result (pass/fail), product, and test type
- expandable rows per test case: expected vs actual answer, every metric with
  score / result / judge reason, retrieved context and ground-truth context
- light/dark theme following the viewer's OS setting, and a print-friendly
  layout (all rows expanded) for PDF export

### Speed

Test cases run 4-at-a-time by default; the API call and the local judge are
both I/O-bound so this cuts wall-clock time substantially.

```bash
python run_unica_maxai_suite.py --concurrency 8   # more parallelism
python run_unica_maxai_suite.py --concurrency 1   # sequential
```

All workers share one authenticated client (the suite logs in once up front).
If you see `Request timed out` under high concurrency, raise
`MAXAI_TIMEOUT_SECONDS` or lower `--concurrency`.

**pytest / deepeval CLI (for CI, uses DeepEval's own pass/fail output):**
```bash
deepeval test run Unica-MaxAi-DeepEval.py
# or
pytest Unica-MaxAi-DeepEval.py -v
```

### Running a single product

All 50 cases are split across five products (10 each): `campaign`, `deliver`,
`interact`, `journey`, `offer`.

```bash
# custom report entrypoint — --product is repeatable
python run_unica_maxai_suite.py --product interact
python run_unica_maxai_suite.py --product interact --product journey

# pytest / deepeval — test ids are prefixed with the product name,
# e.g. "interact: What is Unica Interact used for?"
deepeval test run Unica-MaxAi-DeepEval.py -k interact
pytest Unica-MaxAi-DeepEval.py -v -k "interact or journey"
```

## Test case structure

Add or edit cases in the relevant file under `unica_maxai/test_cases/`:

```python
MaxAITestCase(
    question="...",
    expected_answer="...",
    expected_context=["...ground-truth reference passages..."],
    metadata={"category": "...", "difficulty": "...", "test_type": "..."},
)
```

The shipped cases are **templates** covering the 10 requested scenarios
(simple factual, multi-step, multi-document, ambiguous wording, answer
present/absent in KB, hallucination probe, irrelevant/misleading input,
incomplete information, insufficient information). Review and correct
`expected_answer` / `expected_context` against your real knowledge base
before treating scores as meaningful — this repo has no access to that KB,
so nothing about it is fabricated here.

## Metrics

| Metric | Category | Needs `retrieval_context`? |
|---|---|---|
| Contextual Precision | Retrieval | Yes |
| Contextual Recall | Retrieval | Yes |
| Contextual Relevancy | Retrieval | Yes |
| Faithfulness | RAG quality | Yes |
| Answer Relevancy | Chatbot quality | No |
| Hallucination | Chatbot quality (factual alignment, higher = better) | No (uses `expected_context` as ground truth) |
| Correctness (G-Eval) | Chatbot quality | No |

`retrieval_context` is the context the MaxAI API *actually retrieved*,
extracted live from its response (see `api_client.py`). If the API doesn't
expose retrieved context, the four retrieval-quality metrics are reported as
`N/A` for that test case — they are never evaluated against invented
context. This keeps **retrieval evaluation** (did the RAG system fetch the
right docs?) cleanly separate from **final-answer evaluation** (is the
chatbot's answer good?), which always runs regardless of retrieval
visibility.

## Configuration

All configuration is via environment variables (`.env.local`), see
`.env.example` for the full list:

**API + auth**

| Variable | Required | Default |
|---|---|---|
| `MAXAI_API_URL` | no | `https://<host>/maxai/orchestrator/v1/query/form` |
| `MAXAI_USERNAME` | **yes** | — |
| `MAXAI_PASSWORD` | **yes** | — |
| `MAXAI_TIMEOUT_SECONDS` | no | `30` |
| `MAXAI_TOKEN_URL` | no | `<host>/unica/api/manager/authentication/login` |
| `MAXAI_LOGIN_URL` | no | `<host>/maxai/platform/login` |
| `MAXAI_TOKEN_ID` | no | empty (token is fetched at runtime) |
| `MAXAI_SSO_DESTAPP` | no | `AION` |
| `MAXAI_AUTH_MODE` | no | `manager` |

`MAXAI_TOKEN_URL` and `MAXAI_LOGIN_URL` are derived from the host in
`MAXAI_API_URL`, so pointing at a different environment normally only
requires changing `MAXAI_API_URL`.

**Judge + thresholds**

- `MISTRAL_MODEL`, `MISTRAL_BASE_URL`, `MISTRAL_API_KEY`, `MISTRAL_TEMPERATURE`
- `THRESH_CONTEXTUAL_PRECISION`, `THRESH_CONTEXTUAL_RECALL`,
  `THRESH_CONTEXTUAL_RELEVANCY`, `THRESH_FAITHFULNESS`,
  `THRESH_ANSWER_RELEVANCY`, `THRESH_HALLUCINATION`, `THRESH_CORRECTNESS`

All thresholds are **minimum** required scores — including
`THRESH_HALLUCINATION`, because DeepEval's `HallucinationMetric` reports the
fraction of the ground-truth context the answer is factually aligned with
(higher is better), not a hallucination rate.

> The judge must return schema-valid JSON for the Hallucination and
> retrieval metrics. `judge.py` requests JSON-schema-constrained output, which
> is what makes small local models (e.g. `llama3.2:3b`) usable; without it they
> fail with "Evaluation LLM outputted an invalid JSON".

## Error handling

`api_client.py` returns a `MaxAIResult` with an `error` string (never raises)
for: request timeouts, connection failures, non-2xx HTTP responses,
non-JSON bodies, responses missing a recognizable answer field, and failures
in the token/login steps. Expired-session `401`/`403` responses are retried
once after re-authenticating (see [Authentication](#authentication)) before
being reported as an error. Test
cases that fail at the API layer are reported with `Overall: FAIL` and the
error message instead of crashing the whole run. Per-metric evaluation
failures (e.g. the local judge being unreachable) are caught individually
and reported as `ERROR` on that metric line, without aborting the rest of
the suite.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `MAXAI_USERNAME and MAXAI_PASSWORD must be set` | `.env.local` missing or not filled in |
| `Token response did not contain an m_tokenId field` | Bad credentials, or `MAXAI_TOKEN_URL` points at the wrong host |
| `Login response did not contain a MAXAISESSIONID cookie` | Token rejected by `/maxai/platform/login`; check `MAXAI_SSO_DESTAPP` / `MAXAI_AUTH_MODE` |
| Repeated `API returned HTTP 401` | Re-auth retry also failed — credentials or SSO app value are wrong |
| All retrieval metrics show `N/A` | The API response exposed no retrieved context; expected, see [Metrics](#metrics) |
| Metric lines show `ERROR` | Local judge not running — start `ollama serve` and `ollama pull mistral` |

## Extending

- **New test case for an existing product:** add a `MaxAITestCase(...)`
  entry to the relevant file in `test_cases/` (e.g. `test_cases/campaign.py`).
- **New product:** create `test_cases/<product>.py` with a
  `<PRODUCT>_TEST_CASES` list, then import/spread it into `TEST_CASES` in
  `test_cases/__init__.py`.
- **New metric:** add it in `metrics.py::build_metrics`, plus a
  `(key, "Display Name")` tuple in `report.py::METRIC_DISPLAY_ORDER`.
- **Different judge model:** point `MISTRAL_BASE_URL` / `MISTRAL_MODEL` at
  any OpenAI-compatible server — `judge.py` doesn't assume Ollama
  specifically.
