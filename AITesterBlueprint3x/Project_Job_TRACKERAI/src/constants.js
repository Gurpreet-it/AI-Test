export const STATUS_COLUMNS = [
  {
    id: "wishlist",
    title: "Wishlist",
    accent: "border-l-amber-400",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
    drop: "bg-amber-50/80 dark:bg-amber-400/10",
  },
  {
    id: "applied",
    title: "Applied",
    accent: "border-l-sky-400",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200",
    drop: "bg-sky-50/80 dark:bg-sky-400/10",
  },
  {
    id: "follow-up",
    title: "Follow-up",
    accent: "border-l-violet-400",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200",
    drop: "bg-violet-50/80 dark:bg-violet-400/10",
  },
  {
    id: "interview",
    title: "Interview",
    accent: "border-l-teal-400",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200",
    drop: "bg-teal-50/80 dark:bg-teal-400/10",
  },
  {
    id: "offer",
    title: "Offer",
    accent: "border-l-emerald-400",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200",
    drop: "bg-emerald-50/80 dark:bg-emerald-400/10",
  },
  {
    id: "rejected",
    title: "Rejected",
    accent: "border-l-rose-400",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200",
    drop: "bg-rose-50/80 dark:bg-rose-400/10",
  },
];

export const STATUS_BY_ID = Object.fromEntries(
  STATUS_COLUMNS.map((column) => [column.id, column]),
);

export const todayInputValue = () => new Date().toISOString().slice(0, 10);

export const blankJobForm = (status = "wishlist") => ({
  company: "",
  role: "",
  linkedinUrl: "",
  resume: "",
  dateApplied: todayInputValue(),
  salary: "",
  notes: "",
  status,
});
