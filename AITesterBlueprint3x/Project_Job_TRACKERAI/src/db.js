import { openDB } from "idb";

const DB_NAME = "job-tracker-ai";
const DB_VERSION = 1;
const JOB_STORE = "jobs";

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(JOB_STORE)) {
      const store = db.createObjectStore(JOB_STORE, { keyPath: "id" });
      store.createIndex("status", "status");
      store.createIndex("company", "company");
      store.createIndex("role", "role");
    }
  },
});

export async function getAllJobs() {
  const db = await dbPromise;
  return db.getAll(JOB_STORE);
}

export async function saveJob(job) {
  const db = await dbPromise;
  await db.put(JOB_STORE, job);
  return job;
}

export async function deleteJob(id) {
  const db = await dbPromise;
  await db.delete(JOB_STORE, id);
}

export async function replaceJobs(jobs) {
  const db = await dbPromise;
  const tx = db.transaction(JOB_STORE, "readwrite");
  await tx.store.clear();

  for (const job of jobs) {
    await tx.store.put(job);
  }

  await tx.done;
  return jobs;
}
