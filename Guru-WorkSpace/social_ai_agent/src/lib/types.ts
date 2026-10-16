export type ContentStatus = "Pending" | "Writing" | "Imaging" | "Done" | "Error";
export type ContentBrand = "tech" | "hcl-unica";

export interface ContentRow {
  id: string;
  brand: ContentBrand;
  date: string;
  topic: string;
  linkedinPost: string;
  igScript: string;
  status: ContentStatus;
  /** Public URL of the Gemini image-prompt file, e.g. /images/prompts-tech-....txt */
  promptFile: string;
}

export interface AgentResult {
  success: boolean;
  message: string;
  data?: Partial<ContentRow>;
}

export interface PipelineResult {
  topic: AgentResult;
  content: AgentResult;
  images: AgentResult;
  ranAt: string;
}

export type PipelineStep = "full" | "topic" | "content" | "images";
