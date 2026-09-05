import { runImagesOnly } from "@/agents/pipeline";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await runImagesOnly();
  return Response.json(result);
}
