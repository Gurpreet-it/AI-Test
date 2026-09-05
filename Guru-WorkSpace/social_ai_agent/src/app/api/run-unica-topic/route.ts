import { runUnicaTopicOnly } from "@/agents/pipeline";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await runUnicaTopicOnly();
  return Response.json(result);
}
