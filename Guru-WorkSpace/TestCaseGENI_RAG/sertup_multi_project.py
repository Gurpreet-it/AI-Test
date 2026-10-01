#!/usr/bin/env python3
"""
Multi-Product Folder Structure Setup

Creates organized folder structure for each product with input/output paths.
Auto-initializes all folders and generates config.json.

Usage:
  python3 setup_multi_product_folders.py
  python3 setup_multi_product_folders.py --dry-run
"""

import os
import json
import argparse
from pathlib import Path

# Product definitions with metadata
PRODUCTS = {
    'HMI': {
        'name': 'PnP Marketing Interact (HMI)',
        'project_key': 'HMI',
        'project_id': 10077,
        'description': 'Unica Interact - A/B testing, segment matching'
    },
    'CAMPAIGN': {
        'name': 'Unica Campaign',
        'project_key': 'CAMPAIGN',
        'project_id': None,
        'description': 'Campaign management and orchestration'
    },
    'INTERACT': {
        'name': 'Unica Interact',
        'project_key': 'INTERACT',
        'project_id': None,
        'description': 'Real-time customer interactions'
    },
    'OPTIMIZE': {
        'name': 'Unica Optimize',
        'project_key': 'OPTIMIZE',
        'project_id': None,
        'description': 'Optimization and experimentation'
    },
    'JOURNEY': {
        'name': 'Unica Journey',
        'project_key': 'JOURNEY',
        'project_id': None,
        'description': 'Customer journey orchestration'
    },
    'PLAN': {
        'name': 'Unica Plan',
        'project_key': 'PLAN',
        'project_id': None,
        'description': 'Marketing planning and budgeting'
    },
    'MAXAI': {
        'name': 'MaxAI (Conversational AI)',
        'project_key': 'MAXAI',
        'project_id': None,
        'description': 'Agentic AI platform for conversations'
    },
    'COGNOS': {
        'name': 'IBM Cognos Analytics',
        'project_key': 'COGNOS',
        'project_id': None,
        'description': 'Business intelligence and reporting'
    },
}

def create_folder_structure(dry_run=False):
    """Create multi-product folder structure"""
    
    base_dirs = {
        'inbox': 'test_cases_inbox',
        'processed': 'test_cases_processed',
        'logs': 'ingestion_logs',
        'archive': 'test_cases_archive',
    }
    
    folders_to_create = []
    
    # Create base directories
    for base_name, base_path in base_dirs.items():
        folders_to_create.append(base_path)
        
        # Create product-specific subdirectories
        for product_key in PRODUCTS.keys():
            product_folder = os.path.join(base_path, product_key)
            folders_to_create.append(product_folder)
            
            # Create version-tracking subdirectories in inbox
            if base_name == 'inbox':
                folders_to_create.append(os.path.join(product_folder, 'current'))
                folders_to_create.append(os.path.join(product_folder, 'archive'))
    
    print()
    print("=" * 80)
    print("MULTI-PRODUCT FOLDER STRUCTURE SETUP")
    print("=" * 80)
    print()
    
    if dry_run:
        print("[DRY RUN] Folders to be created:\n")
    else:
        print("[CREATING] Folders...\n")
    
    created_count = 0
    for folder in sorted(folders_to_create):
        if dry_run:
            print(f"  📁 {folder}/")
        else:
            Path(folder).mkdir(parents=True, exist_ok=True)
            print(f"  ✓ {folder}/")
            created_count += 1
    
    print()
    if not dry_run:
        print(f"✓ Created {created_count} folders")
    
    return folders_to_create

def create_config_json(dry_run=False):
    """Generate config.json with product-specific input paths"""
    
    config = {
        'version': '1.0',
        'description': 'Multi-product Jira test case ingestion configuration',
        'qdrant': {
            'url': 'http://localhost:6333',
            'collection_name': 'jira_test_cases_all',
            'embedding_model': 'all-MiniLM-L6-v2',
            'vector_size': 384
        },
        'watcher': {
            'watch_interval_seconds': 5,
            'batch_size': 50,
            'inbox_base': 'test_cases_inbox',
            'processed_base': 'test_cases_processed',
            'archive_base': 'test_cases_archive',
            'logs_base': 'ingestion_logs'
        },
        'products': {}
    }
    
    # Add product-specific paths
    for product_key, product_info in PRODUCTS.items():
        config['products'][product_key] = {
            'name': product_info['name'],
            'description': product_info['description'],
            'project_key': product_info['project_key'],
            'project_id': product_info['project_id'],
            'paths': {
                'input': {
                    'inbox_current': f'test_cases_inbox/{product_key}/current/',
                    'inbox_archive': f'test_cases_inbox/{product_key}/archive/',
                    'description': 'Drop CSV files in /current, archive old versions in /archive'
                },
                'output': {
                    'processed': f'test_cases_processed/{product_key}/',
                    'archive': f'test_cases_archive/{product_key}/',
                    'logs': f'ingestion_logs/{product_key}/',
                    'description': 'Processed CSVs moved here, logs stored in logs/'
                }
            },
            'qdrant': {
                'collection': 'jira_test_cases_all',
                'metadata_filter': {'product': product_key},
                'description': 'All products use single collection, filtered by product metadata'
            }
        }
    
    config_file = 'config.json'
    
    if dry_run:
        print(f"\n[DRY RUN] Config file to be created: {config_file}\n")
        print(json.dumps(config, indent=2)[:500] + "\n... (truncated)\n")
    else:
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"\n✓ Created: {config_file}")
    
    return config

def create_readme(dry_run=False):
    """Create README with folder structure and instructions"""
    
    readme_content = """# Multi-Product Jira Test Case Ingestion

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
"""
    
    readme_file = 'FOLDER_STRUCTURE.md'
    
    if dry_run:
        print(f"\n[DRY RUN] README file to be created: {readme_file}")
        print("\nContent preview:\n")
        print(readme_content[:800] + "\n... (truncated)\n")
    else:
        with open(readme_file, 'w') as f:
            f.write(readme_content)
        print(f"✓ Created: {readme_file}")
    
    return readme_file

def main():
    parser = argparse.ArgumentParser(
        description='Set up multi-product folder structure and configuration'
    )
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be created without creating it')
    args = parser.parse_args()
    
    # Create folders
    folders = create_folder_structure(dry_run=args.dry_run)
    
    # Create config.json
    config = create_config_json(dry_run=args.dry_run)
    
    # Create README
    readme = create_readme(dry_run=args.dry_run)
    
    # Print summary
    print()
    print("=" * 80)
    if args.dry_run:
        print("DRY RUN SUMMARY")
        print(f"  Folders to create: {len(folders)}")
        print(f"  Products configured: {len(PRODUCTS)}")
    else:
        print("SETUP COMPLETE ✓")
        print()
        print("Next steps:")
        print("  1. Review config.json for product paths")
        print("  2. Review FOLDER_STRUCTURE.md for folder layout")
        print("  3. Export test case CSVs from Jira")
        print("  4. Drop CSVs into test_cases_inbox/{PRODUCT}/current/")
        print("  5. Run: python3 watch_and_ingest.py")
    print("=" * 80)
    print()
    
    # Show product input paths
    print("\nPRODUCT INPUT PATHS:\n")
    for product_key in sorted(PRODUCTS.keys()):
        product_name = PRODUCTS[product_key]['name']
        input_path = f"test_cases_inbox/{product_key}/current/"
        print(f"  {product_key:12} ({product_name:40}) → {input_path}")
    
    print()

if __name__ == '__main__':
    main()
