// Turns the raw interaction log + recall model into what the Data tab shows and what Pip is told.
import { boboKnowledge, type NoteItem } from "@/content/boboKnowledge";
import { CLUES } from "@/content/bobo";
import { daysUntilDue, halfLifeH, hoursUntil, intervalDays, lifespanAt, recallAt } from "./recall";
import { readEvents, type TelemetryEvent } from "./telemetry";
import type { Profile, WorldSummary } from "./types";
import { loadSpec } from "./worldStore";
import { GAME_IDS, type GameId, type WorldSpec } from "./worldSpec";

export interface Answer {
  world: string;
  mode: "experiment" | GameId;
  label: string;
  correct: boolean;
  ms?: number;
  t: number;
}

export function answersFrom(events: TelemetryEvent[]): Answer[] {
  const out: Answer[] = [];
  for (const e of events) {
    const d = e.data ?? {};
    if (e.type === "review_answer") {
      const clue = CLUES.find((c) => c.id === d.id);
      out.push({ world: e.world, mode: "inspect", label: clue?.label ?? String(d.id), correct: !!d.correct, ms: Number(d.ms), t: e.t });
    } else if (e.type === "inspect_answer") {
      out.push({ world: e.world, mode: "inspect", label: String(d.label), correct: !!d.correct, ms: Number(d.ms), t: e.t });
    } else if (GAME_IDS.some((g) => e.type === `${g}_done`)) {
      // every action game logs its answers the same way
      const mode = e.type.replace(/_done$/, "") as GameId;
      for (const a of (d.answers as { label: string; correct: boolean }[]) ?? [])
        out.push({ world: e.world, mode, label: a.label, correct: a.correct, t: e.t });
    } else if (e.type === "experiment_done") {
      // each strike = a broken condition, each round survived = kept it
      const strikes = Number(d.strikes ?? 0);
      for (let i = 0; i < strikes; i++) out.push({ world: e.world, mode: "experiment", label: "condition kept", correct: false, t: e.t });
      if (d.passed) for (let i = 0; i < 4; i++) out.push({ world: e.world, mode: "experiment", label: "condition kept", correct: true, t: e.t });
    }
  }
  return out;
}

export interface WorldInsight {
  world: WorldSummary;
  lifespan: number;
  intervalDays: number;
  daysUntilDue: number;
  recall: number;
  halfLifeH: number;
  hoursTo50: number;
  sessions: number;
  lastAccuracy: number | null;
}

export interface Insights {
  worlds: WorldInsight[];
  totalAnswers: number;
  accuracy: number | null;
  medianMs: number | null;
  byMode: { mode: Answer["mode"]; n: number; accuracy: number }[];
  weakSpots: { label: string; world: string; wrong: number; slow: boolean }[];
  nextIsland: WorldInsight | null;
  bestMode: Answer["mode"] | null;
  events: number;
}

