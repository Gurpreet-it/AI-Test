# Multi-Product Jira Test Case Ingestion

## Folder Structure

```
TestCaseGENI_RAG/
│
├── test_cases_inbox/              ← DROP CSV FILES HERE
│   ├── HMI/
│   │   ├── current/               ← Current test case CSVs for HMI
│   │   │   ├── test_cases_hmi_v1.csv
│   │   │   ├── test_cases_hmi_v2.csv
│   │   │   └── ...
│   │   └── archive/               ← Old versions (not ingested)
│   │
│   ├── CAMPAIGN/
│   │   ├── current/               ← Current test case CSVs for Campaign
│   │   │   └── test_cases_campaign.csv
│   │   └── archive/
│   │
│   ├── INTERACT/
│   │   ├── current/               ← Current test case CSVs for Interact
│   │   │   └── test_cases_interact.csv
│   │   └── archive/
│   │
│   ├── OPTIMIZE/
│   ├── JOURNEY/
│   ├── PLAN/
│   ├── MAXAI/
│   └── COGNOS/
│
├── test_cases_processed/          ← AUTO-MOVED HERE AFTER INGESTION
│   ├── HMI/
│   │   ├── test_cases_hmi_v1.csv  ← Processed and moved
│   │   ├── test_cases_hmi_v2.csv
│   │   └── ...
│   ├── CAMPAIGN/
│   ├── INTERACT/
│   └── ...
│
├── test_cases_archive/            ← LONG-TERM STORAGE
│   ├── HMI/
│   ├── CAMPAIGN/
│   └── ...
│
├── ingestion_logs/                ← ACTIVITY LOGS
│   ├── HMI/
│   │   ├── 2026-09-20_ingestion.log
│   │   ├── 2026-09-21_ingestion.log
│   │   └── ...
│   ├── CAMPAIGN/
│   └── ...
│
├── config.json                    ← Auto-generated configuration
├── watch_and_ingest.py            ← Main watcher script
├── ingest_from_csv.py             ← Core ingestion logic
└── setup_multi_product_folders.py ← This script
```

## How to Use

### Step 1: Initialize Folder Structure (First Time Only)

```bash
cd ~/TestCaseGENI_RAG
source venv/bin/activate

# Create all folders and config.json
python3 setup_multi_product_folders.py
```

### Step 2: Export Test Cases from Jira

For each product (HMI, Campaign, Interact, etc.):

1. **In Jira**: Create filter
   ```
   project = HMI AND issuetype = "Test Case"
   ```

2. **Export to CSV**: Click Export → Save as `test_cases_hmi_v1.csv`

3. **Move to folder**: Copy CSV to `test_cases_inbox/HMI/current/`

### Step 3: Start the Watcher

```bash
# Monitor all product folders and auto-ingest CSVs
python3 watch_and_ingest.py

# Or with options:
python3 watch_and_ingest.py --clear           # Clear collection before ingesting
python3 watch_and_ingest.py --product HMI     # Only watch HMI folder
python3 watch_and_ingest.py --once            # Run once, don't watch continuously
```

### Step 4: Verify Results

```bash
# Check what was ingested
tail -f ingestion_logs/HMI/latest.log

# Check Qdrant
python3 << 'EOF'
from qdrant_client import QdrantClient
client = QdrantClient("http://localhost:6333", check_compatibility=False)
info = client.get_collection("jira_test_cases_all")
print(f"✓ Total points in Qdrant: {info.points_count}")
EOF
```

## Input Path Reference

### HMI (PnP Marketing Interact)
- **Input**: `test_cases_inbox/HMI/current/`
- **Example**: `test_cases_hmi_v1.csv`, `test_cases_hmi_regression.csv`
- **Jira Filter**: `project = HMI AND issuetype = "Test Case"`

### CAMPAIGN (Unica Campaign)
- **Input**: `test_cases_inbox/CAMPAIGN/current/`
- **Example**: `test_cases_campaign_v1.csv`
- **Jira Filter**: `project = CAMPAIGN AND issuetype = "Test Case"`

### INTERACT (Unica Interact)
- **Input**: `test_cases_inbox/INTERACT/current/`
- **Example**: `test_cases_interact_segments.csv`
- **Jira Filter**: `project = INTERACT AND issuetype = "Test Case"`

### OPTIMIZE (Unica Optimize)
- **Input**: `test_cases_inbox/OPTIMIZE/current/`
- **Example**: `test_cases_optimize_v1.csv`
- **Jira Filter**: `project = OPTIMIZE AND issuetype = "Test Case"`

### JOURNEY (Unica Journey)
- **Input**: `test_cases_inbox/JOURNEY/current/`
- **Example**: `test_cases_journey_v1.csv`
- **Jira Filter**: `project = JOURNEY AND issuetype = "Test Case"`

### PLAN (Unica Plan)
- **Input**: `test_cases_inbox/PLAN/current/`
- **Example**: `test_cases_plan_v1.csv`
- **Jira Filter**: `project = PLAN AND issuetype = "Test Case"`

### MAXAI (Conversational AI)
- **Input**: `test_cases_inbox/MAXAI/current/`
- **Example**: `test_cases_maxai_v26.csv`
- **Jira Filter**: `project = MAXAI AND issuetype = "Test Case"`

### COGNOS (IBM Cognos)
- **Input**: `test_cases_inbox/COGNOS/current/`
- **Example**: `test_cases_cognos_reports.csv`
- **Jira Filter**: `project = COGNOS AND issuetype = "Test Case"`

## Workflow

1. **Export CSV from Jira** → Save to `test_cases_inbox/{PRODUCT}/current/`
2. **Watcher detects new CSV** → Auto-ingests into Qdrant
3. **After ingestion** → CSV moved to `test_cases_processed/{PRODUCT}/`
4. **Old versions** → Manually archive to `test_cases_inbox/{PRODUCT}/archive/`
5. **Logs** → Check `ingestion_logs/{PRODUCT}/` for details

## Output Structure

After ingestion, test cases are stored in Qdrant with metadata:

```json
{
  "key": "HMI-T31664",
  "summary": "Test case title",
  "product": "HMI",
  "component": "A/B Testing",
  "status": "Active",
  "created": "2024-01-15",
  "updated": "2024-09-20"
}
```

Queryable by product:
- All HMI tests: `product = "HMI"`
- HMI A/B tests: `product = "HMI" AND component = "A/B Testing"`
- Cross-product: `product IN ["HMI", "CAMPAIGN"]`

## Tips

- **Versioning**: Name CSVs with versions: `test_cases_hmi_v1.csv`, `test_cases_hmi_v2.csv`
- **Deduplication**: Same test case from different exports = automatically updated (by key)
- **Incremental**: You can ingest test cases incrementally (per product or per batch)
- **Archiving**: Old CSVs stay in `current/`, watcher only processes new files
- **Logs**: Always check logs if ingestion seems stuck

## Next Steps

1. Run: `python3 setup_multi_product_folders.py`
2. Export CSVs from Jira (one per product)
3. Drop CSVs into `test_cases_inbox/{PRODUCT}/current/`
4. Run: `python3 watch_and_ingest.py`
5. Use agent: `python3 agent.py HMA-401957`
