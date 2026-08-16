# AI Test Case Generator - Production Ready

## Problem Statement

The foundation of quality assurance is a **strong and comprehensive set of test cases**. However, creating detailed test cases is often a time-consuming task for QA engineers.

So, what if we had a tool that could generate comprehensive test cases in just a few minutes?

## Solution

To address this challenge, I have created an **AI-powered test case generation agent**. The agent takes the **Jira Story ID and Design Document** as inputs, analyses the requirements, and generates detailed test cases.

Additionally, if **Figma screens or UI screenshots** are available, they can be attached as inputs so the agent can analyse the UI and include relevant UI test scenarios.

The goal is to **reduce the time spent on test-case creation while improving test coverage, consistency, and quality**, allowing QA engineers to focus more on test execution, analysis, and overall product quality.

---

## About

A **React + Node.js** application that generates evidence-based test cases from a **Jira Story**, a **Design Document (PDF)**, and **UI Screenshots** using GPT-4o Vision.

Outputs a downloadable Excel file in the format `TestCase_<StoryID>_<Date>.xlsx`.

---

## Table of Contents

1. [What It Does](#1-what-it-does)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Getting API Credentials](#4-getting-api-credentials)
5. [Local Development](#5-local-development)
6. [Vercel Deployment](#6-vercel-deployment)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Using the Application](#8-using-the-application)
9. [Project Structure](#9-project-structure)
10. [Known Limitations](#10-known-limitations)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What It Does

| Step | What happens |
|------|-------------|
| 1 | You enter a **Jira Story ID** (e.g. `HMA-1234`) |
| 2 | Optionally upload a **PDF design document** |
| 3 | Optionally upload one or more **UI screenshots** |
| 4 | Click **Generate Test Cases** |
| 5 | The app fetches the full Jira story (description, acceptance criteria, comments, subtasks, labels, components) |
| 6 | Text is extracted from the PDF |
| 7 | Screenshots are analysed by GPT-4o Vision |
| 8 | GPT-4o generates evidence-based test cases — no invented requirements |
| 9 | Results appear in a searchable, filterable, sortable table |
| 10 | Download all test cases as a formatted Excel file |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser  (React + Vite)                                    │
│  - Input: Story ID, PDF, Screenshots                        │
│  - Output: Test case table + Excel download                 │
│  - Light / Dark theme                                       │
└───────────────────────┬─────────────────────────────────────┘
                        │  /api/*  (same domain — no CORS)
         ┌──────────────▼──────────────────┐
         │  Serverless Functions (Node.js) │   ← On Vercel
         │  api/fetch-jira.js              │
         │  api/generate.js                │
         │  api/download-excel.js          │
         └──┬──────────────┬───────────────┘
            │              │
    ┌───────▼──────┐  ┌────▼──────┐
    │  Jira REST   │  │  OpenAI   │
    │  API v3      │  │  GPT-4o   │
    └──────────────┘  └───────────┘
```

**Local development** uses the `backend/` Express server on port 3001 (the Vite dev server proxies `/api` to it).  
**Vercel** uses the `api/` serverless functions — same logic, no extra server to manage.

---

## 3. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18 LTS or newer | `node -v` to check |
| npm | 9+ | bundled with Node |
| Git | any | for cloning / Vercel integration |
| Vercel account | free or pro | https://vercel.com — **Pro recommended** (see §10) |

---

## 4. Getting API Credentials

### 4a. Jira API Token

1. Log in to **https://id.atlassian.com/manage-profile/security/api-tokens**
2. Click **Create API token**
3. Give it a label (e.g. `test-case-generator`)
4. Copy the token — you will not see it again
5. Note your Jira base URL (e.g. `https://yourcompany.atlassian.net`)
6. Note the email address you use to log in to Jira

### 4b. OpenAI API Key

1. Log in to **https://platform.openai.com/api-keys**
2. Click **Create new secret key**
3. Copy the key (starts with `sk-proj-…`)
4. Make sure your account has **GPT-4o** access and sufficient credits

---

## 5. Local Development

### 5a. Clone / open the project

```bash
cd "path/to/Test-Case-Generator"
```

### 5b. Configure credentials

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=you@yourcompany.com
JIRA_TOKEN=ATATT3xFfGF0...
OpenAi=sk-proj-...
```

> **Security**: `.env` is read only by the backend. It is never sent to the browser.

### 5c. Install dependencies

```bash
# Root (for Vercel API functions — also used by the backend)
npm install

# Backend (Express local dev server)
cd backend && npm install && cd ..

# Frontend (React + Vite)
cd frontend && npm install && cd ..
```

Or use the convenience script:

```bash
npm run install:local
```

### 5d. Start both servers

**Terminal 1 — Backend** (port 3001):

```bash
npm run dev:backend
# or: cd backend && npm run dev
```

**Terminal 2 — Frontend** (port 5173):

```bash
npm run dev:frontend
# or: cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

The Vite dev server automatically proxies all `/api/*` requests to `http://localhost:3001`.

---

## 6. Vercel Deployment

### 6a. Push to GitHub (or GitLab / Bitbucket)

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/test-case-generator.git
git push -u origin main
```

> **Important**: Make sure `.env` is listed in `.gitignore` so your secrets are never committed.

Add a `.gitignore` if you don't have one:

```
.env
node_modules/
frontend/node_modules/
backend/node_modules/
frontend/dist/
```

### 6b. Import the project into Vercel

1. Go to **https://vercel.com/new**
2. Click **Import Git Repository**
3. Select your repository
4. Vercel will auto-detect the configuration from `vercel.json`

The settings it will use are already configured in `vercel.json`:

| Setting | Value |
|---------|-------|
| Install Command | `npm install` |
| Build Command | `cd frontend && npm ci && npm run build` |
| Output Directory | `frontend/dist` |

> Do NOT override these in the Vercel dashboard — the `vercel.json` values take precedence.

### 6c. Add Environment Variables in Vercel

Before deploying, set your environment variables in the Vercel dashboard:

1. In your Vercel project, go to **Settings → Environment Variables**
2. Add each variable below for **Production**, **Preview**, and **Development** environments:

| Variable Name | Example Value | Description |
|--------------|---------------|-------------|
| `JIRA_BASE_URL` | `https://yourcompany.atlassian.net` | Your Jira instance URL |
| `JIRA_EMAIL` | `you@company.com` | Email used to log in to Jira |
| `JIRA_TOKEN` | `ATATT3x…` | Jira API token from §4a |
| `OpenAi` | `sk-proj-…` | OpenAI API key from §4b |

> **Critical**: Variable names are case-sensitive. Use exactly `OpenAi` (capital A, lowercase i).

### 6d. Deploy

Click **Deploy** in the Vercel dashboard.

Vercel will:
1. Run `npm install` (installs API function dependencies)
2. Run `cd frontend && npm ci && npm run build` (builds the React app)
3. Deploy `frontend/dist/` as the static frontend
4. Deploy `api/*.js` as serverless functions

Your app will be live at `https://your-project.vercel.app`.

### 6e. Redeploy after changes

Any `git push` to the connected branch triggers an automatic redeploy.

To redeploy manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the project root
vercel --prod
```

---

## 7. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_BASE_URL` | Yes | Full URL of your Jira instance (no trailing slash) |
| `JIRA_EMAIL` | Yes | Jira account email |
| `JIRA_TOKEN` | Yes | Jira API token (not your password) |
| `OpenAi` | Yes | OpenAI API key — must be exactly `OpenAi` |

All variables are read **server-side only**. They are never exposed in the browser or in API responses.

---

## 8. Using the Application

### Step 1 — Enter Story ID

Type your Jira Story ID in the **Story ID** field (e.g. `HMA-1234`, `PROJ-567`).

The field validates format on blur. Click **Generate Test Cases** and the app will validate before calling the API.

### Step 2 — Upload Design Document (optional)

Click the PDF drop zone or drag and drop a PDF.

- Only PDF files are accepted
- Maximum 4 MB (Vercel) or 20 MB (local)
- Text is extracted automatically; image-based/scanned PDFs are flagged

### Step 3 — Upload Screenshots (optional)

Click the screenshots drop zone or drag and drop images.

- Formats: PNG, JPG, WEBP, GIF, BMP
- Up to 20 screenshots
- **Images are automatically compressed** to JPEG at 1920 px / 82% quality before upload — this keeps the total payload under Vercel's 4.5 MB limit while preserving all visible detail

### Step 4 — Generate

Click **⚡ Generate Test Cases**.

The app will:
1. Fetch the Jira story (description, acceptance criteria, comments, subtasks, labels, components)
2. Extract text from the PDF
3. Send all inputs to GPT-4o
4. Display the generated test cases

Generation typically takes **15–45 seconds** depending on input size.

### Step 5 — Review Results

The output table shows all 12 test case fields. You can:

- **Search** across all fields using the search box
- **Filter** by Priority, Test Type, or Status using the dropdowns
- **Sort** by any column (click the column header)
- **Paginate** using the controls below the table (10 / 25 / 50 / 100 per page)
- **Click any row** to open a detail modal with the full test case

### Step 6 — Download Excel

Click **⬇ Download Excel** to download all generated test cases (not just the current page).

The Excel file:
- Is named `TestCase_<StoryID>_<Date>.xlsx`
- Has a frozen header row
- Has auto-filters on all columns
- Has word wrap on test steps and expected results
- Has readable column widths

### Switching Themes

Click the **🌙 Dark Mode / ☀️ Light Mode** toggle in the top-right corner. The selected theme is consistent across all UI controls and the table.

---

## 9. Project Structure

```
Test-Case-Generator/
│
├── .env                        ← Local credentials (never commit)
├── .env.example                ← Template for new setups
├── vercel.json                 ← Vercel deployment configuration
├── package.json                ← Root — API function dependencies
│
├── api/                        ← Vercel serverless functions (production)
│   ├── _lib/
│   │   ├── jira.js             ← Jira fetch + ADF text extraction
│   │   └── prompt.js           ← OpenAI system + user prompt builders
│   ├── fetch-jira.js           ← POST /api/fetch-jira
│   ├── generate.js             ← POST /api/generate
│   └── download-excel.js       ← POST /api/download-excel
│
├── backend/                    ← Express server (local development only)
│   ├── server.js               ← All routes in one file
│   └── package.json
│
└── frontend/                   ← React + Vite application
    ├── package.json
    ├── vite.config.js          ← Dev proxy: /api → localhost:3001
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx             ← Root component, theme state
        ├── App.css             ← Full design system (light + dark tokens)
        └── components/
            ├── InputPanel.jsx  ← Story ID, PDF upload, screenshot upload
            ├── OutputPanel.jsx ← Table, search, filter, sort, pagination
            └── ThemeToggle.jsx ← Light / dark toggle button
```

### API Routes

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| POST | `/api/fetch-jira` | `api/fetch-jira.js` | Preview a Jira story |
| POST | `/api/generate` | `api/generate.js` | Full generation (multipart) |
| POST | `/api/download-excel` | `api/download-excel.js` | Convert JSON → `.xlsx` |

---

## 10. Known Limitations

### Vercel Request Body Size — 4.5 MB

Vercel enforces a **4.5 MB maximum** request body size on all plans. This applies to the combined upload of PDF + screenshots.

**Mitigation built in**: Screenshots are automatically compressed to JPEG at 1920 px / 82% quality before upload. A typical 2 MB PNG becomes ~150–250 KB. This allows:
- 1 PDF (~1–2 MB) + up to ~10 compressed screenshots without exceeding the limit

If you regularly work with large design documents, consider self-hosting the backend on a platform without this limit (Railway, Render, Fly.io) and using Vercel only for the frontend.

### Vercel Function Timeout — 60 seconds (Pro) / 10 seconds (Hobby)

The `/api/generate` function is configured with `maxDuration: 60` seconds.

- **Vercel Pro**: 60 seconds — sufficient for most GPT-4o calls with vision
- **Vercel Hobby**: 10 seconds — **not recommended** for this application; GPT-4o with multiple screenshots often takes 20–45 seconds

**Recommendation**: Use **Vercel Pro** for this application.

### Image-Based PDFs

PDFs that are entirely scanned images contain no extractable text. The app will flag this with a warning and proceed using the Jira story and screenshots only. Consider providing screenshots of the relevant PDF pages as additional screenshots.

### Jira Custom Fields

Acceptance Criteria in Jira is often stored in a custom field whose ID varies by Jira instance. The app checks `customfield_10015` and `customfield_10300` (the two most common). If your instance uses a different field, the AC may appear in the Description instead.

---

## 11. Troubleshooting

### "Story ID not found in Jira"

- Verify the Story ID is correct (e.g. `HMA-1234`, not `hma1234`)
- Confirm your `JIRA_TOKEN` has permission to access the project
- Check that `JIRA_BASE_URL` is the correct Jira instance URL with no trailing slash

### "Jira authentication failed"

- Regenerate your Jira API token at https://id.atlassian.com/manage-profile/security/api-tokens
- Confirm `JIRA_EMAIL` matches the email used to log in to Jira exactly
- On Vercel, re-enter the environment variables — they do not carry over from `.env`

### "OpenAI quota exceeded"

- Check your OpenAI usage at https://platform.openai.com/usage
- Add billing credits at https://platform.openai.com/settings/billing

### "AI generation failed" / empty response

- Try generating again — OpenAI can occasionally return empty responses under load
- Reduce the number of screenshots (send 3–5 key screens rather than 15+)
- Make sure the Jira story has a meaningful description

### Upload not working on Vercel / "Total upload size exceeds 4 MB"

- Compress your PDF (use https://smallpdf.com or similar)
- The screenshots are already auto-compressed — reduce the count if needed
- Verify you are on Vercel Pro (Hobby has the same 4.5 MB limit but the 10 s timeout will also be a problem)

### Build fails on Vercel

1. Check the Vercel build log for the exact error
2. Confirm all 4 environment variables are set in **Settings → Environment Variables**
3. Ensure the repository contains `vercel.json` with the correct `buildCommand` and `outputDirectory`
4. Try a fresh deploy: **Deployments → ⋯ → Redeploy**

### Local dev: "Cannot GET /api/..."

- Make sure the backend Express server is running (`npm run dev:backend`)
- Check that port 3001 is not in use by another process
- The frontend dev server proxies `/api/*` to `http://localhost:3001` — both must be running simultaneously