export function computeInsights(profile: Profile): Insights {
  const events = readEvents();
  const answers = answersFrom(events);
  const worlds = profile.worlds
    .filter((w): w is WorldSummary => !!w)
    .map((w) => ({
      world: w,
      lifespan: lifespanAt(w),
      intervalDays: intervalDays(w),
      daysUntilDue: daysUntilDue(w),
      recall: recallAt(w),
      halfLifeH: halfLifeH(w),
      hoursTo50: hoursUntil(w),
      sessions: w.sessions?.length ?? 0,
      lastAccuracy: w.sessions?.at(-1)?.accuracy ?? null,
    }));

  const timed = answers.filter((a) => a.ms && a.ms > 0).map((a) => a.ms!).sort((a, b) => a - b);
  const medianMs = timed.length ? timed[Math.floor(timed.length / 2)] : null;

  const modes: Answer["mode"][] = ["experiment", "arena", "inspect"];
  const byMode = modes
    .map((mode) => {
      const xs = answers.filter((a) => a.mode === mode);
      return { mode, n: xs.length, accuracy: xs.length ? xs.filter((a) => a.correct).length / xs.length : 0 };
    })
    .filter((m) => m.n > 0);

  // weak spot = answered wrong at least once, or noticeably slower than usual (hesitation)
  const spots = new Map<string, { label: string; world: string; wrong: number; slow: boolean }>();
  for (const a of answers) {
    if (a.mode === "experiment") continue;
    const slow = !!(medianMs && a.ms && a.ms > medianMs * 1.6);
    if (a.correct && !slow) continue;
    const k = `${a.world}:${a.label}`;
    const s = spots.get(k) ?? { label: a.label, world: a.world, wrong: 0, slow: false };
    if (!a.correct) s.wrong++;
    s.slow ||= slow;
    spots.set(k, s);
  }
  const weakSpots = [...spots.values()].sort((a, b) => b.wrong - a.wrong || Number(b.slow) - Number(a.slow)).slice(0, 8);

  // most overdue first, ties broken by weakest predicted recall
  const nextIsland = [...worlds].sort((a, b) => a.lifespan - b.lifespan || a.recall - b.recall)[0] ?? null;
  const bestMode = byMode.filter((m) => m.n >= 3).sort((a, b) => b.accuracy - a.accuracy)[0]?.mode ?? null;

  return {
    worlds,
    totalAnswers: answers.filter((a) => a.mode !== "experiment").length,
    accuracy: answers.length ? answers.filter((a) => a.correct).length / answers.length : null,
    medianMs,
    byMode,
    weakSpots,
    nextIsland,
    bestMode,
    events: events.length,
  };
}

/** Readable notes for a world, each item with where in the game it is taught. */
export function worldNotes(w: WorldSummary): { items: NoteItem[]; spec: WorldSpec | null } {
  if (w.id === "demo-bobo") return { items: boboKnowledge(), spec: null };
  const spec = loadSpec(w.id);
  if (!spec) return { items: [], spec: null };
  const places = new Map<string, string[]>();
  const cite = (refs: string[], where: string) =>
    refs.forEach((r) => places.set(r, [...(places.get(r) ?? []), where]));
  spec.intro.forEach((s, i) => cite(s.refs, `Intro slide ${i + 1}`));
  spec.arena.items.forEach((a) => cite(a.refs, `Arena: "${a.label}"`));
  spec.inspect.clues.forEach((c) => cite(c.refs, `${spec.inspect.room}: ${c.label}`));
  return { items: spec.knowledge.map((k) => ({ ...k, taughtIn: places.get(k.id) ?? [] })), spec };
}

export function readMyNotes(worldId: string) {
  try {
    return localStorage.getItem(`eo2.notes.${worldId}`) ?? "";
  } catch {
    return "";
  }
}

/** Compact context string for Pip. */
export function pipContext(profile: Profile, focusId: string | null): string {
  const ins = computeInsights(profile);
  const lines = ["LEARNER DATA:"];
  for (const w of ins.worlds)
    lines.push(
      `- Kata "${w.world.title}" (${w.world.topic}): lifespan ${Math.round(w.lifespan * 100)}% (review every ${w.intervalDays} days, due in ${w.daysUntilDue.toFixed(1)} days), predicted recall ${Math.round(w.recall * 100)}%, ${w.sessions} sessions`,
    );
  if (ins.weakSpots.length)
    lines.push(`Weak spots: ${ins.weakSpots.map((s) => `${s.label}${s.wrong ? ` (wrong ${s.wrong}x)` : " (hesitated)"}`).join("; ")}`);
  if (ins.nextIsland) lines.push(`Recommended next Kata: ${ins.nextIsland.world.title}`);

  const worlds = profile.worlds.filter((w): w is WorldSummary => !!w);
  const ordered = focusId ? [...worlds].sort((a) => (a.id === focusId ? -1 : 1)) : worlds;
  lines.push("", "KNOWLEDGE:");
  for (const w of ordered) {
    lines.push(`# ${w.title}${w.id === focusId ? " (the learner is in this world now)" : ""}`);
    for (const k of worldNotes(w).items) lines.push(`[${k.id} · ${k.source}] ${k.text}`);
    const mine = readMyNotes(w.id);
    if (mine.trim()) lines.push(`Learner's own notes for this world:
${mine.slice(0, 4000)}`);
  }
  return lines.join("\n");
}
