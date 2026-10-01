#!/usr/bin/env python3
"""
Jira RAG + Test Case Agent (V3.11 - Contesting Entity Test Cases)
Generates 50-80 test cases from a Jira issue using multi-batch GPT-4 + RAG

Features:
- Top 3 RAG results included as "Contesting Entity Test Cases" (baseline/reference)
- These are merged into Excel as the first 3 rows (marked as contesting entities)
- Remaining generated cases follow after, totaling 50-80+ cases
- Fixed timeout + retry logic
"""

import os
import sys
import json
import time
from typing import Optional
from dotenv import load_dotenv
from jira import JIRA
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from sentence_transformers import SentenceTransformer
from openai import OpenAI
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment
import re

load_dotenv()

# Configuration
JIRA_BASE_URL = os.getenv("JIRA_BASE_URL")
JIRA_EMAIL = os.getenv("JIRA_EMAIL")
JIRA_TOKEN = os.getenv("JIRA_TOKEN")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize clients
jira = JIRA(server=JIRA_BASE_URL, basic_auth=(JIRA_EMAIL, JIRA_TOKEN))
embedder = SentenceTransformer('all-MiniLM-L6-v2')
qdrant = QdrantClient(url=QDRANT_URL, prefer_grpc=False, timeout=10.0, check_compatibility=False)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# RAG settings
RAG_SIMILARITY_THRESHOLD = 0.40
RAG_MAX_EXAMPLES = 3  # Top 3 for contesting entity test cases
RAG_MAX_CONTEXT = 3   # Top 3 for prompt context

# Timeout settings
GPT_TIMEOUT = 180
MAX_RETRIES = 3
RETRY_DELAY = 5


def extract_description(issue):
    """Extract text from Jira ADF description."""
    desc = issue.fields.description
    if not desc:
        return ""
    
    if isinstance(desc, dict) and 'content' in desc:
        # ADF format
        texts = []
        for block in desc.get('content', []):
            if block.get('type') == 'paragraph':
                for content in block.get('content', []):
                    if content.get('type') == 'text':
                        texts.append(content.get('text', ''))
        return ' '.join(texts)
    elif isinstance(desc, str):
        return desc
    return ""


def extract_test_case_from_payload(payload: dict) -> dict:
    """Extract test case data from nested payload structure."""
    
    if not payload:
        return {}
    
    metadata = payload.get('metadata', {})
    
    return {
        'title': payload.get('summary', 'Unknown'),
        'test_type': metadata.get('test_type', 'Unknown'),
        'severity': metadata.get('severity', 'Unknown'),
        'objective': metadata.get('objective', ''),
        'precondition': metadata.get('precondition', ''),
        'steps': metadata.get('steps', ''),
        'expected_result': metadata.get('expected_result', ''),
        'priority': metadata.get('priority', 'Medium'),
        'test_key': payload.get('key', ''),
        'product': payload.get('product', ''),
    }


