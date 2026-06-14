# ContentForge

ContentForge is a local Next.js dashboard and TypeScript pipeline for generating a daily content package from a topic, writing the output into `content_calendar.xlsx`, and saving generated images under `public/images`.

## Setup

```bash
npm install
cp .env.example .env.local
```

Add your keys to `.env.local` or `.env`:

```bash
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

Optional image model override:

```bash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

If the configured Gemini image model is unavailable, the image agent tries the current image model fallbacks: `gemini-3.1-flash-image`, `gemini-3-pro-image`, and `gemini-2.5-flash-image`.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

The scheduler is initialized by the Next.js instrumentation hook and triggers the pipeline daily at 9:00 AM local time. You can also run the scheduler as a separate Node process:

```bash
npm run scheduler
```

Use the dashboard button to run the pipeline manually.

## Files

- Excel workbook: `content_calendar.xlsx` in the project root. It is created automatically on first read/write.
- Generated images: `public/images`.
- API keys: `.env.local` or `.env`. If both exist, `.env.local` wins.

## API Routes

- `POST /api/run` starts the pipeline.
- `GET /api/calendar` returns all calendar rows.
- `GET /api/today` returns today's row.
- `GET /api/status` returns pipeline state, API key health, next scheduled run, and workbook metadata.
- `GET /api/log` returns Excel write logs.
- `GET /api/download` downloads `content_calendar.xlsx`.

## Content Flow

The pipeline runs Topic Generator -> Content Writer -> Image Generator. Each step writes back to Excel immediately through a single `ExcelManager` mutex so the workbook stays current and avoids concurrent writes.
