"use client";

import { useState } from "react";
import type { GameType } from "@/lib/types";

const GAME_TYPES: { id: GameType | "auto"; label: string; hint: string }[] = [
  { id: "auto", label: "Let EduOasis decide", hint: "We pick the game type that fits your content best" },
  { id: "rpg-experiment", label: "Experiment RPG", hint: "Act out studies, experiments and processes" },
  { id: "explore-collect", label: "Explore & collect", hint: "Find key terms and facts around a map" },
  { id: "sort-match", label: "Sort & match", hint: "Group and connect concepts" },
  { id: "boss-quiz", label: "Boss battle", hint: "Beat bosses with what you know" },
];

export interface CreateWorldRequest {
  topic: string;
  description: string;
  requests: string;
  gameType: GameType | "auto";
  files: File[];
}

export default function CreateWorldModal({
  generationsLeft,
  onClose,
  onSubmit,
}: {
  generationsLeft: number;
  onClose: () => void;
  onSubmit: (req: CreateWorldRequest) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [requests, setRequests] = useState("");
  const [gameType, setGameType] = useState<GameType | "auto">("auto");
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#fff8e7] p-6 text-[#2b2118] shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Grow a new world</h2>
            <p className="text-sm opacity-70">{generationsLeft} free generations left</p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-2xl leading-none opacity-60 hover:opacity-100">
            ×
          </button>
        </div>

        <label className="mb-1 block text-sm font-semibold">Topic</label>
        <input
          className="mb-3 w-full rounded-lg border border-[#d9c9a3] bg-white px-3 py-2"
          placeholder="e.g. IB Psychology — Bandura's Bobo doll study"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <label className="mb-1 block text-sm font-semibold">What should this world teach?</label>
        <textarea
          className="mb-3 h-20 w-full rounded-lg border border-[#d9c9a3] bg-white px-3 py-2"
          placeholder="Aims, procedure, findings, key terms like matched pairs design…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label className="mb-1 block text-sm font-semibold">Resources</label>
        <input
          type="file"
          multiple
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
          className="mb-1 w-full text-sm"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <p className="mb-3 text-xs opacity-60">PDF, notes, slides screenshots</p>

        <label className="mb-1 block text-sm font-semibold">Game type</label>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GAME_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setGameType(t.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                gameType === t.id ? "border-[#2a6f97] bg-[#dff1fa]" : "border-[#d9c9a3] bg-white"
              }`}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="text-xs opacity-70">{t.hint}</div>
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm font-semibold">Special requests</label>
        <input
          className="mb-5 w-full rounded-lg border border-[#d9c9a3] bg-white px-3 py-2"
          placeholder="e.g. short levels, lots of visuals, no timers"
          value={requests}
          onChange={(e) => setRequests(e.target.value)}
        />

        {error && <p className="mb-3 rounded-lg bg-rose-100 p-2 text-sm text-rose-800">{error}</p>}
        {busy && (
          <p className="mb-3 animate-pulse text-center text-sm">
            {["Reading your resources…", "Extracting every fact…", "Designing your world…", "Checking nothing was lost…"][stage]}
          </p>
        )}
        <button
          disabled={!topic || generationsLeft <= 0 || busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            setStage(0);
            const timer = setInterval(() => setStage((s) => Math.min(3, s + 1)), 5000);
            try {
              await onSubmit({ topic, description, requests, gameType, files });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Generation failed — try again");
            } finally {
              clearInterval(timer);
              setBusy(false);
            }
          }}
          className="w-full rounded-xl bg-[#2a6f97] py-3 font-bold text-white disabled:opacity-40"
        >
          {busy ? "Growing…" : generationsLeft > 0 ? "Generate world" : "No free generations left — visit the market"}
        </button>
      </div>
    </div>
  );
}
