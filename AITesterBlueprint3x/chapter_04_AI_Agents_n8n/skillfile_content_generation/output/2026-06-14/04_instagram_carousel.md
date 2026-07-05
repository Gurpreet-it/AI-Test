# Instagram Carousel Script

## ManyChat Keyword

CONTRACT

## Slide 1

Your AI agent does not need a longer prompt.

It needs a QA contract.

## Slide 2

Long prompts hide messy workflows.

QA contracts expose them.

The difference matters when agents touch Jira, GitHub, Playwright, or CI.

## Slide 3

Use ICSR:

→ Instructions

→ Context

→ Skills

→ Rules

If one is missing, the agent will guess.

## Slide 4

Bad instruction:

"Create tests for this feature."

Better instruction:

"Create one Playwright spec from this Jira story. Use existing patterns. Do not edit app code."

## Slide 5

Allowed context should be named.

→ Jira acceptance criteria

→ Existing tests

→ Playwright config

→ Helper docs

Everything else is noise until reviewed.

## Slide 6

Allowed skills should be limited.

The agent can:

→ Read test files

→ Write one spec

→ Run targeted tests

It cannot:

→ Push commits

→ Edit CI

→ Invent credentials

## Slide 7

Verification example:

```ts
await page.getByRole("button", { name: /apply coupon/i }).click();
await expect(page.getByRole("status")).toContainText("Coupon applied");
```

No user-visible assertion?

No trust.

## Slide 8

The agent output must include:

→ Files changed

→ Assumptions

→ Test cases covered

→ Commands run

→ Risks

→ Human review notes

## Slide 9

Prompt tells the agent what to do.

Contract tells the team what must never break.

Comment CONTRACT and I will send the QA Agent Contract checklist.

## ManyChat Auto-DM Copy

Here is the QA Agent Contract checklist.

Use it before an AI agent touches Jira, GitHub, Playwright, or CI:

1. Task boundary
2. Allowed context
3. Allowed skills
4. Not-allowed actions
5. Required output
6. Verification evidence

Medium article: Add your Medium link here after publishing.

Repo/template link: Add the GitHub checklist link here after publishing.

Reply with "agent" if you want me to share a Playwright MCP example next.

## Public Reply Prompt

Sent. Check DM and start with one workflow, not your whole QA process.
