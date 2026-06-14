export enum ContentStatus {
  Pending = "Pending",
  Writing = "Writing",
  Imaging = "Imaging",
  Done = "Done",
  Error = "Error"
}

export interface ContentRow {
  date: string;
  topic: string;
  linkedinPost: string;
  mediumArticle: string;
  igScript: string;
  ytScript: string;
  devtoArticle: string;
  status: ContentStatus;
  linkedinImage: string;
  mediumImage: string;
  igImage: string;
}

export interface WriteLogEntry {
  timestamp: string;
  agent: string;
  action: string;
  date: string;
  topic: string;
  status: ContentStatus | "";
  details: string;
}

export interface WorkbookMetadata {
  path: string;
  exists: boolean;
  modifiedAt: string | null;
  sizeBytes: number;
}

export interface ApiKeyHealth {
  groq: boolean;
  gemini: boolean;
}

export type PipelineStage = "idle" | "topic" | "writing" | "imaging" | "done" | "error";

export interface PipelineState {
  running: boolean;
  stage: PipelineStage;
  message: string;
  currentTopic: string | null;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastUpdatedAt: string | null;
  error: string | null;
}

export interface PipelineRunResult {
  ok: boolean;
  row: ContentRow | null;
  message: string;
}

export interface SchedulerStatus {
  initialized: boolean;
  cronExpression: string;
  timezone: string;
  nextRunAt: string;
}

export const CONTENT_STATUSES: readonly ContentStatus[] = [
  ContentStatus.Pending,
  ContentStatus.Writing,
  ContentStatus.Imaging,
  ContentStatus.Done,
  ContentStatus.Error
] as const;

export function isContentStatus(value: string): value is ContentStatus {
  return CONTENT_STATUSES.includes(value as ContentStatus);
}
