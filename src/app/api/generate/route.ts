import { GoogleGenAI, type Part } from "@google/genai";
import {
  cleanBoard,
  coverage,
  gamesOf,
  orderByYear,
  DESIGN_SCHEMA,
  KNOWLEDGE_SCHEMA,
  PATCH_SCHEMA,
  type Board,
  type InspectClue,
  type IntroSlide,
  type KnowledgeItem,
  type Showdown,
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

Players remember PICTURES and ACTION, not word lists. Prefer characters, objects and places over abstract phrases.

Build these parts:
1. intro: 3-6 story slides (never more) teaching the big picture in order; details belong in the games, each with a keyword chip. Vivid, second person, tiny.
   Every slide gets a "scene" (its picture): 2-4 emoji actors with optional 1-2 word labels, and a style:
   "flow" (a process or before→after), "versus" (two sides compared/opposed), "crash" (two things collide/react),
   "group" (a cast of people/things together). E.g. a crash study → crash [🚗 car, 🚙 car];
   photosynthesis → flow [☀️ light, 🌿 leaf, 🍬 glucose].
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
5. board ("Squad Board", drag & drop): 8-14 pieces, 2-5 zones (teams, departments, places, groups, experiments, organs, eras)
   each with an id, a 1-3 word name and an emoji; 6-14 pieces (people, things, events, numbers) each with a 1-3 word
   name, an emoji, the zone id it belongs to, and a one-sentence fact shown when placed.
   E.g. Manhattan Project → zones [Los Alamos 🏜️, Oak Ridge 🏭, Hanford ☢️], pieces = the people and what they did.
6. showdown (survival shooter): 4-10 fighters. Include EVERY person (or group/study/condition) in the knowledge base
   that has a signature thing. Each fighter is a person/group/thing (name max 3 words + avatar emoji) linked to
   ONE signature thing it is known for (its "weapon": an invention, discovery, finding, number, idea, quote; name max
   4 words + emoji). The avatar should look like the fighter (a person emoji for a person), not their thing.
   The player must defeat the fighter the poster asks for. E.g. Tesla 🧔 → ⚡ "AC motor";
   Newton 👨‍🦳 → 🍎 "Laws of motion"; Oppenheimer 🎩 → 💣 "Atomic bomb". Weapons must be distinct.

Then choose "games": 2-3 game ids, in play order, using these rules (EduOasis game type library):
- "showdown" when the content pairs WHO/WHAT with what they did, made, found or scored (people ↔ inventions,
  studies ↔ findings, conditions ↔ results, terms ↔ examples). The most fun game: use it whenever pairs exist.
- "board" when things belong to 3+ groups (people ↔ teams/departments/places, items ↔ stages/types).
- "runner" (platformer: jump onto the NEXT step) when the content has an order: chronology, processes, procedures.
- "shooter" (shoot category A, let B pass) for fast two-way classification, e.g. war topics.
- "arena" (calm sorting) only when nothing above fits.
- "inspect" (explore a room, judge claims) when there is evaluation: strengths/limitations, reliability, interpretations.
Prefer visual games (showdown, board, runner) over word sorting (shooter, arena).
Order them learn → test → judge (e.g. ["board","showdown","inspect"]).

HARD RULES:
- Every knowledge id must appear in the refs of the intro or of a game you chose. Coverage is checked by code.
- Only state what the knowledge base says. Do not invent facts or numbers.`;

const PATCH_PROMPT = `These knowledge items are not yet taught anywhere in the game. Teach EVERY one of them (cite it in refs)
by adding to the games first: showdown fighters (a who → signature thing pair), board pieces (using an existing zone id)
and inspect clues (same choices). Add a short intro slide (with a "scene") only for an item that fits none of those.
Keep the same style: names max 4 words, an emoji each. Only use what the items say.`;

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
    const design = await json<Pick<WorldSpec, "intro" | "arena" | "inspect" | "theme" | "sequence" | "games" | "board" | "showdown">>(
      ai,
      [{ text: DESIGN_PROMPT }, { text: learner }, { text: `Knowledge base:\n${kb}` }],
      DESIGN_SCHEMA,
    );
    const spec: WorldSpec = { ...base, ...design };
    if (spec.sequence) spec.sequence = orderByYear(spec.sequence);
    spec.board = cleanBoard(spec.board);

    // pass 3: patch anything the design dropped
    let cov = coverage(spec);
    if (cov.missing.length) {
      const games = gamesOf(spec);
      const patch = await json<{ intro: IntroSlide[]; clues: InspectClue[]; fighters: Showdown["fighters"]; pieces: Board["pieces"] }>(
        ai,
        [
          { text: PATCH_PROMPT },
          {
            text: `Games played: ${games.join(", ")} (only add to these; leave the other lists empty).
Board zones: ${JSON.stringify(spec.board?.zones ?? [])}. Inspect choices: A = ${spec.inspect.choiceA}, B = ${spec.inspect.choiceB}.
At most ${Math.max(0, MAX_CLUES - spec.inspect.clues.length)} new clues, ${Math.max(0, 14 - (spec.board?.pieces.length ?? 0))} new pieces, ${Math.max(0, 10 - (spec.showdown?.fighters.length ?? 0))} new fighters.`,
          },
          { text: `Missing items:\n${JSON.stringify(cov.missing)}` },
        ],
        PATCH_SCHEMA,
      );
      spec.intro.push(...(patch.intro ?? []));
      if (games.includes("inspect")) spec.inspect.clues.push(...(patch.clues ?? []));
      spec.inspect.clues = spec.inspect.clues.slice(0, MAX_CLUES);
      if (games.includes("showdown") && spec.showdown) spec.showdown.fighters.push(...(patch.fighters ?? []));
      if (games.includes("board") && spec.board) spec.board = cleanBoard({ ...spec.board, pieces: [...spec.board.pieces, ...(patch.pieces ?? [])] });
      cov = coverage(spec);
    }

    return Response.json({ spec, coverage: { covered: cov.covered, total: cov.total, missing: cov.missing.map((m) => m.id) } });
  } catch (e) {
    console.error("generate failed", e);
    return Response.json({ error: e instanceof Error ? e.message : "generation failed" }, { status: 502 });
  }
}