def query_qdrant_rag_with_filtering(issue_summary: str, issue_description: str) -> tuple:
    """
    Query Qdrant and return both:
    1. Top 3 results for "contesting entity test cases"
    2. Filtered results for prompt context
    """
    print("\n[RAG] Querying Qdrant...")
    
    # Embed the query
    query_text = f"{issue_summary} {issue_description}"
    query_vector = embedder.encode(query_text).tolist()
    
    try:
        # Query Qdrant
        results = qdrant.query_points(
            collection_name='jira_test_cases_all',
            query=query_vector,
            limit=10
        )
        
        print(f"[RAG] Total results found: {len(results.points)}")
        
        # Filter by threshold
        filtered = []
        contesting_entities = []
        
        for i, point in enumerate(results.points):
            score = point.score
            payload = point.payload or {}
            
            # Extract nested test case data
            tc_data = extract_test_case_from_payload(payload)
            
            title = tc_data.get('title', 'Unknown')
            test_type = tc_data.get('test_type', 'Unknown')
            severity = tc_data.get('severity', 'Unknown')
            
            status = "✅ PASS" if score >= RAG_SIMILARITY_THRESHOLD else "❌ REJECT"
            print(f"[RAG] {status} | Score: {score:.3f} | {title[:60]} | Type: {test_type} | Severity: {severity}")
            
            if score >= RAG_SIMILARITY_THRESHOLD:
                filtered.append(tc_data)
                
                # Top 3 are contesting entities
                if i < RAG_MAX_EXAMPLES:
                    contesting_entities.append(tc_data)
        
        print(f"[RAG] After filtering (threshold {RAG_SIMILARITY_THRESHOLD}): {len(filtered)} relevant cases")
        print(f"[RAG] Top 3 marked as CONTESTING ENTITY TEST CASES")
        
        return contesting_entities, filtered
    
    except Exception as e:
        print(f"[RAG] ❌ Error querying Qdrant: {e}")
        import traceback
        traceback.print_exc()
        return [], []


def format_rag_examples(rag_results: list) -> str:
    """Format RAG results for the prompt (use top 3)."""
    if not rag_results:
        return "No similar test cases available."
    
    # Use top 3 for context
    examples_to_use = rag_results[:RAG_MAX_CONTEXT]
    
    examples = f"Here are {len(examples_to_use)} similar test cases from the knowledge base (from product: INTERACT):\n\n"
    for i, result in enumerate(examples_to_use, 1):
        examples += f"{i}. {result.get('title', 'Unknown')}\n"
        examples += f"   Objective: {result.get('objective', 'N/A')[:80]}\n"
        examples += f"   Type: {result.get('test_type', 'Unknown')}\n"
        examples += f"   Severity: {result.get('severity', 'Unknown')}\n\n"
    
    return examples


