export type ContentStatus = "Pending" | "Writing" | "Imaging" | "Done" | "Error";
export type ContentBrand = "tech" | "hcl-unica";

export interface ContentRow {
  date: string;
  topic: string;
  linkedinPost: string;
  mediumArticle: string;
  igScript: string;
  ytScript: string;
  devToArticle: string;
  status: ContentStatus;
  linkedinImage: string;
  mediumImage: string;
  igImage: string;
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

export const COL = {
  DATE: 1, TOPIC: 2, LINKEDIN_POST: 3, MEDIUM_ARTICLE: 4, IG_SCRIPT: 5,
  YT_SCRIPT: 6, DEVTO_ARTICLE: 7, STATUS: 8, LINKEDIN_IMAGE: 9, MEDIUM_IMAGE: 10, IG_IMAGE: 11,
} as const;
