import type { WorldSpec } from "./worldSpec";

// Generated world files, kept in the browser for now (the chain/market side will reference them by id + hash).
const key = (id: string) => `eo2.world.${id}`;

export function saveSpec(id: string, spec: WorldSpec) {
  try {
    localStorage.setItem(key(id), JSON.stringify(spec));
  } catch {}
}

export function loadSpec(id: string): WorldSpec | null {
  try {
    const raw = localStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as WorldSpec) : null;
  } catch {
    return null;
  }
}
