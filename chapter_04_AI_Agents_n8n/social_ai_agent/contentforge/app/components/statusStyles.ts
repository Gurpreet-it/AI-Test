import { ContentStatus } from "@/lib/types";

export function statusPillClass(status: ContentStatus | string): string {
  switch (status) {
    case ContentStatus.Pending:
      return "bg-stone-100 text-stone-700 ring-stone-200";
    case ContentStatus.Writing:
      return "bg-sky-100 text-sky-800 ring-sky-200";
    case ContentStatus.Imaging:
      return "bg-violet-100 text-violet-800 ring-violet-200";
    case ContentStatus.Done:
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case ContentStatus.Error:
      return "bg-rose-100 text-rose-800 ring-rose-200";
    default:
      return "bg-stone-100 text-stone-700 ring-stone-200";
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
