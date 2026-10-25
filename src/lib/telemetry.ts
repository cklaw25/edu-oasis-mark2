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
  const e = { t: now(), world, type, data };
  try {
    const events: TelemetryEvent[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    events.push(e);
    localStorage.setItem(KEY, JSON.stringify(events.slice(-2000)));
  } catch {}
  queue.push(e);
  if (!timer) timer = setTimeout(flush, 2000);
}

// --- stream to Tiger Data (src/app/api/telemetry) in small batches ---
const LEARNER = "eo2.learnerId";
let queue: TelemetryEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** Stable anonymous id for this browser: the demo wallet address if there is one. */
export function learnerId(): string {
  try {
    const wallet = localStorage.getItem("eo2.demoWallet.pub");
    if (wallet) return wallet;
    let id = localStorage.getItem(LEARNER);
    if (!id) {
      id = `anon-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(LEARNER, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function flush() {
  timer = null;
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ learner: learnerId(), events: batch }),
    keepalive: true,
  }).catch(() => {});
}

if (typeof window !== "undefined") window.addEventListener("pagehide", flush);

export function readEvents(): TelemetryEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
