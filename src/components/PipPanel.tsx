"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { learnerId } from "@/lib/telemetry";
import { allWorlds } from "@/lib/profile";
import { computeInsights, pipContext, worldNotes } from "@/lib/insights";
import { addTime, resetClock } from "@/lib/clock";
import type { Profile, WorldSummary } from "@/lib/types";

type Tab = "chat" | "notes" | "mine" | "data";
type Msg = { role: "user" | "pip"; text: string };

const TABS: { id: Tab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "notes", label: "Notes" },
  { id: "mine", label: "My notes" },
  { id: "data", label: "Data" },
];

export default function PipPanel({
  profile,
  focusId,
  onClose,
  onClockChange,
}: {
  profile: Profile;
  focusId: string | null;
  onClose: () => void;
  onClockChange: () => void;
}) {
  const worlds = profile.worlds.filter((w): w is WorldSummary => !!w);
  const [tab, setTab] = useState<Tab>("chat");
  const [worldId, setWorldId] = useState(focusId ?? worlds[0]?.id ?? "");
  const world = worlds.find((w) => w.id === worldId) ?? worlds[0];

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col bg-[#fff8e7] text-[#2b2118] shadow-2xl">
      <div className="flex items-center gap-3 border-b border-[#e8d9b5] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#bff4ff] shadow-inner">✦</div>
        <div className="flex-1">
          <div className="font-bold">Pip</div>
          <div className="text-xs opacity-60">your study companion</div>
        </div>
        <button onClick={onClose} className="text-2xl leading-none opacity-60 hover:opacity-100" aria-label="Close">
          ×
        </button>
      </div>
      <div className="flex gap-1 border-b border-[#e8d9b5] px-2 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-1.5 text-sm ${tab === t.id ? "bg-white font-bold" : "opacity-60 hover:opacity-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {(tab === "notes" || tab === "mine") && worlds.length > 1 && (
        <select
          className="mx-4 mt-3 rounded-lg border border-[#d9c9a3] bg-white px-2 py-1 text-sm"
          value={world?.id}
          onChange={(e) => setWorldId(e.target.value)}
        >
          {worlds.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </select>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "chat" && <Chat profile={profile} focusId={focusId} />}
        {tab === "notes" && world && <Notes world={world} />}
        {tab === "mine" && world && <MyNotes key={world.id} world={world} />}
        {tab === "data" && <Data profile={profile} onClockChange={onClockChange} />}
      </div>
    </div>
  );
}

const CHAT_KEY = "eo2.pip.chat";
const GREETING: Msg = {
  role: "pip",
  text: "Hi! Ask me anything about your Katas — I can recap, quiz you, or tell you what to revisit.",
};

function loadChat(): Msg[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "null") as Msg[] | null;
    if (saved?.length) return saved;
  } catch {}
  return [GREETING];
}

