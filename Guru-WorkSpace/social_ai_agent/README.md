# Social AI Agent

Social AI Agent is a Next.js dashboard for generating social-media content through two tracks: general technology topics and HCL Unica topics. It uses a local Ollama `qwen3:14b` model (override with `OLLAMA_MODEL` in `.env.local`) to generate topics and post copy, records results in an Excel workbook, and creates image-generation prompt files.

## Features

- Generate technology or HCL Unica topics while avoiding topics already recorded in the workbook when possible.
- Generate a LinkedIn post and a 10-slide Instagram carousel script for the latest topic.
- Run the full pipeline or run topic, content, and image-prompt stages separately from the dashboard.
- View pipeline status, recent activity, and saved content in the dashboard.
- Run the technology full pipeline daily at 9:00 AM while the Node.js server is running.

The image stage currently writes a text prompt under `public/images/`; it does not generate an image file.

## Requirements

- Node.js and npm
- [Ollama](https://ollama.com/) with the `qwen3:14b` model available locally

## Setup and Run

From this directory:

```bash
npm install
ollama pull qwen3:14b
```

Start Ollama in a separate terminal if it is not already running:

```bash
ollama serve
```

Then start the dashboard:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No application environment variables are currently required. `.env.local` is ignored by Git; keep local credentials and configuration there if future integrations need them.

## Dashboard Actions

The dashboard has separate **Tech Track** and **HCL Unica Track** controls:

| Action | Result |
|---|---|
| Full Pipeline / Unica Full | Generate a topic, write content, and save an image prompt |
| Topic Only / Unica Topic | Generate and save a topic |
| Write Content / Unica Content | Write content for the latest saved topic |
| Generate Prompts / Unica Images | Save an image prompt for the latest saved topic |

The content writer currently creates LinkedIn and Instagram content. Other fields in the workbook model are reserved for additional channels.

## API Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/content` | Read saved content rows |
| `POST` | `/api/run` | Run the full technology pipeline |
| `POST` | `/api/run-topic` | Generate a technology topic |
| `POST` | `/api/run-content` | Generate content for the latest technology topic |
| `POST` | `/api/run-images` | Generate a technology image prompt |
| `POST` | `/api/run-unica` | Run the full HCL Unica pipeline |
| `POST` | `/api/run-unica-topic` | Generate an HCL Unica topic |
| `POST` | `/api/run-unica-content` | Generate content for the latest HCL Unica topic |
| `POST` | `/api/run-unica-images` | Generate an HCL Unica image prompt |

## Data and Generated Files

- `content.xlsx` is created in the project root when the pipeline first needs it. It stores dates, topics, LinkedIn posts, Instagram scripts, and status.
- Generated prompt text is saved as timestamped files in `public/images/` and served from `/images/`.
- The dashboard refreshes its content view every two seconds.
- The scheduled job runs at 9:00 AM in the server's local timezone. It only runs while the Node.js process is alive; avoid running multiple production instances with the scheduler enabled unless duplicate runs are acceptable.

## Project Layout

```text
src/
  agents/       Topic, content, image-prompt, and pipeline logic
  app/          Next.js dashboard and API routes
  components/   Dashboard controls, activity log, table, and status badge
  lib/          Excel persistence, scheduler, and shared types
public/images/  Generated image-prompt text files
```

## Package Scripts

```bash
npm run dev     # Start the development server
npm run build   # Create a production build
npm run start   # Serve the production build
npm run lint    # Run Next.js linting
```