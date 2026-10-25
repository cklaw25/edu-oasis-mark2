import { insights, tigerConfigured } from "@/lib/tiger";

export const runtime = "nodejs";

// GET ?learner=… -> predictions + decisions computed in Tiger Data (see src/lib/tiger.ts)
export async function GET(req: Request) {
  if (!tigerConfigured()) return Response.json({ configured: false });
  const learner = new URL(req.url).searchParams.get("learner")?.slice(0, 64);
  if (!learner) return Response.json({ error: "Missing learner" }, { status: 400 });
  try {
    return Response.json({ configured: true, ...(await insights(learner)) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "Tiger Data query failed" }, { status: 502 });
  }
}
