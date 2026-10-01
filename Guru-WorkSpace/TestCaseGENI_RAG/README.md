# Jira Test Case RAG Agent with Qdrant & Ollama

**Multi-product test case ingestion pipeline + AI-powered test case generation for HCL Unica and MaxAI.**

---

## Project Overview

This system consists of three phases:

1. **Phase 1: RAG Pipeline** — Ingest test cases from Jira (CSV/Excel), embed with sentence-transformers, store in Qdrant
2. **Phase 2: CLI Agent** (`agent.py`) — Accept Jira issue → query RAG → generate new test cases (currently OpenAI GPT-4) → Excel
3. **Phase 3: Web UI + Agent** (`webapp/`) — Browser UI with:
   - **Chat with Test Cases** — ask questions; answers are grounded in the RAG and cite test case keys
   - **Generate Test Cases** — input a **Jira story ID**, **Figma screen** (link or screenshot) and/or **design document**; the agent extracts verified requirements, retrieves **top-K (default 5)** similar cases from RAG, and generates detailed, fully-traceable test cases (see [Web UI & Agent](#web-ui--agent-webapp))

## Architecture

Embiding Mode: all-MiniLM-L6-v2, 384-dim 384-dimensional vectors

```
Jira Cloud (HMA-401957)  ───→  Python Agent (agent.py)
                                    ↓              ↓
                    Qdrant (port 6333)    Ollama/Qwen 128K (port 11434)
                    └─ jira_test_cases_all (all products)
                                    ↓
                    sentence-transformers (all-MiniLM-L6-v2, 384-dim)
                                    ↓
                    test_cases_HMA_401957.json (output)
```

**Web app (Phase 3):**

```
Browser (webapp/static/index.html)  ──HTTP──►  webapp/server.py (FastAPI, 127.0.0.1:8080)
   Chat tab / Generate tab                        ├─ testcase_agent.py  chat + requirement-driven generation
                                                  └─ rag_core.py        Qdrant retrieval · LLM (OpenAI | Ollama)
                                                                        Jira · Figma API · PDF/DOCX parsing
        ▲                                                   │
        └──── JSON / Excel export ◄─────────────────────────┘   audit copy → generated_test_cases/*.json
```

---

## Environment Setup

### Prerequisites
- **Local Stack:**
  - Qdrant binary v1.13.6 (running on port 6333)
  - Ollama with Qwen 128K model (port 11434)
  - Python 3.14+ with venv
  
- **Required Packages:**
  ```bash
  pip install qdrant-client sentence-transformers requests python-dotenv pandas openpyxl tqdm
  ```

### .env Configuration

Create `.env` in your project root:

```
JIRA_BASE_URL=https://hclsw-jirafederal.atlassian.net
JIRA_EMAIL=your-email@hcl-software.com
JIRA_TOKEN=your-jira-api-token
QDRANT_URL=http://localhost:6333
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen-128k:latest
OPENAI_API_KEY=<OPENAI_API_KEY>

# ---- Web app (webapp/) - all optional, defaults shown ----
LLM_PROVIDER=openai            # openai | ollama
OPENAI_MODEL=gpt-4o            # needs vision + JSON mode for screenshots
OLLAMA_VISION=false            # true only for a vision-capable Ollama model
FIGMA_TOKEN=<FIGMA_TOKEN>      # Figma personal access token (read-only); needed for Figma links
APP_HOST=127.0.0.1
APP_PORT=8080
QDRANT_API_KEY=<QDRANT_API_KEY>  # only if Qdrant has an API key (production)
```

> ⚠️ Never commit `.env`. If a token/key has been shared (chat, email, screenshot), rotate it.

---

## Folder Structure

### Initialize (First Time Only)

```bash
python3 setup_multi_product_folders.py
```

This creates:

```
TestCaseGENI_RAG/
│
├── test_cases_inbox/              ← DROP EXPORT FILES HERE
│   ├── HMI/
│   │   ├── current/               ← CSV or Excel files
│   │   └── archive/               ← Old versions (manual archiving)
│   ├── CAMPAIGN/
│   ├── INTERACT/
│   ├── OPTIMIZE/
│   ├── JOURNEY/
│   ├── PLAN/
│   ├── MAXAI/
│   └── COGNOS/
│
├── test_cases_processed/          ← AUTO-MOVED AFTER INGESTION
│   ├── HMI/
│   │   └── atm-exporter.xlsx      ← File automatically moved here
│   ├── CAMPAIGN/
│   └── ... (one per product)
│
├── ingestion_logs/                ← ACTIVITY LOGS (future)
│   ├── HMI/
│   └── ... (one per product)
│
├── test_cases_archive/            ← LONG-TERM STORAGE (future)
│   ├── HMI/
│   └── ... (one per product)
│
├── config.json                    ← Auto-generated product configuration
├── FOLDER_STRUCTURE.md            ← Auto-generated folder guide
│
├── agent.py                       ← Main test case generation agent
├── ingest_interact_only.py        ← Single-product CSV ingestion
├── ingest_from_csv_v2.py          ← Multi-product CSV ingestion
├── ingest_from_excel.py           ← Excel (.xlsx) ingestion ⭐ RECOMMENDED
├── setup_multi_product_folders.py ← Folder structure setup
├── webapp/                        ← ⭐ Web UI + agent (Phase 3)
│   ├── server.py                  ← FastAPI backend + serves the UI
│   ├── testcase_agent.py          ← Chat + generation pipeline
│   ├── rag_core.py                ← Qdrant, LLM, Jira, Figma, doc parsing
│   ├── static/index.html          ← UI page (Chat / Generate tabs)
│   ├── requirements.txt
│   └── README_WEBAPP.md
├── generated_test_cases/          ← Audit copy (JSON) of every UI generation run
└── .env                           ← Configuration (not in git)
```

---

## Product Input Paths

### Where to Drop Test Case Files

> **The product list lives in `config.json` → `products`** (read by the loader and the web app through `products.py`).
> To add a product, add an entry there (the ID is UPPER_CASE and is also the folder name), run `python3 products.py --create-folders`, and restart the web app.
> To remove one, delete its entry. Its points stay in Qdrant until the next `--clear` re-ingest.

| Product | Input Path | Jira Filter | Supported Formats |
|---------|-----------|---|---|
| **CAMPAIGN** | `test_cases_inbox/CAMPAIGN/current/` | `project = CAMPAIGN AND issuetype = "Test Case"` | CSV, Excel |
| **INTERACT** | `test_cases_inbox/INTERACT/current/` | `project = INTERACT AND issuetype = "Test Case"` | CSV, Excel |
| **OPTIMIZE** | `test_cases_inbox/OPTIMIZE/current/` | `project = OPTIMIZE AND issuetype = "Test Case"` | CSV, Excel |
| **JOURNEY** | `test_cases_inbox/JOURNEY/current/` | `project = JOURNEY AND issuetype = "Test Case"` | CSV, Excel |
| **PLAN** | `test_cases_inbox/PLAN/current/` | `project = PLAN AND issuetype = "Test Case"` | CSV, Excel |
| **MAXAI** | `test_cases_inbox/MAXAI/current/` | `project = MAXAI AND issuetype = "Test Case"` | CSV, Excel |
| **DETECT** | `test_cases_inbox/DETECT/current/` | `project = <JIRA_KEY> AND issuetype = "Test Case"` | CSV, Excel |
| **AC** | `test_cases_inbox/AC/current/` | `project = <JIRA_KEY> AND issuetype = "Test Case"` | CSV, Excel |
| **SC** | `test_cases_inbox/SC/current/` | `project = <JIRA_KEY> AND issuetype = "Test Case"` | CSV, Excel |
| **OFFER** | `test_cases_inbox/OFFER/current/` | `project = <JIRA_KEY> AND issuetype = "Test Case"` | CSV, Excel |

---

## Workflow

### Step 1: Initialize Folder Structure (First Time Only)

```bash
cd ~/TestCaseGENI_RAG
source venv/bin/activate

python3 setup_multi_product_folders.py
```

Output:
```
✓ Created: test_cases_inbox/
✓ Created: test_cases_inbox/HMI/current/
✓ Created: test_cases_inbox/HMI/archive/
... (one per product)
✓ Created: config.json
✓ Created: FOLDER_STRUCTURE.md
```

### Step 2: Export Test Cases from Jira

For each product:

1. **In Jira**: Open your project → Filter → Apply JQL:
   ```
   project = HMI AND issuetype = "Test Case"
   ```

2. **Export**: Click **Export** → **Export to Excel** (or CSV)

3. **Save**: `test_cases_hmi.xlsx` or `test_cases_hmi.csv`

### Step 3: Copy File to Inbox

```bash
# For HMI
cp ~/Downloads/test_cases_hmi.xlsx ~/TestCaseGENI_RAG/test_cases_inbox/HMI/current/

# For INTERACT
cp ~/Downloads/test_cases_interact.xlsx ~/TestCaseGENI_RAG/test_cases_inbox/INTERACT/current/

# For any other product
cp ~/Downloads/test_cases_campaign.xlsx ~/TestCaseGENI_RAG/test_cases_inbox/CAMPAIGN/current/
```

### Step 4: Run Ingestion (Manual Trigger)

#### Option A: Excel Ingestion (⭐ RECOMMENDED)

```bash
source venv/bin/activate

# Ingest single product
python3 ingest_from_excel.py test_cases_inbox/HMI/current --clear

# Ingest entire folder (all products)
python3 ingest_from_excel.py test_cases_inbox/ --clear

# Without auto-move
python3 ingest_from_excel.py test_cases_inbox/HMI/current --clear --no-move
```

#### Option B: CSV Ingestion

```bash
source venv/bin/activate

# Multi-product CSV
python3 ingest_from_csv_v2.py test_cases_inbox/HMI/current --clear

# Single product (INTERACT)
python3 ingest_interact_only.py --clear
```

### Understanding the `--clear` Flag

The `--clear` flag controls whether to **delete existing data** before ingesting new data.

#### What `--clear` Does

```bash
python3 ingest_from_excel.py test_cases_inbox/HMI/current --clear
```

1. **Deletes** the entire Qdrant collection
2. **Creates** a new empty collection  
3. **Ingests** the new test cases

---

#### When to Use `--clear` vs. Skip It

| Scenario | Command | Result |
|----------|---------|--------|
| **First ingestion ever** | `--clear` | ✅ Start with fresh database |
| **Re-ingest same product** (avoid duplicates) | `--clear` | ✅ Replace old version |
| **Add a different product** | ❌ No flag | ✅ Keep existing data + add new |
| **Update/fix data** | `--clear` | ✅ Start fresh |
| **Build unified multi-product DB** | `--clear` on first, no flag on rest | ✅ Combine all products |

---

#### Strategy 1: Single Product (Simplest)

```bash
# First ingestion - use --clear
python3 ingest_from_excel.py test_cases_inbox/HMI/current --clear

# Result: Qdrant contains only HMI (102 test cases)
python3 check_qdrant_data.py products
```

**Output:**
```
HMI            : 102 test cases
```

---

#### Strategy 2: Multi-Product Unified Database (RECOMMENDED)

Build a database with test cases from **all products** together:

```bash
# Step 1: First product with --clear (initialize)
python3 ingest_from_excel.py test_cases_inbox/INTERACT/current --clear

# Result: INTERACT only (102)
python3 check_qdrant_data.py products
# Output: INTERACT : 102

# Step 2: Add HMI WITHOUT --clear (append)
python3 ingest_from_excel.py test_cases_inbox/HMI/current

# Result: INTERACT + HMI (102 + 87 = 189)
python3 check_qdrant_data.py products
# Output: INTERACT : 102, HMI : 87

# Step 3: Add CAMPAIGN WITHOUT --clear (append)
python3 ingest_from_excel.py test_cases_inbox/CAMPAIGN/current

# Result: All three products
python3 check_qdrant_data.py products
# Output: INTERACT : 102, HMI : 87, CAMPAIGN : 54

# Continue for other products...
python3 ingest_from_excel.py test_cases_inbox/OPTIMIZE/current
python3 ingest_from_excel.py test_cases_inbox/JOURNEY/current
python3 ingest_from_excel.py test_cases_inbox/PLAN/current
python3 ingest_from_excel.py test_cases_inbox/MAXAI/current
python3 ingest_from_excel.py test_cases_inbox/COGNOS/current
```

**Final Result:**
```
✓ INTERACT       : 102 test cases
✓ HMI            : 87 test cases
✓ CAMPAIGN       : 54 test cases
✓ OPTIMIZE       : 45 test cases
✓ JOURNEY        : 38 test cases
✓ PLAN           : 42 test cases
✓ MAXAI          : 28 test cases
✓ COGNOS         : 15 test cases
────────────────────────────────────
  TOTAL          : 411 test cases
```

**Benefits of Multi-Product DB:**
- ✅ Agent can query across all products
- ✅ Find similar test cases across products
- ✅ Better RAG context for cross-product issues
- ✅ Single Qdrant collection to manage

---

#### Strategy 3: Batch Ingest Everything at Once

If all products are ready:

```bash
# Place all Excel files in their folders first
cp test_cases_interact.xlsx test_cases_inbox/INTERACT/current/
cp test_cases_hmi.xlsx test_cases_inbox/HMI/current/
cp test_cases_campaign.xlsx test_cases_inbox/CAMPAIGN/current/
# ... etc for all products

# Then ingest the entire tree with --clear
python3 ingest_from_excel.py test_cases_inbox/ --clear

# Result: All products in one operation
python3 check_qdrant_data.py products
```

---

#### Strategy 4: Re-do Everything from Scratch

If you want to **completely reset** and re-ingest:

```bash
# Clear and re-ingest INTERACT only
python3 ingest_from_excel.py test_cases_inbox/INTERACT/current --clear

# Result: Only INTERACT again (deletes HMI, CAMPAIGN, etc.)
```

⚠️ **Warning:** This deletes all other products!

---

#### Comparison Table

| Strategy | `--clear`? | When | Result |
|----------|---|---|---|
| Single product | Yes | Once | Only that product |
| Multi-product (sequential) | Yes on #1, No after | As you add products | All products combined |
| Batch all products | Yes | All at once | All products at once |
| Update/fix | Yes | Re-ingest | Fresh data |
| Append more data | No | Add new | Keep old + add new |

---

#### Common Mistakes

```bash
# ❌ WRONG: Using --clear for every product
python3 ingest_from_excel.py test_cases_inbox/INTERACT/current --clear
python3 ingest_from_excel.py test_cases_inbox/HMI/current --clear  # Oops! Deleted INTERACT
# Result: Only HMI (lost INTERACT)

# ✅ RIGHT: --clear only for first product
python3 ingest_from_excel.py test_cases_inbox/INTERACT/current --clear
python3 ingest_from_excel.py test_cases_inbox/HMI/current         # No --clear!
# Result: INTERACT + HMI
```

---

#### Check Current State

Before ingesting, always check what's already in Qdrant:

```bash
python3 check_qdrant_data.py stats
python3 check_qdrant_data.py products
```

This tells you:
- Total points ingested
- Which products are already loaded
- Whether you should use `--clear` or not

### Step 5: Files Auto-Move (After Successful Ingestion)

**After each ingestion:**

```
BEFORE:
test_cases_inbox/HMI/current/
└── atm-exporter.xlsx

AFTER (Auto-moved):
test_cases_processed/HMI/
└── atm-exporter.xlsx
```

**Status in output:**
```
✓ File complete: 102 test cases ingested
✓ Moved to: test_cases_processed/HMI/atm-exporter.xlsx
```

### Step 6: Verify Ingestion

```bash
# Check logs
tail -f ingestion_logs/HMI/latest.log

# Check Qdrant
python3 << 'EOF'
from qdrant_client import QdrantClient
client = QdrantClient("http://localhost:6333", check_compatibility=False)
info = client.get_collection("jira_test_cases_all")
print(f"✓ Total test cases in Qdrant: {info.points_count}")
EOF
```

### Step 7: Test Agent

```bash
python3 agent.py HMA-401957
```

Output: `test_cases_HMA_401957.json` with AI-generated test cases

---

## Ingestion Scripts

### 1. `setup_multi_product_folders.py`

**Purpose:** Initialize folder structure for all products

**Usage:**
```bash
python3 setup_multi_product_folders.py          # Create all folders
python3 setup_multi_product_folders.py --dry-run  # Preview only
```

**Creates:**
- Folder structure for 8 products
- `config.json` with product mappings
- `FOLDER_STRUCTURE.md` with detailed guide

---

### 2. `ingest_from_excel.py` ⭐ RECOMMENDED

**Purpose:** Ingest Jira Excel exports (richest format)

**Supports:** `.xlsx`, `.xls`

**Usage:**
```bash
# Single product
python3 ingest_from_excel.py test_cases_inbox/HMI/current --clear

# All products at once
python3 ingest_from_excel.py test_cases_inbox/ --clear

# Without moving files
python3 ingest_from_excel.py test_cases_inbox/HMI/current --clear --no-move
```

**Features:**
- ✅ Reads all 23 columns from Jira Excel export
- ✅ Handles multiple test script formats (Step-by-Step, Plain Text, BDD)
- ✅ Merges Zephyr multi-step rows: step 2, 3 … are exported as extra rows without Key and are folded into their test case as `Step 1: … / Step 2: …`. Single-step cases are stored exactly as exported
- ✅ Skips Excel lock files (`~$Name.xlsx`, created while a workbook is open)
- ✅ Preserves metadata: Priority, Severity, Component, Folder, Automation Status
- ✅ Auto-detects product from folder name
- ✅ Batch processing (50 at a time)
- ✅ Auto-moves files after ingestion

---

### 3. `ingest_from_csv_v2.py`

**Purpose:** Ingest CSV exports (lighter format)

**Supports:** `.csv`

**Usage:**
```bash
python3 ingest_from_csv_v2.py test_cases_inbox/HMI/current --clear
python3 ingest_from_csv_v2.py ./my_csv_folder/ --clear
```

**Features:**
- ✅ Works with single file or folder
- ✅ Auto-detects product from path
- ✅ Batch processing
- ✅ Auto-moves files after ingestion

---

### 4. `ingest_interact_only.py`

**Purpose:** Single-product ingestion for Unica Interact

**Usage:**
```bash
python3 ingest_interact_only.py --clear

# Or with explicit path
python3 ingest_interact_only.py test_cases_inbox/INTERACT/current --clear
```

**Features:**
- ✅ Auto-uses default path: `test_cases_inbox/INTERACT/current/`
- ✅ Product-aware metadata (tagged as INTERACT)
- ✅ Auto-moves files after ingestion

---

## Stored Metadata (Qdrant)

Each test case is stored with rich metadata for filtering:

```json
{
  "key": "HMI-T18410",
  "summary": "TC_DT_ABTesting_DDL_001",
  "product": "HMI",
  "content": "Full test case text with all fields (+ 'Feature: A/B Testing (also known as: ...)')",
  "features": ["AB_TESTING"],
  "metadata": {
    "objective": "Validate that new table for A/B test...",
    "precondition": "...",
    "steps": "...",
    "expected_result": "...",
    "priority": "Normal",
    "severity": "Medium",
    "status": "Draft",
    "component": "A/B Testing",
    "folder": "/Functional Test Cases/Features 12.0.x/AB Testing",
    "test_type": "Functional",
    "automation_status": "Covered",
    "excel_file": "atm-exporter.xlsx",
    "excel_row": 2
  }
}
```

**Point IDs** are deterministic UUIDs built from `product + test case key`. Re-ingesting a file **updates** its cases (no duplicates), and ingesting another product **adds** to the collection without overwriting.

**Queryable by:**
- Product: `product = "HMI"`
- Component: `component = "A/B Testing"`
- Status: `status = "Draft"`
- Priority: `priority = "High"`
- Cross-product: `product IN ["HMI", "CAMPAIGN"]`
- Feature: `features = "AB_TESTING"` (see [Feature Glossary](#feature-glossary-synonyms))

---

## Feature Glossary (Synonyms)

The team uses several names for the same feature (e.g. **A/B**, **ABT**, **AB testing**, **ABTesting**). The embedding model doesn't know these are the same, so they're defined once in **`glossary.json`** and applied everywhere:

| Where | What happens |
|-------|--------------|
| `ingest_from_excel.py` | Detects features in name/folder/component/objective/steps → stores `payload.features` and appends `Feature: A/B Testing (also known as: A/B, ABT, …)` to the **embedded text** |
| `tag_existing_points.py` | Backfills `payload.features` on points already in Qdrant (**no re-embedding**) |
| Web app search (chat + generation) | Every query is **expanded** with the aliases it mentions; optional **Feature filter** in the sidebar |

**Add or edit a feature:** add an entry under `features` in `glossary.json` with `label`, `aliases`, `patterns` (case-insensitive regex; letter/digit boundaries are added automatically) and examples, then run:

```bash
python3 glossary.py --check                        # validates regexes + runs examples
python3 glossary.py "Verify ABT branch sampling"   # shows detection + expanded query
```

Avoid very short patterns (e.g. bare `AB`), because they match unrelated text. Verified on `ABT_Interact.xlsx`: 100/100 real test cases are tagged (the 2 blank rows are skipped).

**Query intents (QA wording vs product terms):** `glossary.json → query_intents` handles questions whose QA meaning clashes with product feature names. Example: "negative test scenarios" (invalid input, error handling) vs Interact's **Negative Event / Negative Action** features. For such questions the search:
1. rewrites the phrase into negative-testing wording,
2. also searches the topic on its own and cases with the Zephyr label **Negative** (`payload.tags`),
3. merges the three lists with RRF (reciprocal rank fusion).

The chat LLM also gets explicit guidance not to relabel feature tests as negative tests. Zephyr **Labels** are now ingested: embedded as `Labels: …` and stored as `metadata.labels` and `tags`.

**Apply to existing data:**

```bash
python3 tag_existing_points.py            # dry run: shows what would change
python3 tag_existing_points.py --apply    # write tags (filter + query expansion work now)
```

For the aliases to also be part of the **vectors**, re-ingest once (see below).

> **Re-ingest once after this update.** IDs changed from sequential integers to UUIDs. Re-ingest **all products** once: first with `--clear`, then the rest without it. The script warns if old integer-ID points are still present.

---

## Agent Usage

### Generate Test Cases for a Jira Issue

```bash
python3 agent.py HMA-401957
```

**Process:**
1. Fetches issue HMA-401957 from Jira
2. Queries Qdrant for similar HMI test cases
3. Sends to Ollama Qwen with RAG context
4. Generates 5-10 new test cases
5. Outputs: `test_cases_HMA_401957.json`

**Output Format:**
```json
[
  {
    "title": "Validate multi-channel A/B test results aggregation",
    "objective": "Ensure A/B test metrics aggregate correctly across channels",
    "preconditions": "A/B test active in campaign with multiple channels",
    "steps": [
      "Go to Campaign Analytics",
      "Select A/B test variant",
      "Verify aggregated metrics"
    ],
    "expected_results": "Metrics match channel-specific values",
    "priority": "High",
    "component": "A/B Testing"
  },
  ...
]
```

---

> **Deploying to a production VM?** See [`production ready.md`](production%20ready.md): Qdrant with API key, systemd, nginx/TLS, data migration, backups and a go-live checklist.

## Web UI & Agent (`webapp/`)

### Start

```bash
source venv/bin/activate
pip install -r webapp/requirements.txt
./qdrant                        # separate terminal (port 6333)
python3 webapp/server.py        # open http://127.0.0.1:8080
```

The header shows live status for Qdrant (point count), the LLM, Jira and Figma. The sidebar shows the test case count per product (click to filter) and the **Top-K** setting.

### Tab 1 — Chat with Test Cases

- Ask anything, e.g. *"Which test cases cover A/B testing branch selection?"*
- Retrieves the top-K most similar test cases (optionally filtered by product) and answers **only** from them, citing keys like `[HMI-T18410]`.
- If the answer isn't in the knowledge base, it says so instead of guessing. Retrieved references are expandable under each answer.

### Tab 2 — Generate Test Cases

**Inputs (any combination):** Jira story ID · Figma link (needs `FIGMA_TOKEN`) or screenshot · design doc (PDF / DOCX / TXT / MD) · free-text notes · product · *Max test cases* (blank = **Auto, full coverage**, hard cap 200).

**Pipeline (anti-hallucination, full coverage):**

| Step | What happens |
|------|--------------|
| 1. Collect | Each source is kept **separate**. Long design docs are split into ~10k-char sections (up to 60k chars) so nothing is skipped. |
| 2. Extract | The LLM lists **atomic testable requirements** per source (`STORY-01`, `FIG-03`, `SCR-02`, `DOC-07`, `NOTE-01`), each with a **verbatim evidence quote**. Figma/screenshots produce one requirement per visible UI element (field, label, placeholder, mandatory marker, button state, dropdown options, table columns, messages, navigation). |
| 3. Ground-check | Code verifies each evidence quote exists in the source (exact or ≥85% word overlap). Unsupported requirements are **rejected** and shown in the UI. |
| 4. Generate | Requirements are processed in groups of 4. **Top-K RAG cases are retrieved per group** (style/format reference only). The LLM writes **all** cases needed per requirement: positive, negative, boundary (only where limits are stated), UI checks, permissions/integrations (only if stated). Steps are atomic with per-step expected results. |
| 5. Validate | Cases not traceable to a verified requirement are **dropped**; duplicate titles removed. |
| 6. Gap-fill | Any requirement with zero cases gets a second, focused pass. |
| 7. Unknowns | Missing facts become `<TBD: …>` placeholders + **Open questions**, never invented values. |

**Output in the UI:** summary (`N test cases · X/Y requirements covered · Z with TBD`) and tabs for *Test cases* · *Requirements & coverage* · *Open questions* · *RAG references* · *Requirement context*.

**Export:** **Excel** (sheets: *Generated Test Cases* — Zephyr-style, one row per step, with Requirement IDs / Traceability / Reference Keys / Has TBD · *RAG References* · *Requirement Coverage* · *Open Questions*) or **JSON**. Every run is also saved to `generated_test_cases/<STORY>_<timestamp>.json`.

### Web app tuning (`.env`)

| Key | Default | Purpose |
|-----|---------|---------|
| `LLM_MAX_TOKENS` | 8000 | Max output tokens per generation call |
| `LLM_PARALLEL` | 3 | Concurrent LLM calls |
| `REQS_PER_CALL` | 4 | Requirements per generation call (lower = more detail) |
| `HARD_CAP_CASES` | 200 | Upper limit in Auto mode |
| `DOC_SECTION_CHARS` / `MAX_DOC_CHARS` | 10000 / 60000 | Design-doc section size / total limit |
| `LLM_TIMEOUT` / `LLM_MAX_RETRIES` | 180 / 3 | Per-call timeout, retries with backoff |
| `MAX_UPLOAD_MB` | 15 | Upload size limit |

### Web API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Qdrant / LLM / Jira / Figma status |
| GET | `/api/products` | Test case count per product |
| POST | `/api/search` | Raw top-K retrieval |
| POST | `/api/chat` | RAG chat |
| POST | `/api/generate` | Test case generation (multipart form) |
| POST | `/api/export` | Generated cases → `.xlsx` |

### Security & data notes

- Binds to **localhost** by default and has **no authentication**. Put it behind SSO / a reverse proxy before sharing with the team.
- Figma fetches only accept `https://*.figma.com` (SSRF guard). Story IDs are regex-validated. Uploads are size-limited.
- With `LLM_PROVIDER=openai`, story text, design docs and screenshots are sent to OpenAI. Confirm this is approved for the content, or use `ollama` to keep data local.
- Full-coverage runs make many LLM calls. Expect several minutes and higher API cost for large stories/docs.

---

## Quick Reference

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: pandas` | `pip install pandas openpyxl` |
| `Connection refused port 6333` | Run `./qdrant` in separate terminal |
| No files ingested | Check: 1) Files in correct folder, 2) Correct format (.xlsx or .csv), 3) --clear flag |
| Files not moving | Check file permissions; use `--no-move` flag to skip |
| "Unbounded JQL queries" error | This is old API issue; use CSV/Excel export instead |
| **Ingested data disappeared** | You used `--clear` when you shouldn't have. Use `--clear` **only on first ingestion**. See "Understanding the `--clear` Flag" section above. |
| **Only HMI in Qdrant after adding CAMPAIGN** | You used `--clear` for CAMPAIGN. Use `--clear` only once (first product), then omit it for subsequent products. |
| **UI header shows "Backend offline"** | Start `python3 webapp/server.py`; check the terminal for errors |
| **UI: Qdrant badge red** | Qdrant not running / wrong `QDRANT_URL` |
| **UI: Figma link warning "FIGMA_TOKEN not set"** | Add `FIGMA_TOKEN` to `.env`, or upload a screenshot instead |
| **UI: many requirements "rejected"** | The model paraphrased instead of quoting. Rejected items are shown for review; add the missing detail in *Notes* if valid |
| **UI: cases marked TBD** | Sources lack a value (limit, message, role). Resolve items in *Open questions* with PO/designer |
| **UI: Ollama ignores screenshots** | Set `OLLAMA_VISION=true` with a vision-capable model, or use `LLM_PROVIDER=openai` |
| **Search for "ABT" misses "A/B testing" cases** | Check the alias is in `glossary.json` (`python3 glossary.py "your query"`), then run `tag_existing_points.py --apply` or re-ingest |
| **Feature filter shows (0)** | Points are not tagged yet: run `python3 tag_existing_points.py --apply` |
| **Duplicate test cases after appending a product** | The collection still has old integer-ID points. Re-ingest all products once, starting with `--clear` |
| **Can't find test cases by product** | Ensure product field was set during ingestion. Check: `python3 check_qdrant_data.py point 1` to see payload structure. Run `repair_qdrant_product_field_v2.py` if needed. |

### Commands Cheat Sheet

```bash
# First time setup
python3 setup_multi_product_folders.py

# ===== STRATEGY 1: Single Product Only =====
python3 ingest_from_excel.py test_cases_inbox/INTERACT/current --clear
# Result: Only INTERACT in Qdrant

# ===== STRATEGY 2: Multi-Product Unified DB (RECOMMENDED) =====
# Step 1: Initialize with first product
python3 ingest_from_excel.py test_cases_inbox/INTERACT/current --clear

# Step 2: Add more products WITHOUT --clear
python3 ingest_from_excel.py test_cases_inbox/HMI/current
python3 ingest_from_excel.py test_cases_inbox/CAMPAIGN/current
python3 ingest_from_excel.py test_cases_inbox/OPTIMIZE/current
# Result: All products combined in Qdrant

# ===== Check Status =====
python3 check_qdrant_data.py stats
python3 check_qdrant_data.py products
python3 check_qdrant_data.py by-product INTERACT

# Test the agent (CLI)
python3 agent.py HMA-401957

# Feature glossary (A/B = ABT = AB testing …)
python3 glossary.py --check
python3 tag_existing_points.py            # dry run
python3 tag_existing_points.py --apply

# Start the Web UI (Chat + Generate)
python3 webapp/server.py        # → http://127.0.0.1:8080

# Check Qdrant
python3 << 'EOF'
from qdrant_client import QdrantClient
client = QdrantClient("http://localhost:6333", check_compatibility=False)
info = client.get_collection("jira_test_cases_all")
print(f"Total: {info.points_count}")
EOF
```

---

## Roadmap

- [x] Phase 1: RAG pipeline (Qdrant + embeddings)
- [x] Excel ingestion from Jira exports
- [x] Multi-product folder structure
- [x] Auto file movement after ingestion
- [x] Phase 2: Agent test case generation (CLI `agent.py`)
- [x] Phase 3: Web UI — RAG chat + test case generation (`webapp/`)
- [x] Generation inputs: Jira story ID, Figma link/screenshot, design doc (PDF/DOCX/TXT/MD)
- [x] Requirement extraction with evidence grounding, coverage matrix, gap-fill, open questions
- [x] Excel/JSON export with traceability; audit copy of each run (`generated_test_cases/`)
- [x] Zephyr multi-step rows merged into their test case (previously steps 2+ were dropped)
- [x] Products managed in `config.json` (added DETECT, AC, SC, OFFER; removed HMI, COGNOS)
- [x] Feature glossary / synonyms (A/B = ABT = AB testing): tagging, query expansion, filter
- [x] Fixed: append without `--clear` no longer overwrites other products (deterministic IDs); empty cells no longer stored as "nan"
- [ ] Logging and audit trail for ingestion (`ingestion_logs/`)
- [ ] Web UI for ingestion (upload + ingest from browser)
- [ ] PDF test case ingestion into Qdrant (currently Excel/CSV only)
- [ ] Authentication / SSO for the web app
- [ ] Scheduled automatic ingestion (optional)
- [ ] Export results back to Jira

---

## Support

- **Jira Issues:** HMA-401957 (HMI project)
- **Related Projects:** INTERACT, CAMPAIGN, OPTIMIZE, JOURNEY, PLAN, MAXAI, COGNOS
- **Maintainer:** Guru (Senior QA Engineering Manager, HCL Software)

---

## Notes

- ✅ **Excel is recommended** over CSV (richer metadata)
- ✅ **Files auto-move** after successful ingestion to avoid re-processing
- ✅ **Local inference** via Ollama (no API costs, full privacy). The web app defaults to OpenAI; set `LLM_PROVIDER=ollama` to stay local
- ✅ **Batch processing** for performance (50 test cases per batch)
- ✅ **Multi-product ready** (all 8 products supported)
- ✅ **`--clear` flag strategy:**
  - Use `--clear` on **first ingestion only** (to initialize Qdrant)
  - **Skip `--clear` for subsequent products** (to append to existing data)
  - This builds a unified multi-product database for cross-product RAG queries
  - Example: `ingest INTERACT --clear`, then `ingest HMI` (no flag), then `ingest CAMPAIGN` (no flag)
- ✅ **Always check current state** before ingesting: `python3 check_qdrant_data.py products`

---

**Last Updated:** September 25, 2026 (Feature glossary / synonyms, deterministic point IDs, Web UI)