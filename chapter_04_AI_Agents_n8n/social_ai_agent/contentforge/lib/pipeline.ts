import { ContentWriterAgent, ImageGeneratorAgent, TopicGeneratorAgent } from "./agents";
import { getExcelManager } from "./excelManager";
import { formatLocalDate, nowIso } from "./time";
import { ContentStatus, type ContentRow, type PipelineRunResult, type PipelineState } from "./types";

const pipelineState: PipelineState = {
  running: false,
  stage: "idle",
  message: "Idle",
  currentTopic: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastUpdatedAt: null,
  error: null
};

let activeRun: Promise<PipelineRunResult> | null = null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function setPipelineState(update: Partial<PipelineState>): void {
  Object.assign(pipelineState, update, { lastUpdatedAt: nowIso() });
}

export function getPipelineState(): PipelineState {
  return { ...pipelineState };
}

export function runPipeline(date = formatLocalDate()): Promise<PipelineRunResult> {
  if (activeRun) {
    return activeRun;
  }

  activeRun = executePipeline(date).finally(() => {
    activeRun = null;
  });

  return activeRun;
}

async function executePipeline(date: string): Promise<PipelineRunResult> {
  const startedAt = nowIso();
  setPipelineState({
    running: true,
    stage: "topic",
    message: "Generating topic",
    currentTopic: null,
    lastStartedAt: startedAt,
    lastFinishedAt: null,
    error: null
  });

  let row: ContentRow | null = null;

  try {
    row = await new TopicGeneratorAgent().run(date);
    setPipelineState({
      stage: "writing",
      message: "Writing content package",
      currentTopic: row.topic
    });

    row = await new ContentWriterAgent().run(date);
    setPipelineState({
      stage: "imaging",
      message: "Generating images",
      currentTopic: row.topic
    });

    row = await new ImageGeneratorAgent().run(date);
    setPipelineState({
      running: false,
      stage: "done",
      message: "Pipeline finished",
      currentTopic: row.topic,
      lastFinishedAt: nowIso(),
      error: null
    });

    return { ok: true, row, message: "Pipeline finished" };
  } catch (error) {
    const message = errorMessage(error);

    try {
      const today = await getExcelManager().getTodayRow(date);
      if (today) {
        row = await getExcelManager().updateRowByDate(
          date,
          { status: ContentStatus.Error },
          "Pipeline",
          "Pipeline failed",
          message
        );
      }
    } catch (logError) {
      console.error("Failed to write pipeline error to Excel", logError);
    }

    setPipelineState({
      running: false,
      stage: "error",
      message,
      currentTopic: row?.topic ?? null,
      lastFinishedAt: nowIso(),
      error: message
    });

    throw error;
  }
}
