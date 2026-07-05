# Building the .docx resume

## Approach

Use the **docx** skill's conventions (read `/mnt/skills/public/docx/SKILL.md` if unsure). Generate the file with the `docx` npm library via a Node script, validate it, render to an image, and eyeball it before presenting.

`scripts/build_resume.js` is a working, data-driven template. It reads a `resume.json` describing the candidate and emits a clean single-column resume. Adapt the JSON to the candidate; only touch the JS if the structure needs to change.

```bash
cd <workdir>
npm install docx            # once
node build_resume.js        # reads resume.json, writes <name>_Resume.docx
python /mnt/skills/public/docx/scripts/office/validate.py <name>_Resume.docx
# visual check:
python /mnt/skills/public/docx/scripts/office/soffice.py --headless --convert-to pdf <name>_Resume.docx
pdftoppm -jpeg -r 100 <name>_Resume.pdf pg && # then view pg-1.jpg
```

## Layout requirements (ATS-safe + attractive)

- **Single column.** Multi-column and text boxes confuse ATS parsers.
- **Standard section headers**: Professional Summary, Core Skills, Work Experience, plus optional Founder/Educator, Side Projects, Certifications, Languages.
- **No photo, no icons-as-text, no tables used for layout.** A bottom-border rule under headers is fine (it's paragraph formatting, not a table).
- **Right-aligned dates** via a right tab stop on the role line.
- **Fonts**: Calibri or Arial. Navy (#1F3A5F) headers with an accent rule (#C0392B) reads clean and modern; keep body black.
- **Length**: 1–2 pages. Don't pad.

## Content rules

- Lead the summary with title + years + 2–3 differentiators that match the JD.
- Skills grouped by category (Languages/Automation, API/Mobile, Cloud & CI/CD, Security, Leadership, etc.) so JD keywords sit where a scanner expects them.
- Most-recent role gets the richest, most quantified bullets.
- **No fabricated metrics.** If a real number isn't available, use honest qualitative phrasing ("materially reduced flakiness") rather than a fake percentage or a leftover `[ ]` placeholder.
- Default to a **normal clean resume** — no highlighting or tracked changes unless the user explicitly requests them. If they want to see changes, prefer giving a change-log in chat over marking up the document.

## After building

1. Validate (must pass).
2. Convert to image and visually confirm spacing, page breaks, and that nothing overflows.
3. Copy to `/mnt/user-data/outputs/` and `present_files`.
4. Give a concise change-log in chat: what was added, where it lives, the before/after ATS match %, and the remaining honest gaps.
