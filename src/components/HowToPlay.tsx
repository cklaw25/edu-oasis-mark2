"use client";

import type { WorldSpec } from "@/lib/worldSpec";

// Animated "how to play" examples shown before each game, built from the world's real content.

function clip(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function HowToArena({ spec }: { spec: WorldSpec }) {
  const a = spec.arena.items.find((i) => i.category === "A")?.label ?? "Example A";
  const b = spec.arena.items.find((i) => i.category === "B")?.label ?? "Example B";
  const A = spec.arena.categoryA.name;
  const B = spec.arena.categoryB.name;
  return (
    <div>
      <h2 className="text-xl font-bold">How to play: {spec.arena.title}</h2>
      <svg viewBox="0 0 360 190" className="mt-3 w-full rounded-xl bg-[#2c6e7f]" role="img" aria-label="Example of sorting a label">
        <text x="180" y="22" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ffd166">
          Collect: {clip(A.toUpperCase(), 30)}
        </text>
        {/* label that belongs to A */}
        <g>
          <rect x="30" y="60" width="130" height="30" rx="4" fill="#fffbe0" stroke="#ffd166" strokeWidth="3">
            <animate attributeName="opacity" values="1;1;1;0;0" keyTimes="0;0.5;0.62;0.7;1" dur="4s" repeatCount="indefinite" />
          </rect>
          <text x="95" y="80" textAnchor="middle" fontSize="10" fill="#0b2a3d">
            {clip(a, 24)}
            <animate attributeName="opacity" values="1;1;1;0;0" keyTimes="0;0.5;0.62;0.7;1" dur="4s" repeatCount="indefinite" />
          </text>
          <text x="95" y="56" textAnchor="middle" fontSize="11" fill="#fff3b0" opacity="0">
            SPACE!
            <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.4;0.45;0.62;0.66;1" dur="4s" repeatCount="indefinite" />
          </text>
          <text x="95" y="82" textAnchor="middle" fontSize="22" fill="#a5f3c4" opacity="0">
            ✔
            <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.62;0.66;0.9;1" dur="4s" repeatCount="indefinite" />
          </text>
        </g>
        {/* label that belongs to B: leave it */}
        <rect x="210" y="120" width="130" height="30" rx="4" fill="#fff8e7" stroke="#0b2a3d" strokeWidth="2" />
        <text x="275" y="140" textAnchor="middle" fontSize="10" fill="#0b2a3d">
          {clip(b, 24)}
        </text>
        <text x="275" y="166" textAnchor="middle" fontSize="10" fill="#ffd0c8">
          {clip(B, 22)}:
        </text>
        <text x="275" y="179" textAnchor="middle" fontSize="10" fill="#ffd0c8">
          leave it for now
        </text>
        {/* player walks up to the A label */}
        <g>
          <circle r="9" fill="#3d5afe" stroke="#fff" strokeWidth="2">
            <animate attributeName="cx" values="180;95;95;95;180" keyTimes="0;0.4;0.62;0.9;1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="cy" values="150;102;102;102;150" keyTimes="0;0.4;0.62;0.9;1" dur="4s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
        <li>
          The banner says what to collect <b>right now</b>: <b>{A}</b> or <b>{B}</b>. It flips every 10 seconds.
        </li>
        <li>Walk (WASD / arrows) up to a label — it glows yellow.</li>
        <li>
          If it belongs to the current category, press <b>SPACE</b> to sort it.
        </li>
        <li>Wrong sort? You&apos;ll see the right answer and the label comes back later. Sort them all to finish.</li>
      </ol>
    </div>
  );
}

export function HowToInspect({ spec }: { spec: WorldSpec }) {
  const clue = spec.inspect.clues[0];
  return (
    <div>
      <h2 className="text-xl font-bold">How to play: {spec.inspect.room}</h2>
      <svg viewBox="0 0 360 150" className="mt-3 w-full rounded-xl bg-[#e9dcc4]" role="img" aria-label="Example of inspecting an object">
        <text x="90" y="80" textAnchor="middle" fontSize="34">
          {clue?.icon ?? "🔍"}
        </text>
        <text x="112" y="50" fontSize="18" fill="#c9a227" fontWeight="bold">
          ?
        </text>
        <text x="90" y="104" textAnchor="middle" fontSize="10" fill="#2b2118">
          {clip(clue?.label ?? "Object", 20)}
        </text>
        <text x="300" y="60" textAnchor="middle" fontSize="28">
          🧐
          <animate attributeName="x" values="320;250;320" dur="3s" repeatCount="indefinite" />
        </text>
        <text x="290" y="88" textAnchor="middle" fontSize="9" fill="#9b2226">
          Prof. Skeptic — dodge!
        </text>
        <circle r="9" fill="#3d5afe" stroke="#fff" strokeWidth="2">
          <animate attributeName="cx" values="190;120;120;190" keyTimes="0;0.4;0.8;1" dur="4s" repeatCount="indefinite" />
          <animate attributeName="cy" values="120;80;80;120" keyTimes="0;0.4;0.8;1" dur="4s" repeatCount="indefinite" />
        </circle>
        <text x="120" y="135" textAnchor="middle" fontSize="11" fill="#2b2118" opacity="0">
          press E
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.4;0.45;0.8;1" dur="4s" repeatCount="indefinite" />
        </text>
      </svg>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
        <li>Walk to an object with a yellow “?”.</li>
        <li>
          Press <b>E</b> to inspect it and read the claim.
        </li>
        <li>
          Decide: <b>{spec.inspect.choiceA}</b> or <b>{spec.inspect.choiceB}</b>? Then read why.
        </li>
        <li>Inspect every object to finish. Prof. Skeptic 🧐 chases you — getting caught costs a heart.</li>
      </ol>
    </div>
  );
}
