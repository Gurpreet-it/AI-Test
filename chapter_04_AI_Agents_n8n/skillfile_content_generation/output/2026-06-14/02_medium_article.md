# Your AI Agent Needs a QA Contract, Not More Prompts

**Most QA teams are trying to fix unreliable AI agents with longer prompts, but the real fix is a contract. In this article I will show you a 5-part QA contract for AI agents, the 3 failure classes it catches early, and a 15-minute review you can add before an agent touches Jira, GitHub, Playwright, or CI. We will use the ICSR structure - Instructions, Context, Skills, Rules - and turn it into something your team can test. By the end, you will have a practical TypeScript-friendly pattern for agent workflows without pretending the model is deterministic.**

- - -

I have seen this pattern too many times.

An AI agent fails once, so the team adds more prompt text.

It fails again, so someone adds examples.

It fails in a third way, so the prompt becomes a 900-line sacred document that nobody wants to read, edit, or own.

That is not a QA strategy. That is prompt debt.

The problem is not that prompts are useless. Prompts matter. But a prompt is only one part of the system. If your agent can create Jira tickets, read acceptance criteria, generate Playwright tests, call GitHub, summarize logs, or comment on a pull request, then you are no longer dealing with "just a prompt."

You are dealing with a workflow.

Workflows need contracts.

## A Prompt Is an Instruction. A Contract Is an Agreement.

When an automation engineer writes a Playwright test, we do not only ask, "What does the test do?"

We ask better questions.

What page does it open? What role-based locator does it use? What data does it create? What cleanup happens after execution? What assertion proves the user outcome? What is the failure signal? Can it run in CI without someone watching it?

AI agent workflows need the same treatment.

A prompt says, "Generate Playwright tests for this feature."

A QA contract says, "Use only the acceptance criteria from this Jira ticket. Create one spec file under `tests/e2e`. Use `getByRole` locators first. Do not invent user credentials. Do not modify shared fixtures. If required context is missing, stop and ask for it. Output the files changed, assumptions, and verification commands."

That second version is testable.

The first version is a wish.

## Use ICSR as the Skeleton

The structure I use is ICSR: Instructions, Context, Skills, Rules.

Instructions define the job. Context defines what the agent is allowed to know for this run. Skills define what the agent is allowed to call or perform. Rules define the safety and quality boundaries.

Most broken agent workflows fail because one of these four pieces is muddy.

If instructions are vague, the agent optimizes for looking useful.

If context is uncontrolled, the agent mixes old assumptions with fresh requirements.

If skills are too broad, the agent takes actions nobody reviewed.

If rules are missing, the agent guesses where it should refuse.

This is why "make the prompt better" is not enough. A good prompt inside a bad workflow still creates bad output.

## The 5-Part QA Contract

Here is the practical contract I would put around a QA agent before it touches real work.

### 1. Task Boundary

The contract must say exactly what the agent is doing and what it is not doing.

Bad boundary: "Help with test automation."

Better boundary: "Create Playwright test scenarios for the checkout coupon flow using only the given Jira acceptance criteria and existing page objects. Do not edit application code."

That one sentence prevents a lot of nonsense. The agent cannot wander into refactoring, data migration, or framework redesign unless the task explicitly allows it.

### 2. Allowed Context

Context is where many teams quietly lose control.

If an agent reads too little context, it guesses. If it reads too much context, it may pull stale patterns from old files and apply them to the current change.

The contract should name the allowed context:

`Jira ticket`, `acceptance criteria`, `existing test helpers`, `current branch diff`, `README testing rules`, and maybe `Playwright config`.

It should also name forbidden context:

Production secrets, unrelated customer data, old screenshots without date, private credentials, or random internet snippets pasted into the task.

This is boring work. That is why it works.

### 3. Allowed Skills

An agent skill is any action it can perform.

Read files. Write files. Run tests. Query Jira. Comment on GitHub. Create test data. Call an LLM. Open a browser. Post a message.

Each skill needs a permission level.

For example, a safe first version of a QA agent may read Jira and local test files, write a new spec file, and run `npx playwright test path/to/spec.ts`. It should not push commits, update Jira status, delete fixtures, or post a PR comment without approval.

You do not need a complex governance board for this. You need one table in your repo.

### 4. Output Schema

Agents become easier to evaluate when their output is predictable.

For a test-generation agent, I want output like this:

```md
## Files Created

## Assumptions

## Test Cases Covered

## Commands Run

## Risks

## What Needs Human Review
```

Now QA can review the work instead of decoding a motivational paragraph from the model.

