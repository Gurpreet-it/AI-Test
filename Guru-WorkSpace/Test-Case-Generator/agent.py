import json
import re
import requests
from typing import Any, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== CONFIG FOR QWEN 128K ====================

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen-128k:latest"

# Qwen 128K-specific: Can handle much longer context
QWEN_128K_CONFIG = {
    "temperature": 0.5,       # Lower with extended context (more coherent)
    "top_p": 0.8,             # More constrained
    "top_k": 25,              # Smaller vocabulary pool
    "num_predict": 1024,      # Can be lower (more context fed in)
    "repeat_penalty": 1.15,   # Higher to avoid repetition
}

# ==================== OLLAMA CLIENT ====================

class OllamaClient:
    def __init__(self, base_url: str = OLLAMA_BASE_URL):
        self.base_url = base_url
    
    def generate(self, model: str, prompt: str, system: str = None, 
                 max_tokens: int = 1024) -> str:
        """Call Ollama with Qwen 128K tuning."""
        
        options = QWEN_128K_CONFIG.copy()
        options["num_predict"] = max_tokens
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": options
        }
        
        if system:
            payload["system"] = system
        
        url = f"{self.base_url}/api/generate"
        response = requests.post(url, json=payload, timeout=180)  # Longer timeout
        response.raise_for_status()
        
        return response.json()["response"]
    
    def embed(self, model: str, text: str) -> list[float]:
        """Generate embeddings."""
        payload = {"model": model, "prompt": text}
        url = f"{self.base_url}/api/embeddings"
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()["embedding"]

ollama = OllamaClient()

# ==================== LEVERAGE 128K: FETCH EXAMPLES ====================

def get_repository_examples(product: str, count: int = 15) -> list[dict]:
    """
    Fetch test case examples from repository to include in prompt.
    With 128K context, we can include 15+ examples without issue.
    
    This leverages the extended context window for better few-shot learning.
    """
    from qdrant_client import QdrantClient
    
    client = QdrantClient("http://localhost:6333")
    
    filters = {
        "must": [
            {"key": "subproduct", "match": {"value": product}},
            {"key": "status", "match": {"value": "active"}},
            {"key": "test_category", "match": {"value": "core"}}
        ]
    }
    
    # Get diverse examples by querying with generic terms
    query_terms = [
        "basic functionality test",
        "integration with other modules",
        "error handling",
        "edge case",
        "performance"
    ]
    
    examples = []
    for term in query_terms:
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("all-MiniLM-L6-v2")
            query_vector = model.encode(term).tolist()
            
            results = client.search(
                collection_name="jira_test_cases_all",
                query_vector=query_vector,
                limit=3,
                query_filter=filters
            )
            
            for hit in results:
                if hit.payload["jira_key"] not in [e["jira_key"] for e in examples]:
                    examples.append({
                        "jira_key": hit.payload["jira_key"],
                        "title": hit.payload.get("title", ""),
                        "test_type": hit.payload["metadata"].get("test_type"),
                        "steps": hit.payload["text"][:400],  # Truncate steps
                    })
                    if len(examples) >= count:
                        return examples
        except Exception as e:
            logger.warning(f"Failed to fetch examples for '{term}': {e}")
    
    return examples

# ==================== TOOLS ====================

def query_rag(query: str, product: str = None, limit: int = 5) -> dict:
    """Query Qdrant for similar test cases."""
    from qdrant_client import QdrantClient
    
    client = QdrantClient("http://localhost:6333")
    
    filters = {"must": [{"key": "status", "match": {"value": "active"}}]}
    if product:
        filters["must"].append({"key": "subproduct", "match": {"value": product}})
    
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        query_vector = model.encode(query).tolist()
        
        results = client.search(
            collection_name="jira_test_cases_all",
            query_vector=query_vector,
            limit=limit,
            query_filter=filters
        )
        
        return {
            "status": "success",
            "count": len(results),
            "results": [
                {
                    "jira_key": hit.payload["jira_key"],
                    "title": hit.payload.get("title", ""),
                    "test_case": hit.payload["text"][:500],
                    "component": hit.payload["metadata"].get("component"),
                    "test_type": hit.payload["metadata"].get("test_type"),
                }
                for hit in results
            ]
        }
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        return {"status": "error", "message": str(e)}

