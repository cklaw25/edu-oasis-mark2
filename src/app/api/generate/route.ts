import { GoogleGenAI, type Part } from "@google/genai";
import {
  coverage,
  orderByYear,
  DESIGN_SCHEMA,
  KNOWLEDGE_SCHEMA,
  PATCH_SCHEMA,
  type Arena,
  type InspectClue,
  type IntroSlide,
  type KnowledgeItem,
  type WorldSpec,
} from "@/lib/worldSpec";

export const runtime = "nodejs";
export const maxDuration = 800;

// Quality first: the full Flash model writes better worlds but took 1-6 min per call on the free tier
// during the event, so each call falls back to lite if it is too slow or fails.
const QUALITY_MODEL = process.env.GEMINI_GEN_MODEL ?? "gemini-3.8-flash";
const FAST_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
const QUALITY_TIMEOUT_MS = 240_000;

const MAX_CLUES = 12; // object spots in the inspect room (src/game/layout.ts)

const EXTRACT_PROMPT = `You are building the knowledge base for an educational game.
Read ALL of the learner's resources and extract EVERY piece of examinable knowledge as separate atomic items:
- every key term with its definition
- every study: aim, sample, method/design, procedure, findings (with exact numbers), conclusion
- every number, date, name, statistic, quote
- every process/step and cause-effect link
- every evaluation point (strength, weakness, limitation, application)
Rules: do NOT summarise or merge items; one idea per item; keep numbers and names exact; never invent content.
Give ids K1, K2, K3… in order. "source" = file name plus page/slide/section where it appears.`;

const DESIGN_PROMPT = `Design a learning GAME world from this knowledge base for neurodivergent / ADHD learners.
Players hate walls of text: be visual and punchy. Labels max 5 words. Slides max 30 words. Claims max 25 words.
Every arena item and sequence step gets ONE fitting emoji icon (never flag emojis — they don't render on Windows).

Pick a visual "theme": war (wars, conflict, revolutions), lab (experiments, psychology, chemistry), nature (biology,
ecology), space (physics, astronomy), ancient (ancient history, classics), ocean (geography, marine), city (anything else).

Build these parts:
1. intro: 3-6 story slides teaching the core ideas in order, each with a keyword chip. Vivid, second person, tiny.
2. sequence: the knowledge that has an ORDER (chronology, cause→event chains, stages of a process, steps of a
   procedure), 4-9 steps in the correct order. Each step: label, icon, and a one-sentence "detail".
   For anything historical, steps MUST be in strict chronological order and each "detail" MUST include the year
   (e.g. "In 1906, …"). One event per step: never merge events from different years into one step.
   Double-check the order before answering.
   If the topic truly has no order, use the most logical teaching order of its key stages.
3. arena: two categories that matter for this topic (e.g. "Long-term cause" vs "Trigger", "Supports" vs "Challenges",
   "Light-dependent" vs "Calvin cycle"). 12-20 items (max 5 words + icon) that belong to A or B.
4. inspect: a themed room ("room" = short name), 6-10 objects (never more than 12), each with ONE emoji icon,
   a label, a claim, and a binary judgement choiceA/choiceB (e.g. Strength/Limitation, True/Myth). "why" explains.

Then choose "games": 2-3 game ids, in play order, using these rules (EduOasis game type library):
- "runner" (platformer: jump onto the NEXT step) when the content has an order: chronology, processes, procedures.
- "shooter" (shoot category A, let B pass) for fast classification; ALWAYS include it for war/conflict topics.
- "arena" (calm top-down sorting) for classification when an action shooter doesn't fit the topic.
- "inspect" (explore a room, judge claims) when there is evaluation: strengths/limitations, reliability, interpretations.
Order them learn → test → judge (e.g. ["runner","shooter","inspect"]).

HARD RULES:
- Every knowledge id must appear in at least one element's refs (intro, sequence, arena or inspect). Coverage is checked by code.
- Only state what the knowledge base says. Do not invent facts or numbers.`;

