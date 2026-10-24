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

/** A picture for a slide, drawn from emoji "actors" and a little animation. */
export interface SlideScene {
  style: "flow" | "versus" | "crash" | "group";
  actors: { emoji: string; label?: string }[]; // 2-4
}

export interface IntroSlide {
  keyword: string;
  text: string;
  refs: string[];
  scene?: SlideScene;
}

export interface ArenaItem {
  label: string;
  category: "A" | "B";
  icon?: string; // one emoji
  refs: string[];
}

export type Theme = "war" | "lab" | "nature" | "space" | "ancient" | "ocean" | "city";
export type GameId = "runner" | "shooter" | "arena" | "inspect" | "board" | "showdown";
export const GAME_IDS: GameId[] = ["runner", "shooter", "arena", "inspect", "board", "showdown"];

/** "Squad Board": drag characters/things onto the zone (team, department, place, group) they belong to. */
export interface Board {
  title: string;
  instructions: string;
  zones: { id: string; name: string; icon: string }[]; // 2-5
  pieces: { name: string; icon: string; zone: string; fact: string; refs: string[] }[]; // 6-14
}

/** "Showdown": each fighter attacks with the thing they are linked to; take down the one the wanted poster names. */
export interface Showdown {
  title: string;
  instructions: string;
  fighters: { name: string; avatar: string; weapon: { name: string; icon: string }; fact: string; refs: string[] }[]; // 4-10
}

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
  board?: Board;
  showdown?: Showdown;
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

/** Point every board piece at a real zone (the model sometimes uses the zone's name instead of its id). */
export function cleanBoard(board: Board | undefined): Board | undefined {
  if (!board) return board;
  const zoneOf = (z: string) =>
    board.zones.find((x) => x.id === z) ?? board.zones.find((x) => x.name.toLowerCase() === z.toLowerCase());
  const pieces = board.pieces.flatMap((p) => {
    const z = zoneOf(p.zone);
    return z ? [{ ...p, zone: z.id }] : [];
  });
  return { ...board, zones: board.zones.slice(0, 5), pieces: pieces.slice(0, 14) };
}

export function gamesOf(spec: WorldSpec): GameId[] {
  const valid = (spec.games ?? []).filter(
    (g) =>
      GAME_IDS.includes(g) &&
      (g !== "runner" || (spec.sequence?.steps.length ?? 0) >= 3) &&
      (g !== "board" || ((spec.board?.pieces.length ?? 0) >= 3 && (spec.board?.zones.length ?? 0) >= 2)) &&
      (g !== "showdown" || (spec.showdown?.fighters.length ?? 0) >= 2),
  );
  return valid.length ? valid : ["arena", "inspect"];
}

export interface Coverage {
  covered: number;
  total: number;
  missing: KnowledgeItem[];
}

/** Counts only what the learner actually meets: the intro plus the games that are played. */
export function coverage(spec: WorldSpec): Coverage {
  const used = new Set<string>();
  const add = (refs: string[] | undefined) => refs?.forEach((r) => used.add(r));
  const games = gamesOf(spec);
  spec.intro.forEach((s) => add(s.refs));
  if (games.includes("arena") || games.includes("shooter")) spec.arena.items.forEach((i) => add(i.refs));
  if (games.includes("inspect")) spec.inspect.clues.forEach((c) => add(c.refs));
  if (games.includes("runner")) spec.sequence?.steps.forEach((s) => add(s.refs));
  if (games.includes("board")) spec.board?.pieces.forEach((p) => add(p.refs));
  if (games.includes("showdown")) spec.showdown?.fighters.forEach((f) => add(f.refs));
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

const sceneSchema = {
  type: "object",
  description: "the slide's picture: 2-4 emoji actors and how they move",
  properties: {
    style: { type: "string", enum: ["flow", "versus", "crash", "group"] },
    actors: {
      type: "array",
      items: { type: "object", properties: { emoji: str, label: str }, required: ["emoji"] },
    },
  },
  required: ["style", "actors"],
};

const introSchema = {
  type: "array",
  items: {
    type: "object",
    properties: { keyword: str, text: str, refs, scene: sceneSchema },
    required: ["keyword", "text", "refs", "scene"],
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

const boardSchema = {
  type: "object",
  properties: {
    title: str,
    instructions: str,
    zones: { type: "array", items: { type: "object", properties: { id: str, name: str, icon: str }, required: ["id", "name", "icon"] } },
    pieces: {
      type: "array",
      items: {
        type: "object",
        properties: { name: str, icon: str, zone: { type: "string", description: "id of the zone it belongs to" }, fact: str, refs },
        required: ["name", "icon", "zone", "fact", "refs"],
      },
    },
  },
  required: ["title", "instructions", "zones", "pieces"],
};

const showdownSchema = {
  type: "object",
  properties: {
    title: str,
    instructions: str,
    fighters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: str,
          avatar: { type: "string", description: "one person/creature/object emoji for the fighter" },
          weapon: { type: "object", properties: { name: str, icon: str }, required: ["name", "icon"] },
          fact: str,
          refs,
        },
        required: ["name", "avatar", "weapon", "fact", "refs"],
      },
    },
  },
  required: ["title", "instructions", "fighters"],
};

export const DESIGN_SCHEMA = {
  type: "object",
  properties: {
    theme: { type: "string", enum: ["war", "lab", "nature", "space", "ancient", "ocean", "city"] },
    games: { type: "array", items: { type: "string", enum: GAME_IDS } },
    intro: introSchema,
    sequence: sequenceSchema,
    arena: arenaSchema,
    inspect: inspectSchema,
    board: boardSchema,
    showdown: showdownSchema,
  },
  required: ["theme", "games", "intro", "sequence", "arena", "inspect", "board", "showdown"],
};

export const PATCH_SCHEMA = {
  type: "object",
  properties: {
    intro: introSchema,
    clues: inspectSchema.properties.clues,
    fighters: showdownSchema.properties.fighters,
    pieces: boardSchema.properties.pieces,
  },
  required: ["intro", "clues", "fighters", "pieces"],
};
