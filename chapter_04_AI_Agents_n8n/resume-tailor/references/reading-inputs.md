# Reading inputs (resume + JD)

## Resume

- **PDF already in context**: If the resume PDF's text is visible in the conversation (a `document` block), just use it — don't re-read from disk.
- **PDF on disk only** (path under `/mnt/user-data/uploads/`, not in context): extract text with
  ```bash
  pdftotext -layout /mnt/user-data/uploads/resume.pdf - | head -200
  ```
  or use the pdf-reading skill for scanned/complex PDFs.
- **.docx**: `extract-text resume.docx` (from the docx skill) for a markdown view of the content.
- **Image of a resume**: you can read it natively via the `view` tool — no OCR needed.

Capture: roles, dates, companies, locations, bullet content, skills list, education, certs, and any links/handles. Note anything dated or undersold (e.g. a years-of-experience figure that contradicts the role history).

## Job description

- Pasted text: use directly.
- File/URL: read it. For a URL the user supplied, `web_fetch` it.

Pull out: required years, must-have languages/tools/frameworks (named explicitly), responsibilities, the domain/industry, and any "preferred"/"nice to have" items (these are lower priority but still worth matching truthfully).

## Profile updates the user volunteers

Users often correct or update facts mid-conversation (total years of experience, follower/subscriber counts, new side projects, current title). Treat these as authoritative factual updates — fold them in directly. They are not "skills to confirm"; they're the candidate telling you about themselves.