The output schema is also where you make future automation easier. If every run reports assumptions and risks in the same structure, you can later build checks around those fields.

### 5. Verification Checks

This is where QA should own the conversation.

The agent is not done when it writes code. It is done when the verification checks pass or when it clearly reports why they could not run.

For a Playwright agent, a minimal verification layer may include:

```ts
import { test, expect } from "@playwright/test";

test("checkout coupon applies discount", async ({ page }) => {
  await page.goto("/checkout");

  await page.getByRole("textbox", { name: /coupon code/i }).fill("SAVE10");
  await page.getByRole("button", { name: /apply coupon/i }).click();

  await expect(page.getByRole("status")).toContainText("Coupon applied");
  await expect(page.getByText(/discount/i)).toBeVisible();
});
```

Notice what matters here.

The locator choices are accessibility-first. The assertion checks a user-visible outcome. The test does not depend on a fragile CSS class. The agent should be judged against these rules, not only against whether it produced a file.

## The 3 Failure Classes This Catches

A QA contract catches failure patterns that prompt polishing rarely catches.

The first is scope creep. The agent starts by creating a test and ends by editing shared helpers, changing config, or rewriting selectors across the suite. A task boundary catches that early.

The second is context pollution. The agent uses stale assumptions, old fixture names, or undocumented business rules. An allowed-context section makes this visible.

The third is fake completeness. The agent says "all tests pass" when it never ran the command, or it writes a test that asserts the wrong thing. A verification section forces evidence.

This connects directly to one of my strongest beliefs about AI testing:

AI can help QA move faster, but QA must define what "correct" means.

If we skip that, we are not doing AI testing. We are doing AI hope.

## A Simple Agent Contract Template

Here is a compact template you can add to your repo as `agent-contract.md`.

```md
# QA Agent Contract

## Task
Create Playwright tests for the described feature.

## Instructions
Use existing test patterns. Prefer `getByRole`, `getByLabel`, and user-visible assertions.

## Allowed Context
- Jira acceptance criteria provided in the task
- Existing tests under `tests/e2e`
- Playwright config
- Test helper documentation

## Allowed Skills
- Read local test files
- Create or edit one spec file
- Run targeted Playwright tests

## Not Allowed
- Edit application source code
- Modify CI config
- Use real customer data
- Invent credentials
- Push commits or update Jira status

## Required Output
- Files changed
- Assumptions
- Test cases covered
- Commands run
- Risks
- Human review notes

## Verification
Run the targeted Playwright command or explain why it could not run.
```

This is not fancy. That is the point.

Your first contract should be simple enough that a QA engineer, developer, and manager can understand it in 5 minutes.

## Where This Fits in the Sprint

Do not introduce this as a heavy process.

Put the contract at the front of one high-value workflow.

For example, choose "Jira story to Playwright draft tests." That workflow is common, useful, and risky enough to benefit from boundaries.

During refinement, QA adds acceptance criteria and known edge cases. During implementation, the agent creates draft tests under the contract. Before PR review, QA checks the agent output: files changed, assumptions, covered cases, commands run, and risks.

This is workflow, not theater.

It also protects careers.

The QA engineer who only says "AI wrote the tests" becomes replaceable. The QA engineer who defines contracts, failure modes, verification checks, and review standards becomes more valuable.

That is the real career stake in AI testing.

## The Honest Caveats

This will not make your agent deterministic. LLM output can still vary, and you still need human review for meaningful workflows.

This will not fix poor acceptance criteria. If the Jira story is vague, the contract should make the agent stop and ask for context, not magically infer product intent.

This may slow the first few runs. That is acceptable. You are trading a little setup time for fewer hidden mistakes later.

This does not replace security review. If your agent can access credentials, production logs, customer data, or deployment systems, you need stricter controls than this article covers.

And yes, teams may ignore the contract when delivery pressure increases. That is exactly when the contract matters most.

## The Bottom Line

Stop asking only, "How do we write a better prompt?"

Ask, "What contract must this agent obey before we trust its output?"

For QA teams, that question changes the work.

You move from prompt tweaking to quality engineering. You define boundaries, evidence, refusal paths, and verification. You make AI agent behavior reviewable by humans and testable by systems.

That is the version of AI testing I trust.

Not agents doing magic.

Agents working inside contracts that QA can inspect.

- - -

*If you are building AI-assisted QA workflows, start with one contract and one measurable verification loop - this is the foundation of my [AI-Powered Testing Mastery](https://thetestingacademy.com) course.*

Tags: QA, SDET, Test Automation, AI Testing, Playwright, LLM Evaluation, Software Testing
