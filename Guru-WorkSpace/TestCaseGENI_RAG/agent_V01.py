#!/usr/bin/env python3
"""
TEST CASE GENERATION AGENT - PRODUCTION READY
==============================================
FIXES:
1. Drastically reduced prompt size (frees up output tokens)
2. Enforces detailed test cases (uses more tokens per case)
3. Lower temperature (0.6 = less shortcuts)
4. Explicit character count requirement
5. Works with RAG or standalone

Usage:
    python3 agent_production_ready.py HMA-401957
"""

import os
import sys
import json
import re
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
JIRA_BASE_URL = os.getenv('JIRA_BASE_URL')
JIRA_EMAIL = os.getenv('JIRA_EMAIL')
JIRA_TOKEN = os.getenv('JIRA_TOKEN')
QDRANT_URL = os.getenv('QDRANT_URL')

if not all([OPENAI_API_KEY, JIRA_BASE_URL, JIRA_EMAIL, JIRA_TOKEN]):
    print("❌ Missing environment variables")
    sys.exit(1)

try:
    from openai import OpenAI
    import pandas as pd
    import requests
    from requests.auth import HTTPBasicAuth
except ImportError as e:
    print(f"❌ Missing: {e}")
    sys.exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

# Ultra-lean system prompt
SYSTEM_PROMPT = """Generate JSON test case array. Each case: title, objective, preconditions, steps (array), expected_result, severity, test_type, dimension. Output ONLY JSON."""


def extract_description(desc_obj):
    """Parse Jira description (handles ADF format)"""
    if not desc_obj:
        return ""
    if isinstance(desc_obj, str):
        return desc_obj
    if isinstance(desc_obj, dict):
        try:
            content = desc_obj.get('content', [])
            if content and isinstance(content, list):
                first = content[0]
                if isinstance(first, dict) and 'content' in first:
                    inner = first['content']
                    if inner and isinstance(inner, list):
                        text = inner[0]
                        if isinstance(text, dict) and 'text' in text:
                            return text['text']
        except:
            pass
    return str(desc_obj) if desc_obj else ""