const PATCH_PROMPT = `These knowledge items are not yet taught anywhere in the game. Create extra intro slides, arena items
and/or inspect clues (same style and the same arena categories / inspect choices) so that EVERY one of them is cited in refs.
Only use what the items say.`;

async function json<T>(ai: GoogleGenAI, parts: Part[], schema: object): Promise<T> {
  const call = async (model: string, timeout?: number) => {
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        ...(timeout ? { httpOptions: { timeout } } : {}),
      },
    });
    return JSON.parse(res.text ?? "{}") as T;
  };
  try {
    return await call(QUALITY_MODEL, QUALITY_TIMEOUT_MS);
  } catch (e) {
    console.warn(`generate: ${QUALITY_MODEL} failed (${e instanceof Error ? e.message : e}), using ${FAST_MODEL}`);
    return call(FAST_MODEL);
  }
}

async function fileParts(files: File[]): Promise<Part[]> {
  const parts: Part[] = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    const isText = f.type.startsWith("text/") || /\.(md|txt|csv)$/i.test(f.name);
    parts.push({ text: `--- Resource: ${f.name} ---` });
    if (isText) parts.push({ text: buf.toString("utf8") });
    else parts.push({ inlineData: { mimeType: f.type || "application/pdf", data: buf.toString("base64") } });
  }
  return parts;
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
  const ai = new GoogleGenAI({ apiKey: key });

  const form = await req.formData();
  const topic = String(form.get("topic") ?? "");
  const description = String(form.get("description") ?? "");
  const requests = String(form.get("requests") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const learner = `Topic: ${topic}\nWhat the learner wants to learn: ${description || "(not given)"}\nSpecial requests: ${requests || "(none)"}`;

  try {
    // pass 1: exhaustive extraction
    const base = await json<{ title: string; topic: string; summary: string; knowledge: KnowledgeItem[] }>(
      ai,
      [{ text: EXTRACT_PROMPT }, { text: learner }, ...(await fileParts(files))],
      KNOWLEDGE_SCHEMA,
    );

    // pass 2: game design citing knowledge ids
    const kb = JSON.stringify(base.knowledge);
    const design = await json<Pick<WorldSpec, "intro" | "arena" | "inspect" | "theme" | "sequence" | "games">>(
      ai,
      [{ text: DESIGN_PROMPT }, { text: learner }, { text: `Knowledge base:\n${kb}` }],
      DESIGN_SCHEMA,
    );
    const spec: WorldSpec = { ...base, ...design };
    if (spec.sequence) spec.sequence = orderByYear(spec.sequence);

    // pass 3: patch anything the design dropped
    let cov = coverage(spec);
    if (cov.missing.length) {
      const patch = await json<{ intro: IntroSlide[]; arenaItems: Arena["items"]; clues: InspectClue[] }>(
        ai,
        [
          {
            text: `${PATCH_PROMPT}
Prefer arena items and intro slides; add at most ${Math.max(0, MAX_CLUES - spec.inspect.clues.length)} new inspect clues.`,
          },
          {
            text: `Arena categories: A = ${spec.arena.categoryA.name}, B = ${spec.arena.categoryB.name}. Inspect choices: A = ${spec.inspect.choiceA}, B = ${spec.inspect.choiceB}.`,
          },
          { text: `Missing items:\n${JSON.stringify(cov.missing)}` },
        ],
        PATCH_SCHEMA,
      );
      spec.intro.push(...(patch.intro ?? []));
      spec.arena.items.push(...(patch.arenaItems ?? []));
      spec.inspect.clues.push(...(patch.clues ?? []));
      spec.inspect.clues = spec.inspect.clues.slice(0, MAX_CLUES);
      cov = coverage(spec);
    }

    return Response.json({ spec, coverage: { covered: cov.covered, total: cov.total, missing: cov.missing.map((m) => m.id) } });
  } catch (e) {
    console.error("generate failed", e);
    return Response.json({ error: e instanceof Error ? e.message : "generation failed" }, { status: 502 });
  }
}
