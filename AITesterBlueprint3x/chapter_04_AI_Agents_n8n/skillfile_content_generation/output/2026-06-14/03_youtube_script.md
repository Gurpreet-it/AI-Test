# YouTube Script

## Title Options

1. Your AI Agent Needs a QA Contract, Not More Prompts
2. Stop Writing Longer Prompts for Broken QA Agents
3. ICSR: The QA Contract Every AI Agent Needs

## Hook (0:00-0:15)

Your AI agent failed, so you added more prompt text.

Then it failed again.

That is not a prompt problem anymore. That is a contract problem.

Let me show you.

Visual shots:

→ A messy long prompt scrolling fast

→ A red "FAILED" test result

→ Jira, GitHub, and Playwright icons on screen

→ A clean contract document replacing the prompt

→ Close-up text: "Instructions. Context. Skills. Rules."

## Intro (0:15-0:45)

I'm Pramod, Principal SDET at Tekion and founder of The Testing Academy. I have taught Playwright and automation to thousands of engineers, and this is the AI testing mistake I am seeing right now.

Teams are giving AI agents access to Jira, GitHub, Playwright, logs, and CI. But they are still treating them like chat prompts.

Today I will show you a simple QA contract for AI agents using ICSR: Instructions, Context, Skills, Rules.

We will cover what goes into the contract, how to test it, and where it fits in your sprint.

Let's go.

## Body Beat 1: The Problem With Longer Prompts (0:45-2:00)

Spoken:

Most teams start with a simple prompt: "Create Playwright tests for this feature."

The first output looks okay, but then the agent invents credentials, changes a shared helper, uses CSS selectors, or claims it ran tests when it did not.

So the team adds more prompt text.

"Do not invent data."

"Use existing patterns."

"Run the test."

"Do not edit config."

After a few weeks, the prompt becomes a dumping ground for every past failure.

That is prompt debt.

The fix is not just a better paragraph. The fix is a contract that says what the agent is allowed to do, what it must never do, and how we verify the result.

Visual:

Show a prompt getting longer and messier. Then cut to a clean contract with sections.

## Body Beat 2: ICSR as the Contract Skeleton (2:00-3:45)

Spoken:

The structure I use is ICSR.

Instructions: what job the agent must do.

Context: what information the agent is allowed to use.

Skills: what actions or tools the agent can call.

Rules: what boundaries stop unsafe or low-quality behavior.

For example, if the task is "create Playwright tests from Jira acceptance criteria," the instruction is not just "write tests."

It is: create one spec file, follow existing test patterns, use accessibility-first locators, and do not modify application code.

The context is the Jira ticket, existing tests, Playwright config, and helper docs.

The skills are reading files, writing one spec, and running a targeted Playwright command.

The rules are no real customer data, no invented credentials, no CI config edits, and no claim of success without evidence.

Visual:

Four-column graphic: Instructions, Context, Skills, Rules.

## Body Beat 3: The QA Agent Contract Template (3:45-6:30)

Spoken:

Here is the contract I would put in a repo.

On screen:

```md
# QA Agent Contract

## Task
Create Playwright tests for the described feature.

## Instructions
Use existing test patterns. Prefer getByRole, getByLabel, and user-visible assertions.

## Allowed Context
Jira acceptance criteria, existing e2e tests, Playwright config, helper docs.

## Allowed Skills
Read local test files, create or edit one spec file, run targeted Playwright tests.

## Not Allowed
Edit application code, modify CI config, use real customer data, invent credentials.

## Required Output
Files changed, assumptions, test cases covered, commands run, risks, human review notes.

## Verification
Run the targeted command or explain why it could not run.
```

This is not a big governance project.

It is a lightweight engineering guardrail.

If your agent cannot work inside this contract, it should not touch your sprint.

Visual:

Screen recording of a Markdown contract file being created in a repo.

## Body Beat 4: What Verification Looks Like (6:30-8:30)

Spoken:

Now let us talk about the most important part: verification.

The agent is not done when it writes a test. It is done when the test proves a user-visible outcome or clearly reports why it could not run.

Example:

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

This test uses role-based locators and checks what the user sees.

That is the standard we should ask agents to follow.

Not "write something that looks like a test."

Write something that can be reviewed, executed, and trusted.

Visual:

Show Playwright code with `getByRole` highlighted, then show a terminal running a targeted test.

## Body Beat 5: Where QA Engineers Become More Valuable (8:30-10:15)

Spoken:

This is the career point.

If a QA engineer only says, "AI wrote the tests," that role becomes weak.

But if a QA engineer defines agent contracts, failure modes, test evidence, refusal rules, and review standards, that person becomes central to AI delivery.

The future is not QA fighting AI.

The future is QA defining the quality gates around AI.

That means you should know Playwright, CI, API checks, prompt structure, model failure patterns, and workflow design.

Not because every QA needs to become an AI researcher.

Because someone has to tell the team when the agent output is unsafe, incomplete, or fake.

That should be us.

Visual:

Show QA engineer reviewing an agent output report with sections: assumptions, risks, commands run.

## Outro (10:15-11:00)

Spoken:

So here is the one-breath recap.

Do not fix unreliable AI agents by endlessly stretching the prompt. Wrap the agent in a QA contract. Use ICSR: Instructions, Context, Skills, Rules. Define allowed tools, forbidden actions, output schema, and verification checks.

If you want my simple contract checklist, comment CONTRACT below.

In the next video, I will show how to connect this contract to a Playwright MCP workflow and review generated tests before they enter a PR.

Subscribe if you are serious about AI testing, not just AI demos.

Go open one agent workflow in your team right now and ask: where is the contract?

## Thumbnail Concept

Pramod face on left 40%, calm but serious expression. Right 60% pure dark background. Big yellow/gold text: "PROMPTS ARE NOT QA". Small red badge: "AGENT RISK". Bottom small white text: "Use a contract."
