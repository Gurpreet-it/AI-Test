# Difference Between `expected_answer` and `expected_context`

## 🎯 Quick Answer

| Component | What It Is | Source | Purpose |
|-----------|-----------|--------|---------|
| **`expected_context`** | Reference documents/knowledge base | Retrieved from docs | What the system RETRIEVES |
| **`expected_answer`** | Ground truth response | Written by you | What the system should GENERATE |

---

## 📚 Simple Analogy

Think of a **student taking an exam**:

### `expected_context` = Study Materials
```
The textbook, notes, and references the student is ALLOWED to use
Example:
  "Chapter 5: Interactive Channels are touchpoints that call Interact for real-time decisions"
  "Zones define where offers can be presented within a channel"
```

### `expected_answer` = Correct Exam Answer
```
The complete, correct answer the student SHOULD WRITE using those materials
Example:
  "To set up a new interactive channel:
   1. Go to Interact > Interactive channels
   2. Click Add interactive channel icon
   3. [8 more detailed steps]
   ...
   To enable learning mode: [3 options]"
```

---

## 🔄 How They Work Together in RAG

```
User Question
    ↓
System Retrieves CONTEXT
    ↓
LLM Generates ANSWER using the context
    ↓
Compare with EXPECTED_ANSWER
    ↓
Evaluate if ANSWER is grounded in CONTEXT
```

### Real-World Flow

```python
# 1. USER ASKS QUESTION
question = "How do I set up an interactive channel?"

# 2. SYSTEM RETRIEVES CONTEXT (from knowledge base)
retrieved_context = [
    "Go to Interact > Interactive channels",
    "Click Add interactive channel icon",
    "Enter Name and Description",
    # ... more retrieval
]

# 3. LLM GENERATES ANSWER using that context
generated_answer = """
To set up an interactive channel:
1. Go to Interact > Interactive channels
2. Click Add interactive channel icon
3. Enter Name and Description
...
"""

# 4. COMPARE WITH EXPECTED_ANSWER
expected_answer = """
To set up an interactive channel:
1. Go to Interact > Interactive channels
2. Click Add interactive channel icon
3. Enter Name and Description
...
"""

# 5. EVALUATE
if generated_answer ≈ expected_answer:
    print("✅ PASS - Answer is correct")
else:
    print("❌ FAIL - Answer is incomplete/wrong")

# 6. VALIDATE GROUNDING
if all_facts_in_answer_found_in_context:
    print("✅ Faithfulness: HIGH - Answer uses only context")
else:
    print("❌ Hallucination: HIGH - Answer invented facts")
```

---

## 🔍 Detailed Comparison

### `expected_context` (The SOURCE MATERIAL)

```python
expected_context=[
    # These are the documents/facts the system RETRIEVES
    # They come FROM your knowledge base/documentation
    # They should contain the facts needed to answer the question

    "Interactive channels represent the touchpoint (e.g. website) "
    "that will call Interact for real-time decisions.",

    "To create a new interactive channel:\n"
    "1. Go to Interact > Interactive channels\n"
    "2. Click the Add interactive channel icon\n"
    "3. In the Interactive channel summary dialog:\n"
    "   - Enter Name and Description\n"
    "   - Select the Security policy\n"
    "   - Select one or more Runtime server groups\n"
    "4. Click Save and return.",

    "Zones define where within a channel offers can be presented; "
    "self-learning can be enabled per interactive point.",

    "To add a zone to the interactive channel:\n"
    "1. Open the interactive channel\n"
    "2. Go to the Interaction points tab\n"
    "3. Click the Add zone icon\n"
    "4. Enter Name and Description\n"
    "5. Click Save and return.",
]
```

**Key Characteristics**:
- ✅ Extracted from official documentation
- ✅ Factual and ground-truth information
- ✅ Contains building blocks of the answer
- ✅ Should be comprehensive enough to answer the question
- ✅ Represents what system would RETRIEVE from knowledge base

---

### `expected_answer` (THE CORRECT RESPONSE)

