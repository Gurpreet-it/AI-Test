import dotenv from "dotenv";
import path from "node:path";
import type { ApiKeyHealth } from "./types";

let envLoaded = false;

export function loadLocalEnv(): void {
  if (envLoaded) {
    return;
  }

  dotenv.config({ path: path.join(process.cwd(), ".env") });
  dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });
  envLoaded = true;
}

export function getApiKeyHealth(): ApiKeyHealth {
  loadLocalEnv();

  return {
    groq: Boolean(process.env.GROQ_API_KEY?.trim()),
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim())
  };
}

export function requireEnv(name: "GROQ_API_KEY" | "GEMINI_API_KEY"): string {
  loadLocalEnv();

  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is missing. Add it to .env.local.`);
  }

  return value;
}

export function getGroqModel(): string {
  loadLocalEnv();
  return process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
}

export function getGeminiImageModel(): string {
  loadLocalEnv();
  return process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
}

export function getGeminiImageModelCandidates(): string[] {
  const configuredModel = getGeminiImageModel();
  const fallbackModels = [
    "gemini-3.1-flash-image",
    "gemini-3-pro-image",
    "gemini-2.5-flash-image"
  ];

  return Array.from(new Set([configuredModel, ...fallbackModels]));
}