def get_jira_context(issue_key: str) -> dict:
    """Fetch Jira issue details."""
    try:
        from jira import JIRA
        jira = JIRA("https://your-jira.atlassian.net", basic_auth=("user", "token"))
        issue = jira.issue(issue_key)
        
        return {
            "status": "success",
            "issue_key": issue_key,
            "summary": issue.fields.summary,
            "description": (issue.fields.description or "")[:2000],  # Can be longer with 128K
            "issue_type": issue.fields.issuetype.name,
            "components": [c.name for c in issue.fields.components] if issue.fields.components else [],
            "priority": issue.fields.priority.name if issue.fields.priority else "Medium",
        }
    except Exception as e:
        logger.error(f"Jira fetch failed: {e}")
        return {"status": "error", "message": str(e)}

def execute_tool(tool_name: str, args: dict) -> dict:
    """Execute a tool."""
    if tool_name == "query_rag":
        return query_rag(**args)
    elif tool_name == "get_jira_context":
        return get_jira_context(**args)
    else:
        return {"status": "error", "message": f"Unknown tool: {tool_name}"}

# ==================== QWEN 128K SYSTEM PROMPT ====================

def build_system_prompt(product: str = None) -> str:
    """
    Build system prompt that leverages 128K context.
    Include repository examples for better few-shot learning.
    """
    
    base_prompt = """You are a senior QA engineer at HCL Software specializing in test case design.

AVAILABLE TOOLS:
Use these exact XML formats when you need data:
<tool name="query_rag">{"query": "what you're looking for", "product": "ProductName", "limit": 5}</tool>
<tool name="get_jira_context">{"issue_key": "PROJ-123"}</tool>

WORKFLOW:
1. Fetch Jira context to understand the requirement
2. Query repository for similar test cases
3. Generate 5-10 comprehensive test cases

OUTPUT FORMAT (ONLY JSON):
[
  {
    "title": "Brief description",
    "description": "Why test this",
    "test_type": "functional|regression|integration|security|performance",
    "steps": ["1. Step", "2. Step", "3. Verify"],
    "expected_result": "What should happen",
    "severity": "critical|high|medium|low",
    "component": "Component name",
    "is_integration": false,
    "jira_issue": "PROJ-123"
  }
]

CRITICAL RULES:
- Use tools BEFORE generating test cases
- Ground test cases in requirement AND repository examples
- Cover happy path, edge cases, error states, and performance edge cases
- Output ONLY JSON. No explanations, no preamble.
- If no JSON can be generated, output empty array: []
"""
    
    # Add repository examples (leverage 128K context window)
    if product:
        examples = get_repository_examples(product, count=12)
        
        if examples:
            base_prompt += f"\n\nREPOSITORY EXAMPLES FOR {product.upper()}:\nHere are 12+ test cases from your repository to use as pattern references:\n"
            
            for i, ex in enumerate(examples, 1):
                base_prompt += f"\n{i}. [{ex['jira_key']}] {ex['title']} (Type: {ex['test_type']})\n"
                base_prompt += f"   Steps: {ex['steps'][:200]}...\n"
            
            base_prompt += "\nUse these examples to match patterns, structure, and rigor level for your new test cases."
    
    return base_prompt

# ==================== TOOL CALLING PARSER ====================

def parse_tool_calls(text: str) -> list[dict]:
    """Extract tool calls from Qwen output."""
    pattern = r'<tool\s+name="([^"]+)"\s*>\s*({[^}]*}(?:{[^}]*})*)\s*</tool>'
    matches = re.findall(pattern, text, re.DOTALL)
    
    tools = []
    for tool_name, json_str in matches:
        try:
            args = json.loads(json_str)
            tools.append({"name": tool_name, "args": args})
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse tool: {json_str}")
    
    return tools

def extract_test_cases(text: str) -> list[dict]:
    """Extract JSON from Qwen output."""
    try:
        start = text.find("[")
        end = text.rfind("]") + 1
        
        if start >= 0 and end > start:
            json_str = text[start:end]
            test_cases = json.loads(json_str)
            
            if isinstance(test_cases, list) and len(test_cases) > 0:
                return test_cases
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
    
    return []

# ==================== MAIN AGENT LOOP ====================