function Chat({ profile, focusId }: { profile: Profile; focusId: string | null }) {
  // chat history persists across sessions so Pip keeps context
  const [msgs, setMsgs] = useState<Msg[]>(loadChat);
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-60)));
    } catch {}
  }, [msgs]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // braces matter: newer browsers return a Promise from scrollIntoView, which React would treat as a cleanup
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/pip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1), context: pipContext(profile, focusId) }),
      });
      const body = await res.json();
      setMsgs([...next, { role: "pip", text: body.text ?? body.error ?? "…" }]);
    } catch {
      setMsgs([...next, { role: "pip", text: "I couldn't reach my brain just now — try again?" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
              m.role === "pip" ? "bg-white" : "ml-auto bg-[#2a6f97] text-white"
            }`}
          >
            {renderBold(m.text)}
          </div>
        ))}
        {busy && <div className="animate-pulse text-sm opacity-60">Pip is thinking…</div>}
        <div ref={end} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <button onClick={() => setMsgs([GREETING])} className="rounded-full px-2 py-1 text-xs opacity-50 hover:opacity-100">
          clear chat
        </button>
        {["What should I revisit?", "Quiz me", "Recap this world in 5 bullets"].map((q) => (
          <button key={q} onClick={() => send(q)} className="rounded-full bg-white px-2 py-1 text-xs hover:bg-[#dff1fa]">
            {q}
          </button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="flex-1 rounded-xl border border-[#d9c9a3] bg-white px-3 py-2 text-sm"
          placeholder="Ask Pip…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="rounded-xl bg-[#2a6f97] px-4 text-sm font-bold text-white" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  );
}

// Pip replies use **bold**; render just that rather than pulling in a markdown library
function renderBold(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}

const KIND_ORDER = ["study", "term", "process", "fact", "number", "quote", "evaluation"];

function Notes({ world }: { world: WorldSummary }) {
  const { items, spec } = useMemo(() => worldNotes(world), [world]);
  const taught = items.filter((i) => i.taughtIn.length).length;
  const groups = KIND_ORDER.map((k) => [k, items.filter((i) => i.kind === k)] as const).filter(([, xs]) => xs.length);

  if (!items.length) return <p className="text-sm opacity-70">No notes for this world on this device.</p>;
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg bg-white p-3">
        <div className="font-bold">{world.title}</div>
        <div className="text-xs opacity-70">{world.topic}</div>
        <div className="mt-2 text-xs">
          <b>
            {taught}/{items.length}
          </b>{" "}
          facts from your resources are taught somewhere in this world.
        </div>
        {spec && (
          <button
            className="mt-2 text-xs underline"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" }));
              const a = Object.assign(document.createElement("a"), { href: url, download: `${world.title}.world.json` });
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download world file (JSON)
          </button>
        )}
      </div>
      {groups.map(([kind, xs]) => (
        <div key={kind}>
          <div className="mb-1 text-xs font-bold uppercase opacity-60">{kind}</div>
          <ul className="space-y-2">
            {xs.map((k) => (
              <li key={k.id} className="rounded-lg bg-white p-2">
                <div>{k.text}</div>
                <div className="mt-1 text-[11px] opacity-60">
                  {k.id} · {k.source}
                  {k.taughtIn.length ? ` · taught in: ${k.taughtIn.join(", ")}` : " · ⚠ not in gameplay (Pip knows it)"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MyNotes({ world }: { world: WorldSummary }) {
  const key = `eo2.notes.${world.id}`;
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  });
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, text);
      } catch {}
      setSaved(true);
    }, 500);
    return () => clearTimeout(t);
  }, [key, text]);
  return (
    <div className="flex h-full flex-col">
      <textarea
        className="min-h-[50vh] flex-1 rounded-xl border border-[#d9c9a3] bg-white p-3 text-sm leading-relaxed"
        placeholder={`Your own notes for ${world.title}…`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
      />
      <div className="mt-1 text-right text-xs opacity-60">{saved ? "saved" : "saving…"}</div>
    </div>
  );
}

function Data({ profile, onClockChange }: { profile: Profile; onClockChange: () => void }) {
  const [, force] = useState(0);
  const ins = computeInsights(profile);
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
  const travel = (fn: () => void) => {
    fn();
    onClockChange();
    force((n) => n + 1);
  };

  return (
    <div className="space-y-5 text-sm">
      <TigerInsights profile={profile} />
      <section>
        <h3 className="mb-2 font-bold">Prediction · memory per Kata</h3>
        <p className="mb-2 text-xs opacity-70">
          <b>Lifespan</b> (big): how much of your review interval is left — 0% means review now. Intervals grow 2 → 4 → 6
          days with each good session (≥60%), and reset to 2 days after a weak one. <b>Recall</b> (small): predicted chance
          you&apos;d still answer correctly, from a forgetting curve.
        </p>
        <div className="space-y-2">
          {ins.worlds.map((w) => (
            <div key={w.world.id} className="rounded-lg bg-white p-2">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{w.world.title}</span>
                <span className="text-2xl font-bold">{pct(w.lifespan)}</span>
              </div>
              <div className="mt-1 h-2 rounded bg-[#f0e6cf]">
                <div
                  className="h-2 rounded"
                  style={{ width: pct(w.lifespan), background: w.lifespan > 0.5 ? "#4fb35a" : w.lifespan > 0.25 ? "#d9a441" : "#c75c3a" }}
                />
              </div>
              <div className="mt-1 text-xs">
                recall <b>{pct(w.recall)}</b> ·{" "}
                {w.daysUntilDue > 0 ? `review due in ${w.daysUntilDue.toFixed(1)} days` : "review due now!"} · every{" "}
                {w.intervalDays} days
              </div>
              <div className="mt-1 text-[11px] opacity-70">
                half-life {w.halfLifeH.toFixed(0)}h ·{" "}
                {w.sessions} session{w.sessions === 1 ? "" : "s"}
                {w.lastAccuracy !== null && ` · last ${pct(w.lastAccuracy)}`}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2 text-xs">
          <button className="rounded bg-[#0b2a3d] px-2 py-1 text-white" onClick={() => travel(() => addTime(86400_000))}>
            ⏩ +1 day (demo)
          </button>
          <button className="rounded bg-white px-2 py-1" onClick={() => travel(resetClock)}>
            reset time
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-bold">Decisions · what Pip recommends</h3>
        <ul className="list-disc space-y-1 pl-5">
          {ins.nextIsland && (
            <li>
              Revisit <b>{ins.nextIsland.world.title}</b> next — lifespan {pct(ins.nextIsland.lifespan)}, recall{" "}
              {pct(ins.nextIsland.recall)}.
            </li>
          )}
          {ins.weakSpots.length > 0 && <li>Focus on: {ins.weakSpots.slice(0, 3).map((s) => s.label).join(", ")}.</li>}
          {ins.bestMode ? (
            <li>
              You score best in <b>{ins.bestMode}</b> mode — future worlds will lean on it.
            </li>
          ) : (
            <li>Play a few more rounds and Pip will learn which game type suits you best.</li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-bold">Game type effectiveness</h3>
        {ins.byMode.length === 0 && <p className="text-xs opacity-70">No games played yet.</p>}
        {ins.byMode.map((m) => (
          <div key={m.mode} className="mb-1 flex items-center gap-2 text-xs">
            <span className="w-20">{m.mode}</span>
            <div className="h-3 flex-1 rounded bg-white">
              <div className="h-3 rounded bg-[#2a6f97]" style={{ width: pct(m.accuracy) }} />
            </div>
            <span className="w-16 text-right">
              {pct(m.accuracy)} · n={m.n}
            </span>
          </div>
        ))}
      </section>

      <section>
        <h3 className="mb-2 font-bold">Weak spots</h3>
        {ins.weakSpots.length === 0 ? (
          <p className="text-xs opacity-70">None yet — nice.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {ins.weakSpots.map((s) => (
              <li key={s.world + s.label} className="flex justify-between rounded bg-white px-2 py-1">
                <span>{s.label}</span>
                <span className="opacity-70">
                  {s.wrong ? `wrong ${s.wrong}×` : ""}
                  {s.slow ? `${s.wrong ? " · " : ""}hesitated` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-bold">Collected so far</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <Box label="events" value={String(ins.events)} />
          <Box label="answers" value={String(ins.totalAnswers)} />
          <Box label="accuracy" value={pct(ins.accuracy)} />
          <Box label="median answer" value={ins.medianMs ? `${(ins.medianMs / 1000).toFixed(1)}s` : "—"} />
          <Box label="Katas" value={String(ins.worlds.length)} />
          <Box label="sessions" value={String(ins.worlds.reduce((n, w) => n + w.sessions, 0))} />
        </div>
      </section>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-2">
      <div className="font-bold">{value}</div>
      <div className="opacity-60">{label}</div>
    </div>
  );
}

type TigerArm = { game: string; plays: number; accuracy: number; ucb: number };
type TigerData =
  | { configured: false }
  | {
      configured: true;
      totalEvents: number;
      learners: number;
      arms: TigerArm[];
      myArms: TigerArm[];
      trends: { world: string; sessions: number; lastAccuracy: number; slopePerDay: number | null; predicted: number }[];
      responseMs: { day: string; ms: number }[];
      recommendation: { game: string | null; reviewWorld: string | null; why: string };
    };

/** Predictions + decisions computed in Tiger Data (TimescaleDB) from every learner's gameplay events. */
function TigerInsights({ profile }: { profile: Profile }) {
  const [data, setData] = useState<TigerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    fetch(`/api/insights?learner=${encodeURIComponent(learnerId())}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Tiger Data unavailable");
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  const title = (id: string) => allWorlds(profile).find((w) => w.id === id)?.title ?? id;
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <section className="rounded-xl border-2 border-[#f5a623]/50 bg-[#fff8e7] p-3">
      <div className="flex items-center gap-2">
        <h3 className="font-bold">🐯 Live from Tiger Data</h3>
        <button onClick={load} className="ml-auto text-xs underline opacity-60">
          refresh
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-[#9b2226]">{error}</p>}
      {!data && !error && <p className="mt-1 text-xs opacity-60">Querying the time-series database…</p>}
      {data && !data.configured && <p className="mt-1 text-xs opacity-70">Not connected on this server (TIGER_DATABASE_URL not set).</p>}
      {data && data.configured && (
        <div className="mt-2 space-y-3">
          <p className="text-xs opacity-70">
            Every answer, game result and finished Kata streams into a TimescaleDB hypertable ({data.totalEvents.toLocaleString("en-US")}{" "}
            events from {data.learners} learner{data.learners === 1 ? "" : "s"}). SQL turns it into predictions and decisions.
          </p>
          <div className="rounded-lg bg-[#0b2a3d] p-2 text-white">
            <div className="text-[10px] uppercase tracking-wide opacity-70">Decision</div>
            <div className="text-sm">
              {data.recommendation.reviewWorld
                ? data.recommendation.why.replace(data.recommendation.reviewWorld, title(data.recommendation.reviewWorld))
                : data.recommendation.why}
            </div>
          </div>
          {data.arms.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-bold">Which game type teaches best (all learners, UCB1 bandit)</div>
              {data.arms.map((a) => (
                <div key={a.game} className="flex items-center gap-2 text-xs">
                  <span className="w-20 truncate">{a.game}</span>
                  <div className="h-2 flex-1 rounded bg-[#f0e6cf]">
                    <div className="h-2 rounded bg-[#4fb35a]" style={{ width: pct(a.accuracy) }} />
                  </div>
                  <span className="w-28 text-right opacity-70">
                    {pct(a.accuracy)} · {a.plays} answers
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.trends.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-bold">Your trend per Kata (least-squares fit in SQL)</div>
              {data.trends.map((t) => (
                <div key={t.world} className="flex justify-between text-xs">
                  <span className="truncate">{title(t.world)}</span>
                  <span className="opacity-70">
                    last {pct(t.lastAccuracy)} · predicted {pct(t.predicted)}
                    {t.slopePerDay !== null && ` · ${t.slopePerDay >= 0 ? "▲" : "▼"}${Math.abs(Math.round(t.slopePerDay * 100))}%/day`}
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.responseMs.length > 0 && (
            <div className="text-xs">
              <b>Answer speed</b> (focus signal, daily avg):{" "}
              {data.responseMs.map((r) => `${r.day.slice(5)} ${(r.ms / 1000).toFixed(1)}s`).join(" · ")}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
