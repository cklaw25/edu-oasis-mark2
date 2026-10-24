import type { WorldSpec } from "./worldSpec";
import loftus from "@/content/samples/loftus.world.json";

// Pre-generated sample worlds that ship with the app (also the demo fallback if generation is slow).
const SAMPLES: Record<string, WorldSpec> = { "sample-loftus": loftus as WorldSpec };

// Generated world files, kept in the browser for now (the chain/market side will reference them by id + hash).
const key = (id: string) => `eo2.world.${id}`;

export function saveSpec(id: string, spec: WorldSpec) {
  try {
    localStorage.setItem(key(id), JSON.stringify(spec));
  } catch {}
}

export function loadSpec(id: string): WorldSpec | null {
  if (SAMPLES[id]) return SAMPLES[id];
  try {
    const raw = localStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as WorldSpec) : null;
  } catch {
    return null;
  }
}
