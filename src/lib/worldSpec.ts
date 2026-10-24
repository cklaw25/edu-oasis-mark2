// World file format for generated worlds.
// Detail retention: pass 1 extracts every fact into `knowledge` (ids K1..Kn); pass 2 designs the game,
// and every game element cites the knowledge ids it teaches via `refs`. coverage() proves nothing was dropped.

export type KnowledgeKind = "term" | "fact" | "number" | "study" | "process" | "quote" | "evaluation";

export interface KnowledgeItem {
  id: string;
  kind: KnowledgeKind;
  text: string;
  source: string; // file name + page/section, for the pet to cite
}

export interface IntroSlide {
  keyword: string;
  text: string;
  refs: string[];
}

export interface ArenaItem {
  label: string;
  category: "A" | "B";
  icon?: string; // one emoji
  refs: string[];
}

export type Theme = "war" | "lab" | "nature" | "space" | "ancient" | "ocean" | "city";
export type GameId = "runner" | "shooter" | "arena" | "inspect";

export interface SequenceStep {
  label: string; // max ~5 words
  icon: string; // one emoji
  detail: string; // one short sentence shown after landing on it
  refs: string[];
}

export interface Sequence {
  title: string;
  instructions: string;
  steps: SequenceStep[]; // in the correct order
}

export interface Arena {
  title: string;
  instructions: string;
  categoryA: { name: string; hint: string };
  categoryB: { name: string; hint: string };
  items: ArenaItem[];
}

export interface InspectClue {
  icon: string; // a single emoji
  label: string;
  claim: string;
  answer: "A" | "B";
  why: string;
  refs: string[];
}

export interface Inspect {
  title: string;
  room: string;
  choiceA: string;
  choiceB: string;
  clues: InspectClue[];
}

export interface WorldSpec {
  title: string;
  topic: string;
  summary: string;
  knowledge: KnowledgeItem[];
  intro: IntroSlide[];
  arena: Arena;
  inspect: Inspect;
  /** visual skin for every game in the world (older worlds: undefined → "city") */
  theme?: Theme;
  /** ordered steps for the runner (older worlds: undefined) */
  sequence?: Sequence;
  /** games to play, in order (older worlds: undefined → arena, inspect) */
  games?: GameId[];
}

/**
 * Safety net for timelines: if every step mentions a year, order the steps by their first year (stable),
 * so a slip by the model can't teach the wrong chronology.
 */
export function orderByYear(seq: Sequence): Sequence {
  const year = (s: SequenceStep) => Number(`${s.label} ${s.detail}`.match(/(1[0-9]{3}|20[0-9]{2})/)?.[1] ?? NaN);
  if (!seq.steps.every((s) => !Number.isNaN(year(s)))) return seq;
  const steps = seq.steps.map((s, i) => ({ s, i })).sort((a, b) => year(a.s) - year(b.s) || a.i - b.i).map((x) => x.s);
  return { ...seq, steps };
}

export function gamesOf(spec: WorldSpec): GameId[] {
  const valid = (spec.games ?? []).filter(
    (g) => (g !== "runner" || (spec.sequence?.steps.length ?? 0) >= 3) && ["runner", "shooter", "arena", "inspect"].includes(g),
  );
  return valid.length ? valid : ["arena", "inspect"];
}

export interface Coverage {
  covered: number;
  total: number;
  missing: KnowledgeItem[];
}

export function coverage(spec: Pick<WorldSpec, "knowledge" | "intro" | "arena" | "inspect" | "sequence">): Coverage {
  const used = new Set<string>();
  const add = (refs: string[] | undefined) => refs?.forEach((r) => used.add(r));
  spec.intro.forEach((s) => add(s.refs));
  spec.arena.items.forEach((i) => add(i.refs));
  spec.inspect.clues.forEach((c) => add(c.refs));
  spec.sequence?.steps.forEach((s) => add(s.refs));
  const missing = spec.knowledge.filter((k) => !used.has(k.id));
  return { covered: spec.knowledge.length - missing.length, total: spec.knowledge.length, missing };
}

// ---- JSON schemas for Gemini structured output ----

const str = { type: "string" };
const refs = { type: "array", items: str, description: "knowledge ids taught by this element, e.g. [\"K3\",\"K7\"]" };
const ab = { type: "string", enum: ["A", "B"] };

export const KNOWLEDGE_SCHEMA = {
  type: "object",
  properties: {
    title: str,
    topic: str,
    summary: str,
    knowledge: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: str,
          kind: { type: "string", enum: ["term", "fact", "number", "study", "process", "quote", "evaluation"] },
          text: str,
          source: str,
        },
        required: ["id", "kind", "text", "source"],
      },
    },
  },
  required: ["title", "topic", "summary", "knowledge"],
};

const introSchema = {
  type: "array",
  items: {
    type: "object",
    properties: { keyword: str, text: str, refs },
    required: ["keyword", "text", "refs"],
  },
};

const arenaSchema = {
  type: "object",
  properties: {
    title: str,
    instructions: str,
    categoryA: { type: "object", properties: { name: str, hint: str }, required: ["name", "hint"] },
    categoryB: { type: "object", properties: { name: str, hint: str }, required: ["name", "hint"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { label: str, category: ab, icon: str, refs },
        required: ["label", "category", "icon", "refs"],
      },
    },
  },
  required: ["title", "instructions", "categoryA", "categoryB", "items"],
};

const inspectSchema = {
  type: "object",
  properties: {
    title: str,
    room: str,
    choiceA: str,
    choiceB: str,
    clues: {
      type: "array",
      items: {
        type: "object",
        properties: { icon: str, label: str, claim: str, answer: ab, why: str, refs },
        required: ["icon", "label", "claim", "answer", "why", "refs"],
      },
    },
  },
  required: ["title", "room", "choiceA", "choiceB", "clues"],
};

const sequenceSchema = {
  type: "object",
  properties: {
    title: str,
    instructions: str,
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: { label: str, icon: str, detail: str, refs },
        required: ["label", "icon", "detail", "refs"],
      },
    },
  },
  required: ["title", "instructions", "steps"],
};

export const DESIGN_SCHEMA = {
  type: "object",
  properties: {
    theme: { type: "string", enum: ["war", "lab", "nature", "space", "ancient", "ocean", "city"] },
    games: { type: "array", items: { type: "string", enum: ["runner", "shooter", "arena", "inspect"] } },
    intro: introSchema,
    sequence: sequenceSchema,
    arena: arenaSchema,
    inspect: inspectSchema,
  },
  required: ["theme", "games", "intro", "sequence", "arena", "inspect"],
};

export const PATCH_SCHEMA = {
  type: "object",
  properties: {
    intro: introSchema,
    arenaItems: arenaSchema.properties.items,
    clues: inspectSchema.properties.clues,
  },
  required: ["intro", "arenaItems", "clues"],
};
