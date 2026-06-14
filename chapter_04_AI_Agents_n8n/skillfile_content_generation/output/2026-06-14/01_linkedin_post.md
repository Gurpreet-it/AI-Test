# LinkedIn Post

Your AI agent does not need a longer prompt.

It needs a contract.

I am seeing the same mistake in QA teams right now. The agent fails once, so someone adds 12 more lines to the prompt. Then it fails in a different way, so they add another paragraph. After 3 weeks, nobody knows what the agent is allowed to do.

That is not engineering.

That is prompt debt.

For any QA agent that can touch Jira, GitHub, Playwright, test data, or CI, I want a simple contract:

→ What instructions are fixed?

→ What context is allowed?

→ What skills can it call?

→ What rules stop unsafe behavior?

→ What output must be verified?

This is why I keep coming back to ICSR: Instructions, Context, Skills, Rules.

A prompt tells the agent what to do.

A contract tells the team what must never break.

Start small. Pick one agent workflow, maybe "create Playwright tests from Jira acceptance criteria." Then define the allowed inputs, expected files, naming rules, assertions, and refusal cases.

If the agent cannot pass that contract, it is not ready for your sprint.

PS: In your team, who owns AI agent quality right now - QA, Dev, DevOps, or nobody? Honest answers only.

#QA #SDET #TestAutomation #SoftwareTesting #AI #ICSR #LLMEval
