import { CLUES, FINDINGS, INTRO, RESULTS, AFTER_EXPERIMENT } from "./bobo";
import type { KnowledgeItem } from "@/lib/worldSpec";

export type NoteItem = KnowledgeItem & { taughtIn: string[] };

// The hand-made Bobo world expressed in the same knowledge format as generated worlds.
export function boboKnowledge(): NoteItem[] {
  const items: NoteItem[] = [];
  const add = (kind: KnowledgeItem["kind"], text: string, taughtIn: string) =>
    items.push({ id: `K${items.length + 1}`, kind, text, source: "Bandura, Ross & Ross (1961)", taughtIn: [taughtIn] });

  INTRO.forEach((s, i) => add(i === 2 ? "term" : "study", `${s.keyword}: ${s.text}`, `Intro slide ${i + 1}`));
  add("process", `${AFTER_EXPERIMENT.keyword}: ${AFTER_EXPERIMENT.text}`, "Results story");
  RESULTS.forEach((r) =>
    add("number", `${r.label}: boys ${r.boys}, girls ${r.girls} imitative physical aggression acts (mean)`, "Results chart"),
  );
  FINDINGS.forEach((f) => add("fact", f, "Results findings"));
  CLUES.forEach((c) => add("evaluation", `${c.answer.toUpperCase()} (${c.tag}): ${c.claim} ${c.why}`, `Lab: ${c.label}`));
  return items;
}