```python
expected_answer="""
To set up a new Unica Interact interactive channel, add a zone, and enable learning mode, follow these steps.

A) Create a new interactive channel
Go to Interact > Interactive channels.
On All interactive channels, click the Add interactive channel icon.
In the Interactive channel summary dialog:
  Enter Name and Description.
  Select the Security policy (you cannot change the security policy after creation).
  (Optional) Select a parent interactive channel if you want to reuse marketing objects.
  Select one or more Runtime server groups.
  Select the Production runtime server group.
  Set Maximum # of times to show any offer during a single visit.
Click Save and return.

B) Add a zone to the interactive channel
Open the interactive channel and go to the Interaction points tab.
Click the Add zone icon.
In the Add/edit Zone dialog:
  Enter a Name and Description.
  (Optional) Click Advanced features to configure additional settings.
Click Save and return.

C) Enable learning mode (for the zone)
When you're adding/editing the zone, use Advanced features → Learning mode and choose one of the available settings:
  Inherit from interactive channel (default)
  Use marketer's scores only
  Use custom learning model (select from the drop-down)

You can also add zones from the Strategy tab:
Go to the interactive channel's Strategy tab and click Add/Modify Rules.
In the Zone area, click Add Zone.
Provide Zone Info and (optionally) add Interaction Points.
Under Learning Mode, select appropriate option.
Click Add New Zone.

If you want custom learning model behavior, create a learning model for the interactive channel via the Self learning tab and click Enable.
"""
```

**Key Characteristics**:
- ✅ Complete, well-structured response
- ✅ Written by human (ideal answer)
- ✅ Comprehensive with all steps
- ✅ Includes optional features
- ✅ Shows multiple methods (alternative paths)
- ✅ What you EXPECT the system to generate
- ✅ Represents ideal quality standard

---

## 📊 Relationship Visualization

```
┌─────────────────────────────────────────────────────────┐
│                    USER QUESTION                         │
│  "How do I set up an interactive channel?"              │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────────┐  ┌───────────────────┐
│ CONTEXT          │  │ EXPECTED_ANSWER   │
│ Retrieval        │  │ Ideal Response    │
│                  │  │                   │
│ Facts from docs  │  │ Complete guide    │
│ ~600 words       │  │ ~800 words        │
│                  │  │                   │
│ What system      │  │ What system       │
│ RETRIEVES        │  │ should GENERATE   │
└────────┬─────────┘  └─────────┬─────────┘
         │                      │
         └──────────┬───────────┘
                    │
        ┌───────────▼────────────┐
        │  LLM generates answer  │
        │  using context         │
        │  (actual_output)       │
        └────────┬────────────────┘
                 │
        ┌────────▼──────────────┐
        │   Compare Output vs   │
        │   Expected_Answer     │
        │                       │
        │ Correctness Score?    │
        └───────────────────────┘
```

---

## 🧪 How Metrics Use Them

### Hallucination Metric (Uses BOTH)
```python
Hallucination = "What % of actual_output is NOT in expected_context?"

If actual_output has facts not in expected_context
    → Hallucination detected ❌

Score = (facts_in_context) / (total_facts_in_output)
Target: >0.95 (less than 5% hallucinated)
```

**Example**:
```
Context: "Zones define where offers are presented"
Output: "Zones define where offers are presented AND
         they inherit cross-channel learning automatically"

Issue: "inherit cross-channel learning" NOT in context
Hallucination: Detected ❌
```

---

### Correctness Metric (Uses BOTH)
```python
Correctness = "How well does actual_output match expected_answer?"

Compares:
  ✅ Completeness (all steps included?)
  ✅ Accuracy (facts are correct?)
  ✅ Organization (well-structured?)
  ✅ Detail level (sufficient detail?)

Score = similarity_score(actual_output, expected_answer)
Target: >0.85
```

**Example**:
```
Expected_Answer: [8 detailed channel creation steps]
Actual_Output:   [4 summarized steps]

Issue: Missing 50% of steps
Correctness: 0.40 ❌
```

---

### Faithfulness Metric (Uses BOTH)
```python
Faithfulness = "Is actual_output supported by expected_context?"

Logic:
  For each claim in actual_output:
    Can this claim be derived from expected_context?
    YES → ✅ Faithful
    NO  → ❌ Hallucination
```

---

## 🎯 Key Differences Summarized