def extract_json_from_response(response_text: str) -> list:
    """Extract JSON from GPT response with 5 fallback strategies."""
    
    # Strategy 1: Strip markdown fences
    cleaned = re.sub(r'^```(?:json)?\s*', '', response_text, flags=re.MULTILINE)
    cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    
    # Strategy 2: Find JSON array in the text
    match = re.search(r'\[.*\]', cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    
    # Strategy 3: Try to parse entire cleaned text
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    
    # Strategy 4: Clean and parse
    cleaned2 = re.sub(r'[\n\r]', ' ', cleaned)
    cleaned2 = re.sub(r'\s+', ' ', cleaned2).strip()
    try:
        return json.loads(cleaned2)
    except json.JSONDecodeError:
        pass
    
    # Strategy 5: Find first [ to last ]
    first_bracket = response_text.find('[')
    last_bracket = response_text.rfind(']')
    if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
        try:
            return json.loads(response_text[first_bracket:last_bracket+1])
        except json.JSONDecodeError:
            pass
    
    print("❌ Failed to extract JSON after 5 strategies")
    return []


def generate_test_cases_with_retry(issue_key: str, issue_summary: str, issue_description: str, 
                                   rag_results: list, batch_num: int, batch_size: int = 25) -> list:
    """Generate test cases with retry logic on timeout."""
    
    for attempt in range(1, MAX_RETRIES + 1):
        print(f"\n[GPT-4] Batch {batch_num}: Generating {batch_size} test cases (attempt {attempt}/{MAX_RETRIES})...")
        
        rag_context = format_rag_examples(rag_results)
        
        prompt = f"""You are an expert QA engineer. Generate EXACTLY {batch_size} test cases for this Jira issue.

Issue: {issue_key}
Summary: {issue_summary}
Description: {issue_description}

{rag_context}

Requirements:
1. Generate EXACTLY {batch_size} test cases (not fewer, not more)
2. Return ONLY valid JSON array, no markdown fences, no extra text
3. Each test case must have: title, description, preconditions, steps, expected_result, test_type
4. Do NOT generate generic login/auth test cases unless explicitly required
5. Focus on the specific functionality described
6. Match the style and detail level of the examples provided

Return format (ONLY this, no explanation):
[{{"title": "...", "description": "...", "preconditions": "...", "steps": "...", "expected_result": "...", "test_type": "Functional"}}]
"""
        
        try:
            print(f"   ⏳ Waiting for GPT-4 response (timeout: {GPT_TIMEOUT}s)...")
            
            response = openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a QA test case generator. Always return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=4000,
                timeout=GPT_TIMEOUT
            )
            
            response_text = response.choices[0].message.content.strip()
            print(f"   ✓ Response received ({len(response_text)} chars)")
            
            test_cases = extract_json_from_response(response_text)
            
            if not isinstance(test_cases, list):
                print(f"   ❌ Expected list, got {type(test_cases)}")
                continue
            
            print(f"✅ Batch {batch_num}: Generated {len(test_cases)} test cases")
            return test_cases
        
        except Exception as e:
            error_msg = str(e)
            
            if "timed out" in error_msg.lower() or "timeout" in error_msg.lower():
                print(f"   ⏱️  Timeout: {error_msg}")
                
                if attempt < MAX_RETRIES:
                    wait_time = RETRY_DELAY * attempt
                    print(f"   ⏳ Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"   ❌ Failed after {MAX_RETRIES} attempts")
                    return []
            else:
                print(f"   ❌ Batch {batch_num} Error: {e}")
                import traceback
                traceback.print_exc()
                return []
    
    return []


def create_excel_workbook(issue_key: str, contesting_entities: list, all_test_cases: list):
    """Create Excel workbook with contesting entity test cases + generated test cases."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Test Cases"
    
    # Headers
    headers = ["tc_id", "story_id", "title", "description", "preconditions", 
               "steps", "expected_result", "actual_result", "status", "priority", 
               "test_type", "dimension", "comments"]
    ws.append(headers)
    
    # Style header
    blue_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    white_font = Font(bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = blue_fill
        cell.font = white_font
    
    # Freeze header row
    ws.freeze_panes = "A2"
    
    row_num = 2
    
    # Add contesting entity test cases (top 3 from RAG)
    if contesting_entities:
        print(f"\n[Excel] Adding {len(contesting_entities)} contesting entity test cases...")
        
        # Add separator comment
        ws[f"A{row_num}"].value = "=== CONTESTING ENTITY TEST CASES (from RAG) ==="
        ws.merge_cells(f"A{row_num}:M{row_num}")
        separator_fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
        ws[f"A{row_num}"].fill = separator_fill
        row_num += 1
        
        for idx, tc in enumerate(contesting_entities, 1):
            tc_id = f"CE_{issue_key}_{idx:03d}"  # CE = Contesting Entity
            row = [
                tc_id,
                issue_key,
                tc.get("title", ""),
                tc.get("objective", ""),  # Use objective as description for RAG cases
                tc.get("precondition", ""),
                tc.get("steps", ""),
                tc.get("expected_result", ""),
                "",  # actual_result
                "Reference",  # status = Reference
                tc.get("priority", "Medium"),
                tc.get("test_type", "Unknown"),
                "",  # dimension
                "Retrieved from RAG"
            ]
            ws.append(row)
            
            # Highlight contesting entity rows
            entity_fill = PatternFill(start_color="FFFFCC", end_color="FFFFCC", fill_type="solid")
            for cell in ws[row_num]:
                cell.fill = entity_fill
            
            row_num += 1
    
    # Add separator
    ws[f"A{row_num}"].value = "=== GENERATED TEST CASES ==="
    ws.merge_cells(f"A{row_num}:M{row_num}")
    separator_fill = PatternFill(start_color="C6E0B4", end_color="C6E0B4", fill_type="solid")
    ws[f"A{row_num}"].fill = separator_fill
    row_num += 1
    
    # Add generated test cases
    print(f"[Excel] Adding {len(all_test_cases)} generated test cases...")
    
    for idx, tc in enumerate(all_test_cases, 1):
        tc_id = f"TC_{issue_key}_{idx:03d}"
        row = [
            tc_id,
            issue_key,
            tc.get("title", ""),
            tc.get("description", ""),
            tc.get("preconditions", ""),
            tc.get("steps", ""),
            tc.get("expected_result", ""),
            "",  # actual_result
            "Not Executed",
            "P2",  # priority
            tc.get("test_type", "Functional"),
            "",  # dimension
            ""   # comments
        ]
        ws.append(row)
        row_num += 1
    
    # Set column widths
    column_widths = [20, 15, 30, 40, 40, 40, 40, 15, 15, 8, 15, 15, 20]
    for i, width in enumerate(column_widths, 1):
        ws.column_dimensions[chr(64 + i)].width = width
    
    output_file = f"test_cases_{issue_key}.xlsx"
    wb.save(output_file)
    print(f"\n✅ Excel file created: {output_file}")
    print(f"   - Contesting Entity Test Cases (RAG Top 3): {len(contesting_entities)}")
    print(f"   - Generated Test Cases: {len(all_test_cases)}")
    print(f"   - TOTAL: {len(contesting_entities) + len(all_test_cases)}")
    return output_file


def main(issue_key: str):
    """Main agent loop."""
    print("=" * 80)
    print(f"Jira RAG Test Case Agent (V3.11 - Contesting Entity Test Cases)")
    print(f"RAG Threshold: {RAG_SIMILARITY_THRESHOLD}")
    print(f"GPT-4 Timeout: {GPT_TIMEOUT}s, Max Retries: {MAX_RETRIES}")
    print(f"Issue: {issue_key}")
    print("=" * 80)
    
    # Fetch issue
    print(f"\n[Jira] Fetching issue {issue_key}...")
    try:
        issue = jira.issue(issue_key)
    except Exception as e:
        print(f"❌ Failed to fetch issue: {e}")
        return
    
    summary = issue.fields.summary
    description = extract_description(issue)
    
    print(f"Summary: {summary}")
    print(f"Description length: {len(description)} chars")
    
    # Query RAG - returns both contesting entities and filtered results
    contesting_entities, rag_results = query_qdrant_rag_with_filtering(summary, description)
    
    # Multi-batch generation with retry
    all_test_cases = []
    
    # Batch 1: 25 cases
    batch1 = generate_test_cases_with_retry(issue_key, summary, description, rag_results, 1, 25)
    all_test_cases.extend(batch1)
    
    # Batch 2: 24 cases
    batch2 = generate_test_cases_with_retry(issue_key, summary, description, rag_results, 2, 24)
    all_test_cases.extend(batch2)
    
    # Batch 3: 15 cases (optional, if 50+ needed)
    if len(all_test_cases) < 50:
        batch3 = generate_test_cases_with_retry(issue_key, summary, description, rag_results, 3, 15)
        all_test_cases.extend(batch3)
    
    print(f"\n" + "=" * 80)
    print(f"CONTESTING ENTITY TEST CASES: {len(contesting_entities)}")
    print(f"GENERATED TEST CASES: {len(all_test_cases)}")
    print(f"TOTAL TEST CASES: {len(contesting_entities) + len(all_test_cases)}")
    print("=" * 80)
    
    # Create Excel with both contesting entities and generated cases
    if all_test_cases or contesting_entities:
        create_excel_workbook(issue_key, contesting_entities, all_test_cases)
    else:
        print("❌ No test cases generated.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 agent_production_ready_v3_11_contesting_entity.py <ISSUE_KEY>")
        print("Example: python3 agent_production_ready_v3_11_contesting_entity.py HMA-401957")
        sys.exit(1)
    
    issue_key = sys.argv[1].upper()
    main(issue_key)
