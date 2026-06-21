# LangFlow vs LangGraph vs LangSmith

Three tools, three jobs. Same LangChain orbit, different purpose. One builds visually, one builds in code, one watches what you built.

---

## Quick Difference

| Dimension | **LangFlow** | **LangGraph** | **LangSmith** |
|---|---|---|---|
| **What it is** | Visual, drag-and-drop builder for LLM apps & agents | Code framework for stateful, multi-step agent workflows | Observability + evaluation platform (debug, trace, test) |
| **Primary job** | Build flows fast, no/low code | Orchestrate complex agent logic in code | Monitor, debug, evaluate, and improve LLM apps |
| **Interface** | GUI canvas (nodes + edges) | Python / JavaScript (graph as code) | Web dashboard + SDK |
| **Mental model** | Whiteboard you can run | State machine / directed graph | Black box recorder for your LLM app |
| **Abstraction level** | High (visual blocks) | Low–mid (explicit graph control) | N/A (sits beside any app) |
| **Who it's for** | Prototypers, non-devs, fast demos | Engineers building production agents | Any team running LLM apps in dev or prod |
| **State / memory** | Handled inside components | First-class — explicit state, cycles, checkpoints | Reads state, doesn't manage it |
| **Control flow** | Linear/branching via UI wiring | Loops, branches, conditional edges, human-in-loop | Not a runtime — observes runs |
| **Output** | Runnable flow + API endpoint | Deployable agent code | Traces, metrics, eval scores, datasets |
| **Code required** | Little to none | Yes — you write the graph | No (uses callbacks/decorators to hook in) |
| **Deployment** | Export flow / run as API | Ship as a service (LangGraph Platform) | SaaS or self-hosted |
| **Best at** | Speed of building & iterating visually | Reliability & precise agent orchestration | Trust — knowing why an app behaved that way |
| **Weak at** | Deep custom logic, version control | Beginner-friendliness, fast prototyping | Building anything (not a builder) |
| **Relationship** | Can use LangChain/LangGraph under hood | Successor to basic LangChain chains | Plugs into LangFlow, LangGraph, raw LangChain, anything |

---

## One-Line Summary

- **LangFlow** → *build* it visually.
- **LangGraph** → *build* it in code with full control.
- **LangSmith** → *watch, debug, and grade* whatever you built.

---

## When to Use Which

| Situation | Pick |
|---|---|
| Demo an agent idea to stakeholders by Friday | **LangFlow** |
| Non-engineer needs to wire a RAG pipeline | **LangFlow** |
| Multi-agent system with loops, retries, human approval | **LangGraph** |
| Production agent that must behave deterministically | **LangGraph** |
| "Why did my agent hallucinate on that request?" | **LangSmith** |
| Run regression tests / evals on prompts before shipping | **LangSmith** |
| Track token cost + latency in production | **LangSmith** |

---

## They Stack, Not Compete

Common real-world setup:

1. **LangGraph** — orchestrate the agent logic.
2. **LangFlow** — prototype or let non-devs adjust the flow visually.
3. **LangSmith** — trace every run, catch failures, run evals, ship with confidence.

Builder + Builder + Observer. Different layers of the same stack.

---

## QA / SDET Angle

For testers: **LangSmith** is the one you live in. It's where you assert on agent behavior, build eval datasets (your test suite for non-deterministic systems), and catch regressions before they hit users. **LangGraph** gives you deterministic seams to test against. **LangFlow** is where the flow is born — useful for reproducing a bug visually before you write the eval.

> Coverage is not confidence. For LLM apps, the eval dataset is the test suite — and that lives in LangSmith.
