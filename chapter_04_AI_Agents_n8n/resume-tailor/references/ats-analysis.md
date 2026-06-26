# ATS keyword analysis

## Goal

Simulate what an Applicant Tracking System does: match the literal keywords and named technologies in the JD against what appears in the resume text. Recruiters filter on these, so a real skill described in different words can still "miss" if the JD's exact term isn't present.

## Extracting keywords from the JD

Scan for, in rough priority order:

1. **Named hard skills / tools / languages** — e.g. Python, Playwright, Selenium, Appium, TestNG, RestAssured, Kubernetes, Docker, AWS/GCP/Azure, Jenkins, GitLab CI, OWASP ZAP. These are the highest-signal ATS terms.
2. **Required experience markers** — years (e.g. "12+ years"), seniority, "distributed systems", "large-scale".
3. **Responsibility verbs/phrases** — test strategy, automation framework, CI/CD, root cause analysis, monitoring and alerting, mentorship, release velocity, defect lifecycle.
4. **Domain terms** — the industry the company operates in (logistics, fintech, e-commerce). Mirroring the domain truthfully helps relevance.
5. **Preferred / nice-to-have** — lower priority but still worth a truthful match.

Soft/contextual words an ATS may pick up (communication, collaboration, compensation) usually come from JD boilerplate and don't need to be force-fit into the resume — note them but don't contort bullets around them.

## Presenting the cross-reference

Show a compact table:

| JD Keyword | In resume? | Priority |
|---|---|---|
| Python | ❌ | High |
| Selenium | ✅ | — |
| Kubernetes | ❌ | High |

Then give an approximate match percentage of the **named technical** keywords (the ones ATS weights most), e.g. "~60% of named technical keywords present." Recompute after the rewrite so the user sees the lift.

## The hand-off to Phase 3

Split the ❌ rows into "safe to add" (already evidenced / factual updates / domain mirror) vs "must confirm" (unverified named skills). Only the confirmed ones get added. Always state explicitly which keywords you are NOT adding because they couldn't be verified — that honest gap list is a feature.