def generate_test_cases(
    jira_issue_key: str,
    design_doc: str = None,
    estimate_snapshot: str = None,
    product: str = None,
    max_iterations: int = 4,
    include_examples: bool = True  # NEW: leverage 128K context
) -> list[dict]:
    """
    Main agent loop optimized for Qwen 128K.
    
    With 128K context:
    - Can include 12+ repository examples
    - Longer conversations without context collapse
    - Better reasoning over multiple turns
    """
    
    # Build system prompt with examples (leverages 128K)
    system_prompt = build_system_prompt(product if include_examples else None)
    
    user_message = f"""Generate comprehensive test cases for: {jira_issue_key}

REQUIREMENT:
{design_doc or "(No design doc)"}

ESTIMATE:
{estimate_snapshot or "(Not provided)"}

INSTRUCTIONS:
1. Fetch full context for {jira_issue_key} using get_jira_context
2. Query repository for similar test cases to understand patterns
3. Generate 5-10 test cases grounded in requirement + examples
4. Output ONLY JSON array, no other text
"""
    
    messages = [{"role": "user", "content": user_message}]
    
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        logger.info(f"\n{'='*60}\nIteration {iteration}/{max_iterations}\n{'='*60}")
        
        # Build conversation
        conversation_text = ""
        for msg in messages:
            conversation_text += f"{msg['role'].upper()}: {msg['content']}\n\n"
        
        full_prompt = f"{conversation_text}Assistant:"
        
        # Call Qwen
        logger.info("Calling Qwen 128K...")
        try:
            response_text = ollama.generate(
                model=OLLAMA_MODEL,
                prompt=full_prompt,
                system=system_prompt,
                max_tokens=1024
            )
        except Exception as e:
            logger.error(f"Ollama call failed: {e}")
            return []
        
        logger.info(f"Response: {len(response_text)} chars")
        messages.append({"role": "assistant", "content": response_text})
        
        # Parse tool calls
        tool_calls = parse_tool_calls(response_text)
        logger.info(f"Tool calls found: {len(tool_calls)}")
        
        if not tool_calls:
            # No tool calls = done. Extract test cases.
            test_cases = extract_test_cases(response_text)
            if test_cases:
                logger.info(f"✓ Extracted {len(test_cases)} test cases")
                return test_cases
            else:
                logger.warning("No valid test cases extracted")
                return []
        
        # Execute tools
        tool_results = []
        for tool in tool_calls:
            logger.info(f"Executing: {tool['name']}")
            result = execute_tool(tool["name"], tool["args"])
            
            result_text = f"""<tool_result name="{tool['name']}">
{json.dumps(result, indent=2)}
</tool_result>"""
            
            tool_results.append(result_text)
        
        # Feedback
        combined_results = "\n\n".join(tool_results)
        feedback = f"""Tool results:

{combined_results}

Now generate the test cases. Output ONLY JSON array."""
        
        messages.append({"role": "user", "content": feedback})
    
    logger.error("Max iterations reached")
    return []

# ==================== ENTRYPOINT ====================

if __name__ == "__main__":
    import sys
    
    issue_key = sys.argv[1] if len(sys.argv) > 1 else "UNICA-INTERACT-888"
    
    # Extract product from issue key if possible
    product = None
    if "-" in issue_key:
        parts = issue_key.split("-")
        if len(parts) >= 2:
            product_map = {
                "CAMPAIGN": "Campaign",
                "INTERACT": "Interact",
                "OPTIMIZE": "Optimize",
                "JOURNEY": "Journey",
                "PLAN": "Plan",
                "MAXAI": "MaxAI"
            }
            product = product_map.get(parts[1].upper())
    
    test_cases = generate_test_cases(
        jira_issue_key=issue_key,
        design_doc="""
        Feature: Dynamic content personalization in email templates
        
        Marketers should be able to insert dynamic content blocks in email templates
        that change based on real-time user attributes:
        
        - User segment membership (real-time updated)
        - Cart value and product affinity
        - Email engagement history
        - Device type and browser
        
        Requirements:
        - Support up to 50 dynamic blocks per template
        - Fallback content if user doesn't match any rule
        - Performance: Template render < 500ms with 100K+ concurrent users
        - A/B testing support for dynamic blocks
        - Audit trail for all dynamic block updates
        
        Constraints:
        - Must work with existing Campaign segment exports
        - Backward compatible with non-dynamic templates
        - No database schema changes (use JSON storage)
        """,
        estimate_snapshot="21 story points. Very high complexity. Involves: Interact (core), Campaign (data sync), infrastructure (caching).",
        product=product,
        include_examples=True  # Leverage 128K context
    )
    
    print("\n" + "="*70)
    print("GENERATED TEST CASES")
    print("="*70)
    
    if test_cases:
        print(json.dumps(test_cases, indent=2))
        
        with open(f"generated_test_cases_{issue_key.replace('-', '_')}.json", "w") as f:
            json.dump(test_cases, f, indent=2)
        
        print(f"\n✓ Saved {len(test_cases)} test cases")
    else:
        print("✗ No test cases generated")
