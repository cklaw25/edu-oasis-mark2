import { insertEvents, tigerConfigured, type IncomingEvent } from "@/lib/tiger";

export const runtime = "nodejs";

// POST { learner, events: [{ t, world, type, data }] } -> rows stored in the Tiger Data hypertable
export async function POST(req: Request) {
  if (!tigerConfigured()) return Response.json({ stored: 0, configured: false });
  const body = (await req.json().catch(() => ({}))) as { learner?: string; events?: IncomingEvent[] };
  const learner = typeof body.learner === "string" ? body.learner.slice(0, 64) : "";
  if (!learner || !Array.isArray(body.events)) return Response.json({ error: "Missing learner or events" }, { status: 400 });
  try {
    return Response.json({ stored: await insertEvents(learner, body.events), configured: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "Tiger Data insert failed" }, { status: 502 });
  }
}