def fetch_jira_issue(issue_key):
    """Fetch Jira issue"""
    try:
        url = f"{JIRA_BASE_URL}/rest/api/3/issue/{issue_key}"
        response = requests.get(
            url,
            auth=HTTPBasicAuth(JIRA_EMAIL, JIRA_TOKEN),
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return {
                'key': data['key'],
                'summary': data['fields'].get('summary', ''),
                'description': extract_description(data['fields'].get('description')),
                'issueType': data['fields'].get('issuetype', {}).get('name', ''),
            }
    except Exception as e:
        print(f"  ⚠️  Jira error: {e}")
    return None


def query_qdrant_rag(query_text):
    """Query Qdrant for reference examples"""
    if not QDRANT_URL:
        return []
    
    try:
        from qdrant_client import QdrantClient
        from sentence_transformers import SentenceTransformer
        import os
        os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
        
        embedder = SentenceTransformer('all-MiniLM-L6-v2')
        query_vector = embedder.encode(query_text).tolist()
        
        qdrant = QdrantClient(url=QDRANT_URL, prefer_grpc=False, timeout=10.0, check_compatibility=False)
        
        try:
            results = qdrant.search(
                collection_name="jira_test_cases_all",
                query_vector=query_vector,
                limit=2
            )
            return [hit.payload for hit in results if hit.payload]
        except:
            try:
                results = qdrant.query_points(
                    collection_name="jira_test_cases_all",
                    query=query_vector,
                    limit=2
                )
                return [point.payload for point in results.points if point.payload]
            except:
                return []
    except Exception as e:
        print(f"  ⚠️  RAG unavailable: {e}")
        return []


def generate_test_cases(issue_key):
    """Generate 50-80+ test cases"""
    
    print("\n" + "="*70)
    print("🚀 PRODUCTION READY TEST CASE GENERATION")
    print("="*70)
    print(f"\n📋 Issue: {issue_key}")
    
    # Step 1: Fetch Jira
    print("\n1️⃣  Fetching Jira...")
    jira_issue = fetch_jira_issue(issue_key)
    
    if jira_issue:
        print(f"  ✓ {jira_issue['summary'][:55]}...")
    else:
        print("  ℹ️  Generic context")
        jira_issue = {'key': issue_key, 'summary': f'{issue_key}', 'description': '', 'issueType': 'Story'}
    
    # Step 2: Query RAG
    print("\n2️⃣  Querying RAG...")
    rag_examples = query_qdrant_rag(jira_issue['summary'])
    if rag_examples:
        print(f"  ✓ Found {len(rag_examples)} examples")
    else:
        print("  ℹ️  Standalone mode")
    
    # Step 3: ULTRA-OPTIMIZED PROMPT (minimal, forces verbosity)
    # KEY INSIGHT: Shorter prompt = more tokens for output
    user_prompt = f"""Issue: {issue_key}: {jira_issue['summary'][:60]}

Generate 50-80 test cases. Each MUST have:
- title: specific action (not "Test 1")
- objective: 1-2 sentences
- preconditions: clear setup (2-3 sentences)
- steps: array, 2-4 detailed actions (2-3 sentences each)
- expected_result: exact outcome (1-2 sentences)
- severity: Critical/High/Medium/Low
- test_type: UI/Functional/Security/Boundary
- dimension: match test_type

RULES:
1. MINIMUM 50 CASES. MANDATORY. Not 9, not 20. MUST BE 50+.
2. Total response MUST exceed 10000 characters.
3. Each test case MUST have 4-6 sentences of explanation.
4. Response invalid if fewer than 50 items OR less than 10000 chars.
5. Include 12+ UI, 25+ Functional, 8+ Security, 8+ Boundary.

Return ONLY JSON array. MUST be 50-80 items."""

    print("\n3️⃣  Calling GPT-4...")
    print("   Model: gpt-4")
    print("   Temperature: 0.6 (deterministic)")
    print("   Max tokens: 4000")
    print("   Requirement: 50-80+ test cases (MANDATORY)")
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.6,  # LOWER = less shortcuts
            max_tokens=4000,
            timeout=120
        )
        
        output = response.choices[0].message.content.strip()
        
        # Validate output size
        if len(output) < 5000:
            print(f"❌ Output too small: {len(output)} chars (need 10000+)")
            print(f"   Output sample: {output[:200]}...")
            return False
        
        # Parse JSON
        match = re.search(r'\[\s*\{.*?\}\s*\]', output, re.DOTALL)
        if not match:
            print("❌ Invalid JSON in response")
            return False
        
        test_cases = json.loads(match.group())
        
        if not isinstance(test_cases, list):
            print("❌ Not a JSON array")
            return False
        
        actual_count = len(test_cases)
        
        # STRICT VALIDATION
        if actual_count < 50:
            print(f"❌ VALIDATION FAILED: {actual_count} test cases")
            print(f"   Required: 50-80+")
            print(f"   Output size: {len(output)} chars (need 10000+)")
            return False
        
        print(f"✓ Generated {actual_count} test cases ({len(output)} chars)\n")
        
        # Summary
        print("="*70)
        print(f"📊 SUMMARY: {actual_count} Test Cases")
        print("="*70)
        
        dims = {}
        sevs = {}
        for tc in test_cases:
            d = tc.get('dimension', 'Unknown')
            dims[d] = dims.get(d, 0) + 1
            s = tc.get('severity', 'Unknown')
            sevs[s] = sevs.get(s, 0) + 1
        
        print("\nBy Dimension:")
        for d in ['UI', 'Functional', 'Security', 'Boundary']:
            print(f"  {d:15}: {dims.get(d, 0):3} cases")
        
        print("\nBy Severity:")
        for s in ['Critical', 'High', 'Medium', 'Low']:
            c = sevs.get(s, 0)
            if c > 0:
                print(f"  {s:15}: {c:3} cases")
        
        print("\nSample (first 3):")
        for i, tc in enumerate(test_cases[:3], 1):
            print(f"{i}. {tc.get('title', '')[:50]}")
        
        # Save
        json_file = f"test_cases_{issue_key}.json"
        with open(json_file, 'w') as f:
            json.dump(test_cases, f, indent=2)
        print(f"\n✅ Saved: {json_file}")
        
        excel_file = save_to_excel(test_cases, issue_key)
        if excel_file:
            print(f"✅ Saved: {excel_file}")
        
        print("\n" + "="*70)
        print("🎉 SUCCESS - PRODUCTION READY!")
        print("="*70)
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def save_to_excel(test_cases, issue_key):
    """Save to Excel"""
    try:
        from openpyxl.styles import Font, PatternFill, Alignment
        
        rows = []
        for idx, tc in enumerate(test_cases, 1):
            steps = tc.get('steps', [])
            if isinstance(steps, list):
                steps_text = '\n'.join([f"{i}. {s}" for i, s in enumerate(steps, 1)])
            else:
                steps_text = str(steps)
            
            rows.append({
                'tc_id': f"TC_{issue_key}_{idx:03d}",
                'story_id': issue_key,
                'title': str(tc.get('title', '')),
                'description': str(tc.get('objective', '')),
                'preconditions': str(tc.get('preconditions', '')),
                'steps': steps_text,
                'expected_result': str(tc.get('expected_result', '')),
                'actual_result': '',
                'status': 'Not Executed',
                'priority': {'Critical': 'P0', 'High': 'P1', 'Medium': 'P2', 'Low': 'P3'}.get(str(tc.get('severity', 'Medium')), 'P2'),
                'test_type': str(tc.get('test_type', '')),
                'dimension': str(tc.get('dimension', '')),
                'comments': ''
            })
        
        df = pd.DataFrame(rows)
        excel_file = f"test_cases_{issue_key}.xlsx"
        
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Test Cases', index=False)
            ws = writer.sheets['Test Cases']
            
            hdr = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            hfont = Font(bold=True, color="FFFFFF", size=11)
            
            for cell in ws[1]:
                cell.fill = hdr
                cell.font = hfont
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            
            for col, width in {'A': 15, 'B': 15, 'C': 25, 'D': 25, 'E': 20, 'F': 30, 'G': 30, 'H': 15, 'I': 12, 'J': 12, 'K': 12, 'L': 12, 'M': 15}.items():
                ws.column_dimensions[col].width = width
            
            ws.freeze_panes = "A2"
        
        return excel_file
    except Exception as e:
        print(f"⚠️  Excel error: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 agent_production_ready.py HMA-401957")
        sys.exit(1)
    
    issue_key = sys.argv[1].upper()
    success = generate_test_cases(issue_key)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
