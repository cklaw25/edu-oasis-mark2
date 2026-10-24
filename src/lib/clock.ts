// App clock with a demo "time travel" offset, so judges can watch islands dry up.
const KEY = "eo2.clockOffset";

export function clockOffset(): number {
  try {
    return Number(localStorage.getItem(KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function now() {
  return Date.now() + clockOffset();
}

export function addTime(ms: number) {
  try {
    localStorage.setItem(KEY, String(clockOffset() + ms));
  } catch {}
}

export function resetClock() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
