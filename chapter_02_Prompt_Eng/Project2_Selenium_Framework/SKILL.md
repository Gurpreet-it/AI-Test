---
name: rice-pot-prompt-builder
description: Build a structured, high-quality AI prompt using the RICE-POT framework (Role, Instructions, Context, Example, Parameters, Output, Tone). Use this whenever the user wants to create, write, fix, structure, or improve a prompt — especially for generating test cases, code, documents, or any repeatable AI task — or mentions "RICE-POT", "prompt template", "build me a prompt", "structure this prompt", "help me write a prompt", or hands over a rough/messy prompt to clean up. Trigger this even when the user only describes what they want the AI to do without naming RICE-POT at all.
---

# RICE-POT Prompt Builder

Turn a vague goal (or a messy draft) into a clean, structured prompt using the **RICE-POT**
framework. The job is to **interview the user**, fill in every component, then **assemble a
finished prompt they can copy and reuse**.

## What RICE-POT Means

| Letter | Component    | What it captures |
|--------|--------------|------------------|
| **R**  | Role         | The persona the AI should adopt |
| **I**  | Instructions | Step-by-step commands, mandatory rules, and "Don't" lists |
| **C**  | Context      | Background — the *why* and *where* |
| **E**  | Example      | A sample output/format that guides the style |
| **P**  | Parameters   | Constraints on quality, accuracy, and style |
| **O**  | Output       | The exact artifact and format to produce |
| **T**  | Tone         | The communication style |

The **Objective** ("what do you want to achieve?") is not a letter — it sits *above* the prompt
and drives every component. Always capture it first; it tells you what to put in each slot.

---

## Workflow

Follow these four steps in order. Do not skip the interview — a good prompt comes from good answers.

1. **Interview** the user to capture the Objective and all seven components.
2. **Assemble** the answers into the RICE-POT template.
3. **Deliver** the finished prompt in a single copy-pasteable block.
4. **Refine** based on feedback.

### Step 1 — Interview

Open by capturing the **Objective**, then walk through the seven components in **R-I-C-E-P-O-T order**.

**Make this easy, not an interrogation.** For each component, *propose a draft* based on what the
user has already told you, and ask them to confirm or correct it. Only ask an open question when
you genuinely cannot infer the answer. Group related questions so the user answers in one or two
passes rather than nine separate ones.

Ask about each of the following. The bracketed text is the intent of each question — adapt the wording.

1. **Objective / what they want to achieve** — What should the AI produce, and why? What does "done" look like? *(This single answer usually lets you draft half the components.)*
2. **Role (R)** — Who should the AI act as? Suggest a persona that fits the objective (e.g., "expert QA tester with 15 years' experience").
3. **Instructions (I)** — What are the exact steps, and what must the AI **not** do? Always probe for a "Don't" list — it's where most prompts are weak.
4. **Context (C)** — What background, product, system, or attached documents should the AI know about? Ask what files/inputs they'll provide.
5. **Example (E)** — Do they have a sample of the ideal output or format? If not, offer to draft one row/snippet from the objective.
6. **Parameters (P)** — What quality bar and constraints apply? (Accuracy, determinism, no hallucination, traceability, length limits.)
7. **Output (O)** — What exact format and structure? (CSV, JSON, Markdown table, code block; column names; ordering.)
8. **Tone (T)** — How should it communicate? (Technical, plain, formal, output-only.)

If the user gives you a rough draft instead of answers, **extract whatever you can from the draft
first**, slot it into the right components, then only ask about the gaps.

#### Strongly recommended default for Parameters

For any prompt that generates factual or technical output (test cases, code, analysis from a
document), recommend this anti-hallucination block unless the user opts out — it is what makes the
output trustworthy:

```
- Output must be deterministic (same input → same output).
- Every assertion must be traceable to a provided input.
- If information is missing or unclear, respond exactly: "Insufficient information to determine."
- If a detail is inferred, label it exactly: "Inference (low confidence)".
- Do not invent features, IDs, APIs, error codes, UI elements, or behavior.
- Do not assume default or "typical" system behavior.
```

### Step 2 — Assemble

Fill the answers into this exact template. Keep every heading even if a section is short.

```markdown
### R — Role
<persona>

### I — Instructions
1. <step>
2. <step>
...
Do NOT:
- <rule>
- <rule>

### C — Context
- <background / product / inputs>

### E — Example
<one sample row or snippet>

### P — Parameters
- <constraint>
- <constraint>

### O — Output
- Format: <format>
- Columns / structure: <exact spec, in order>

### T — Tone
<style>
```

### Step 3 — Deliver

Present the finished prompt in **one fenced code block** so the user can copy it in a single
action. Add a one-line note above it on how to use it (e.g., "paste this into your AI tool and
attach the PRD"). Do not bury the prompt in commentary.

### Step 4 — Refine

Ask if anything is off. Common fixes: tighten the "Don't" list, dedupe output columns, resolve
conflicts between the objective and the instructions (e.g., "10 test cases" vs "complete
coverage"), or swap an ill-fitting tone (e.g., "code-only" doesn't suit a CSV deliverable).

---

## Guardrails When Cleaning Up an Existing Prompt

When the user hands over a draft to "fix into RICE-POT," watch for and flag these:

- **Duplicate or redundant output columns** — merge them and tell the user what you removed.
- **Objective vs. Instructions conflicts** — e.g., a fixed count vs. "complete coverage." Pick one and confirm.
- **Tone that doesn't match the output** — "code-only" is for code, not for a CSV/table deliverable; use "output-only, no commentary" instead.
- **Role bleeding into the task** — keep the persona in R and the task steps in I.

Always tell the user *what you changed and why* in a few short lines — don't silently rewrite.

---

## Worked Example

A complete before/after — a messy test-case prompt cleaned into RICE-POT — is in
`references/worked-example.md`. Read it when you need a concrete reference for assembly, or to show
a user what a finished prompt looks like.

A blank fill-in template is in `references/blank-template.md`.