// Interaction log; feeds the recall model and game-type picker (data layer).
import { now } from "./clock";

const KEY = "eo2.events";

export interface TelemetryEvent {
  t: number;
  world: string;
  type: string;
  data?: Record<string, unknown>;
}

export function track(world: string, type: string, data?: Record<string, unknown>) {
  try {
    const events: TelemetryEvent[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    events.push({ t: now(), world, type, data });
    localStorage.setItem(KEY, JSON.stringify(events.slice(-2000)));
  } catch {}
}

export function readEvents(): TelemetryEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