| Aspect | `expected_context` | `expected_answer` |
|--------|---|---|
| **Source** | Knowledge base / Documentation | Human-written ideal response |
| **What It Represents** | Facts to retrieve | Complete correct response |
| **Size** | ~600-800 words (comprehensive docs) | ~800-1000+ words (full answer) |
| **Detail Level** | Detailed, factual | Detailed, well-organized |
| **Purpose** | Reference material for grounding | Quality standard for evaluation |
| **Used By** | Hallucination, Faithfulness metrics | Correctness, Relevancy metrics |
| **Simile** | Textbook / Study material | Perfect exam answer |

---

## 💡 Real-World Example

### The Test Case
```python
MaxAITestCase(
    question="How do I set up a new interactive channel, add a zone, and enable learning mode?",

    expected_context=[
        # Documents retrieved from knowledge base
        # What the system should find when searching
        # Factual, source-based information

        "Path: Go to Interact > Interactive channels",
        "Step: Click Add interactive channel icon",
        "Dialog: Interactive channel summary",
        "Fields: Name, Description, Security policy, Runtime server groups",
        "Zone: Defines where offers are presented",
        "Learning Mode: Inherit from channel, Use marketer scores, Use custom model",
    ],

    expected_answer="""
To set up a new interactive channel:
1. Go to Interact > Interactive channels
2. Click the Add interactive channel icon
3. In the Interactive channel summary dialog:
   - Enter Name and Description
   - Select Security policy
   - Select Runtime server groups
   - Click Save and return

To add a zone:
1. Open the interactive channel
2. Go to Interaction points tab
3. Click Add zone icon
4. Enter Name and Description
5. Click Save and return

To enable learning mode:
1. When adding/editing the zone, use Advanced features
2. In Learning Mode, choose:
   - Inherit from interactive channel (default)
   - Use marketer's scores only
   - Use custom learning model
""",
)
```

### How Evaluation Works

```
Step 1: System retrieves context
  ✅ Found: "Go to Interact > Interactive channels"
  ✅ Found: "Click Add interactive channel icon"
  ✅ Found: "Enter Name and Description"

Step 2: LLM generates answer using context
  → "To set up a channel, go to Interact > Interactive channels
     and click Add. Enter Name, Description, select server groups.
     To add zones, go to Interaction points and click Add zone.
     For learning mode, use Advanced features and select option."

Step 3: Evaluate against expected_answer
  ✅ Includes main steps: YES
  ⚠️ Includes all details: PARTIAL (missing some field names)
  ⚠️ Includes alternative methods: NO (missing Strategy tab method)

  Correctness Score: 0.65 (needs more detail)

Step 4: Check if grounded in context
  ✅ "Go to Interact > Interactive channels" → IN CONTEXT
  ✅ "Click Add interactive channel icon" → IN CONTEXT
  ⚠️ "Interactive channel icon location" → INFERRED (not explicit)

  Hallucination Score: 0.85 (mostly grounded)
```

---

## 🔑 Key Insight

**`expected_context` + `expected_answer` TOGETHER define quality:**

```
expected_context = "What information should the system find?"
expected_answer = "What should the system generate with that info?"

Both must be COMPREHENSIVE for proper evaluation
```

**If `expected_context` is incomplete:**
- LLM must hallucinate to fill gaps
- Hallucination score drops
- Test becomes invalid

**If `expected_answer` is incomplete:**
- LLM can't know what "complete" looks like
- Correctness score stays low even if accurate
- Test doesn't measure quality properly

---

## ✅ Best Practices

### ✅ DO:
- Make `expected_context` comprehensive (90%+ coverage of expected_answer)
- Make `expected_answer` detailed and well-structured
- Ensure `expected_context` comes from real documentation
- Use both to evaluate different aspects

### ❌ DON'T:
- Put expected_answer content in expected_context (confuses grounding)
- Make expected_context too brief (forces hallucination)
- Make expected_answer a summary (loses detail)
- Use expected_context for evaluation only (need both)

---

## 🎓 Summary

**`expected_context`**: The SOURCE MATERIAL
- What system RETRIEVES
- What system should use
- Foundation for grounding

**`expected_answer`**: The IDEAL RESPONSE
- What system GENERATES
- Quality standard
- Complete solution

Together they measure whether the system:
1. ✅ Retrieves relevant information (context quality)
2. ✅ Uses only that information (faithfulness/hallucination)
3. ✅ Generates a complete, correct answer (correctness)
4. ✅ Stays grounded and accurate (faithfulness)
