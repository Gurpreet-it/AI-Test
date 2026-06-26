---
name: resume-tailor
description: "Score, ATS-check, and tailor a resume against a specific job description, then produce a clean updated Word (.docx) resume. Use this skill whenever the user provides (or mentions) a resume plus a job description and wants any of: a resume score/review, an ATS keyword gap analysis, a resume rewritten or tailored to a JD, missing keywords added, or a polished .docx resume produced. Trigger on phrases like 'score my resume', 'review my resume', 'tailor my resume to this JD', 'ATS check', 'which keywords am I missing', 'update my resume', 'make my resume match this job', or whenever a resume file and a job description appear together. Also trigger if the user pastes Joblytics/Jobscan-style keyword lists and asks to incorporate them."
license: Proprietary.
---

# Resume Tailor

Turn a resume + job description into a scored review, an ATS keyword gap analysis, and a clean, professional updated `.docx` — without ever fabricating skills the candidate doesn't have.

## The single most important rule

**Never invent experience.** Every keyword, skill, tool, or metric added to the resume must reflect something the candidate genuinely has. When a JD names a skill that isn't already on the resume, do NOT silently add it. Instead, group the unverified skills and ASK the candidate which ones are real before adding any. This is the core discipline of the skill — an ATS-optimized resume that lies gets the candidate caught in the interview.

If the candidate says they don't have a skill, leave it out and report it as an honest, remaining gap. That transparency is the point.

## Inputs you need

1. **The resume** — usually a PDF or .docx. If only the old/original is provided, that's fine; you'll rebuild it.
2. **The job description** — pasted text or a file.

If either is missing, ask for it before proceeding. If the resume is a PDF whose text is already in context, use that; otherwise read it (see references/reading-inputs.md).

## Workflow

Run these phases in order. Phases 2–4 each end by checking in with the candidate, because the value is in accuracy, not speed.

### Phase 1 — Score the current resume (the review)

Produce a review in EXACTLY this format (the user expects it verbatim, with the ✅ / 🙈 symbols):

```
1. Overall Result: [Score out of 10]
2. Effectivity: [Score out of 10] with feedback on how effectively the resume presents the applicant's skills and experiences.
3. Layout and Design: [Score out of 10] with comments on the visual appeal and organization of the resume.
4. Content Relevance: [Score out of 10] with insights on the relevance and adequacy of the information provided.
5. Grammar and Syntax: [Score out of 10] with observations on the language quality and readability.
6. Impact: [Score out of 10] with thoughts on how the resume stands out or catches attention.
```

Use ✅ for strengths and 🙈 for areas to improve. Be specific and honest — flag broken sentences, undersold experience, dated facts, and missing metrics. End with the top 2–3 fixes.

### Phase 2 — ATS keyword cross-reference

Act as an Applicant Tracking System. Extract the essential skills, named tools, and frequently repeated terms from the JD, then cross-reference against the resume. Present a table: keyword | present in resume? | priority (High/Medium/Low). Compute an approximate match percentage. See references/ats-analysis.md for how to extract and prioritize keywords.

If the user pastes a Joblytics/Jobscan-style "matched / missing" list, use it directly as the keyword source rather than re-deriving it.

### Phase 3 — Confirm what's genuinely theirs (the gate)

This is the gate that enforces the no-fabrication rule. Sort the missing keywords into two buckets:

- **Safe to add now** — things already evidenced by the resume, factual profile updates the user gave you (years of experience, follower counts, new projects), or domain terms you can mirror truthfully (e.g. the JD's industry). Add these without asking.
- **Must confirm** — any named skill, tool, language, or framework not already evidenced (e.g. Python, Kubernetes, performance testing, a specific cloud). Ask the user which of these they actually have hands-on experience with, using a multi-select question where the interface supports it. Add ONLY the ones they confirm.

Keep the confirmation questions tight (one batched question with options beats a wall of prose). Also confirm any placeholder metrics — if you'd otherwise write "reduced runtime by [ ]%", ask for the real number or rephrase without it.

### Phase 4 — Rewrite and build the .docx

Incorporate the confirmed keywords naturally into the summary, skills, and experience bullets — emphasized where they matter most for the JD, never bolted on as a meaningless list. Keep it coherent and professional. Then build a clean Word document.

Read `references/docx-build.md` for the exact build approach, layout, and a reusable build script (`scripts/build_resume.js`). The resume must:
- be ATS-parseable (single column, standard section headers, no text boxes/tables-as-layout, no photo)
- default to a clean, modern look (navy + accent rule headers, Calibri/Arial)
- only highlight/track changes if the user explicitly asks; default is a normal clean resume
- replace any fabricated metric with real numbers or honest qualitative phrasing

Validate the file, render it to an image, and visually check it before presenting. Then present the `.docx` via `present_files` and give a concise change-log in chat (what was added, where, and which JD items remain genuine gaps).

## Output checklist

Before presenting, confirm:
- [ ] The 6-point scored review was delivered in the exact format
- [ ] ATS table + match % was shown
- [ ] Every added skill was either already evidenced or explicitly confirmed by the user
- [ ] No `[ ]` placeholders remain in the final document
- [ ] Remaining honest gaps were named, not hidden
- [ ] The .docx validated, was visually checked, and was presented
- [ ] A change-log was given in chat

## Re-running / iterating

Users often refine across several turns (new JD, freshly remembered skills, updated follower counts). Keep the build script and rebuild incrementally rather than starting over. Re-confirm only what's newly uncertain.
