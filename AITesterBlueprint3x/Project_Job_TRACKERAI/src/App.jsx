import {
  CalendarDays,
  Download,
  GripVertical,
  Linkedin,
  Moon,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { blankJobForm, STATUS_BY_ID, STATUS_COLUMNS, todayInputValue } from "./constants";
import { deleteJob, getAllJobs, replaceJobs, saveJob } from "./db";

const dateToTime = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const makeId = () => {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `job_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const daysSince = (value) => {
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) {
    return "No date";
  }

  const today = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((todayDay - startDay) / 86_400_000);

  if (diff < 0) return "Future";
  if (diff === 0) return "Today";
  if (diff === 1) return "1 day";
  return `${diff} days`;
};

const isValidUrl = (value) => {
  if (!value.trim()) return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const normalizeImportedJobs = (items) =>
  items
    .filter((item) => item && String(item.company || "").trim() && String(item.role || "").trim())
    .map((item) => {
      const createdAt = item.createdAt || new Date().toISOString();
      const status = STATUS_BY_ID[item.status] ? item.status : "wishlist";

      return {
        id: item.id || makeId(),
        company: String(item.company || "").trim(),
        role: String(item.role || "").trim(),
        linkedinUrl: String(item.linkedinUrl || "").trim(),
        resume: String(item.resume || "").trim(),
        dateApplied: item.dateApplied || todayInputValue(),
        salary: String(item.salary || "").trim(),
        notes: String(item.notes || "").trim(),
        status,
        createdAt,
        updatedAt: item.updatedAt || createdAt,
      };
    });

function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortDirection, setSortDirection] = useState("newest");
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("job-tracker-theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [modalState, setModalState] = useState({ open: false, job: null, status: "wishlist" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [toast, setToast] = useState("");
  const importInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    let alive = true;

    getAllJobs()
      .then((storedJobs) => {
        if (alive) {
          setJobs(storedJobs);
        }
      })
      .catch(() => {
        if (alive) {
          setToast("Could not read local data");
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("job-tracker-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return undefined;

    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const resumeOptions = useMemo(() => {
    const names = jobs.map((job) => job.resume).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return jobs;

    return jobs.filter((job) =>
      [job.company, job.role].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [jobs, query]);

  const jobsByStatus = useMemo(() => {
    const grouped = Object.fromEntries(STATUS_COLUMNS.map((column) => [column.id, []]));

    for (const job of filteredJobs) {
      const status = STATUS_BY_ID[job.status] ? job.status : "wishlist";
      grouped[status].push(job);
    }

    for (const column of STATUS_COLUMNS) {
      grouped[column.id].sort((a, b) => {
        const diff = dateToTime(a.dateApplied) - dateToTime(b.dateApplied);
        return sortDirection === "oldest" ? diff : -diff;
      });
    }

    return grouped;
  }, [filteredJobs, sortDirection]);

  const openCreate = (status = "wishlist") => setModalState({ open: true, job: null, status });

  const openEdit = (job) => setModalState({ open: true, job, status: job.status });

  const closeModal = () => setModalState({ open: false, job: null, status: "wishlist" });

  const upsertJob = async (values) => {
    const existing = modalState.job;
    const timestamp = new Date().toISOString();
    const nextJob = existing
      ? { ...existing, ...values, updatedAt: timestamp }
      : {
          ...values,
          id: makeId(),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    await saveJob(nextJob);
    setJobs((current) => {
      if (existing) {
        return current.map((job) => (job.id === nextJob.id ? nextJob : job));
      }

      return [nextJob, ...current];
    });
    setToast(existing ? "Job updated" : "Job added");
    closeModal();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    await deleteJob(deleteTarget.id);
    setJobs((current) => current.filter((job) => job.id !== deleteTarget.id));
    setToast("Job deleted");
    setDeleteTarget(null);
  };

  const handleDragStart = ({ active }) => {
    const job = jobs.find((item) => item.id === active.id);
    setActiveJob(job || null);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveJob(null);
    if (!over || !STATUS_BY_ID[over.id]) return;

    const job = jobs.find((item) => item.id === active.id);
    if (!job || job.status === over.id) return;

    const updated = { ...job, status: over.id, updatedAt: new Date().toISOString() };
    await saveJob(updated);
    setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const exportJobs = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      jobs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-tracker-ai-${todayInputValue()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importJobs = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const rawJobs = Array.isArray(parsed) ? parsed : parsed.jobs;

      if (!Array.isArray(rawJobs)) {
        throw new Error("Invalid backup file");
      }

      const normalized = normalizeImportedJobs(rawJobs);
      if (!normalized.length) {
        throw new Error("No valid jobs found");
      }

      const shouldReplace = window.confirm(
        `Import ${normalized.length} jobs and replace the current board?`,
      );
      if (!shouldReplace) return;

      await replaceJobs(normalized);
      setJobs(normalized);
      setToast("Backup imported");
    } catch (error) {
      setToast(error.message || "Import failed");
    }
  };

  const totalLabel = `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-normal">Job Tracker AI</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{totalLabel}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <IconButton
                label={theme === "dark" ? "Use light mode" : "Use dark mode"}
                onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </IconButton>
              <IconButton label="Export JSON" onClick={exportJobs}>
                <Download className="h-4 w-4" />
              </IconButton>
              <IconButton label="Import JSON" onClick={() => importInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
              </IconButton>
              <input
                ref={importInputRef}
                className="hidden"
                type="file"
                accept="application/json,.json"
                onChange={importJobs}
              />
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white shadow-soft transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                type="button"
                onClick={() => openCreate()}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Job
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                placeholder="Search company or role"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <select
              className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              value={sortDirection}
              onChange={(event) => setSortDirection(event.target.value)}
              aria-label="Sort cards"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6">
        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Loading jobs
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveJob(null)}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STATUS_COLUMNS.map((column) => (
                <JobColumn
                  key={column.id}
                  column={column}
                  jobs={jobsByStatus[column.id]}
                  total={jobsByStatus[column.id].length}
                  onAdd={() => openCreate(column.id)}
                  onDelete={setDeleteTarget}
                  onEdit={openEdit}
                />
              ))}
            </div>

            <DragOverlay>
              {activeJob ? (
                <div className="w-72">
                  <JobCardContent job={activeJob} preview />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {modalState.open ? (
        <JobFormModal
          initialJob={modalState.job}
          initialStatus={modalState.status}
          resumeOptions={resumeOptions}
          onClose={closeModal}
          onSave={upsertJob}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteModal
          job={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-soft dark:bg-white dark:text-zinc-950">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({ children, label, onClick }) {
  return (
    <button
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus:ring-zinc-700"
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function JobColumn({ column, jobs, total, onAdd, onDelete, onEdit }) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={`flex h-[calc(100vh-220px)] min-h-[30rem] w-72 shrink-0 flex-col rounded-lg border border-zinc-200 bg-white transition dark:border-zinc-800 dark:bg-zinc-900 ${
        isOver ? column.drop : ""
      }`}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-3 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {column.title}
          </h2>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${column.badge}`}>
            {total}
          </span>
        </div>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-zinc-700"
          type="button"
          title={`Add to ${column.title}`}
          aria-label={`Add to ${column.title}`}
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {jobs.length ? (
          jobs.map((job) => (
            <JobCard key={job.id} job={job} onDelete={onDelete} onEdit={onEdit} />
          ))
        ) : (
          <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-zinc-200 text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
            No cards
          </div>
        )}
      </div>
    </section>
  );
}

function JobCard({ job, onDelete, onEdit }) {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: job.id,
    data: { job },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`touch-none ${isDragging ? "opacity-40" : ""}`}
      {...attributes}
      {...listeners}
    >
      <JobCardContent job={job} onDelete={onDelete} onEdit={onEdit} />
    </article>
  );
}

function JobCardContent({ job, onDelete, onEdit, preview = false }) {
  const status = STATUS_BY_ID[job.status] || STATUS_BY_ID.wishlist;

  return (
    <div
      className={`rounded-md border border-zinc-200 bg-white p-4 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950 ${status.accent} border-l-4 ${
        preview ? "shadow-soft" : "hover:-translate-y-0.5 hover:shadow-soft"
      }`}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="mt-1 h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="break-words text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {job.company}
              </h3>
              <p className="mt-1 break-words text-sm text-zinc-600 dark:text-zinc-300">
                {job.role}
              </p>
            </div>

            {!preview ? (
              <div className="flex shrink-0 items-center gap-1">
                {job.linkedinUrl ? (
                  <a
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-[#0A66C2] focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:focus:ring-zinc-700"
                    href={job.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open LinkedIn job"
                    aria-label="Open LinkedIn job"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <Linkedin className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : null}
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 dark:focus:ring-zinc-700"
                  type="button"
                  title="Edit job"
                  aria-label="Edit job"
                  onClick={() => onEdit(job)}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 dark:focus:ring-rose-500/30"
                  type="button"
                  title="Delete job"
                  aria-label="Delete job"
                  onClick={() => onDelete(job)}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {job.resume ? (
              <span className="max-w-full truncate rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {job.resume}
              </span>
            ) : null}
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {daysSince(job.dateApplied)}
            </span>
            {job.salary ? (
              <span className="max-w-full truncate rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {job.salary}
              </span>
            ) : null}
          </div>

          {job.notes ? (
            <p className="mt-3 line-clamp-3 break-words text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              {job.notes}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function JobFormModal({ initialJob, initialStatus, onClose, onSave, resumeOptions }) {
  const [values, setValues] = useState(() =>
    initialJob ? { ...blankJobForm(), ...initialJob } : blankJobForm(initialStatus),
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const title = initialJob ? "Edit Job" : "Add Job";

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.company.trim()) nextErrors.company = "Company is required";
    if (!values.role.trim()) nextErrors.role = "Role is required";
    if (!isValidUrl(values.linkedinUrl)) nextErrors.linkedinUrl = "Enter a valid URL";
    if (!values.dateApplied) nextErrors.dateApplied = "Date is required";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    await onSave({
      company: values.company.trim(),
      role: values.role.trim(),
      linkedinUrl: values.linkedinUrl.trim(),
      resume: values.resume.trim(),
      dateApplied: values.dateApplied,
      salary: values.salary.trim(),
      notes: values.notes.trim(),
      status: values.status,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-950/35 p-0 backdrop-blur-sm sm:p-4">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-soft dark:bg-zinc-950 sm:rounded-lg">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 dark:focus:ring-zinc-700"
            type="button"
            title="Close"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
            <Field label="Company name" error={errors.company}>
              <input
                className={inputClass(errors.company)}
                value={values.company}
                onChange={(event) => setField("company", event.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Job title / role" error={errors.role}>
              <input
                className={inputClass(errors.role)}
                value={values.role}
                onChange={(event) => setField("role", event.target.value)}
              />
            </Field>

            <Field label="LinkedIn job URL" error={errors.linkedinUrl} wide>
              <input
                className={inputClass(errors.linkedinUrl)}
                value={values.linkedinUrl}
                onChange={(event) => setField("linkedinUrl", event.target.value)}
                placeholder="https://www.linkedin.com/jobs/view/..."
                inputMode="url"
              />
            </Field>

            <Field label="Resume used">
              <input
                className={inputClass()}
                value={values.resume}
                onChange={(event) => setField("resume", event.target.value)}
                list="resume-options"
                placeholder="SDE_Resume_v3"
              />
              <datalist id="resume-options">
                {resumeOptions.map((resume) => (
                  <option key={resume} value={resume} />
                ))}
              </datalist>
            </Field>

            <Field label="Date applied" error={errors.dateApplied}>
              <input
                className={inputClass(errors.dateApplied)}
                type="date"
                value={values.dateApplied}
                onChange={(event) => setField("dateApplied", event.target.value)}
              />
            </Field>

            <Field label="Salary range">
              <input
                className={inputClass()}
                value={values.salary}
                onChange={(event) => setField("salary", event.target.value)}
                placeholder="$150-180K"
              />
            </Field>

            <Field label="Status">
              <select
                className={inputClass()}
                value={values.status}
                onChange={(event) => setField("status", event.target.value)}
              >
                {STATUS_COLUMNS.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes" wide>
              <textarea
                className={`${inputClass()} min-h-28 resize-y py-3`}
                value={values.notes}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Recruiter, referral, next action"
              />
            </Field>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <button
              className="h-10 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:focus:ring-zinc-700"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ children, error, label, wide = false }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {label}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function inputClass(error) {
  return `h-11 w-full rounded-md border bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:ring-2 dark:bg-zinc-900 dark:text-zinc-50 ${
    error
      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 dark:border-rose-500/60 dark:focus:ring-rose-500/20"
      : "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200 dark:border-zinc-800 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
  }`;
}

function DeleteModal({ job, onCancel, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Delete Job</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Delete {job.company} - {job.role}?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-10 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:focus:ring-zinc-700"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="h-10 rounded-md bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={deleting}
            onClick={handleConfirm}
          >
            {deleting ? "Deleting" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
