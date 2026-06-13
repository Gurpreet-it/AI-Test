# Job Tracker AI

A local-first Kanban tracker for job applications. It runs as a Vite React single-page app and stores all data in the browser with IndexedDB through the `idb` library.

## Features

- Wishlist, Applied, Follow-up, Interview, Offer, and Rejected columns.
- Drag cards between columns with dnd-kit.
- Add, edit, and delete job cards.
- Search by company or role.
- Resume name reuse with a datalist of previously entered resumes.
- Light/dark mode.
- JSON export and import for backups.
- Newest/oldest date sorting within each column.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints in the terminal.

## Build

```bash
npm run build
```

## Storage

Data stays in your browser under the IndexedDB database `job-tracker-ai`. There is no backend, authentication, or external API call.
