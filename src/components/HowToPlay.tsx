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

export function HowToShooter({ spec }: { spec: WorldSpec }) {
  const a = spec.arena.items.find((i) => i.category === "A");
  const b = spec.arena.items.find((i) => i.category === "B");
  const A = spec.arena.categoryA.name;
  const B = spec.arena.categoryB.name;
  return (
    <div>
      <h2 className="text-xl font-bold">How to play: Hold the Line 🎯</h2>
      <svg viewBox="0 0 360 200" className="mt-3 w-full rounded-xl bg-[#6b6f5e]" role="img" aria-label="Example of shooting a label">
        <text x="180" y="18" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff3c4">
          🎯 SHOOT: {clip(A.toUpperCase(), 18)} · ✋ PASS: {clip(B.toUpperCase(), 18)}
        </text>
        {/* A target descends and gets shot */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;0,40;0,40" keyTimes="0;0.5;1" dur="4s" repeatCount="indefinite" />
          <rect x="40" y="40" width="130" height="24" rx="4" fill="#fff8e7" stroke="#0b2a3d">
            <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.55;0.6;1" dur="4s" repeatCount="indefinite" />
          </rect>
          <text x="105" y="56" textAnchor="middle" fontSize="9" fill="#0b2a3d">
            {clip(`${a?.icon ?? ""} ${a?.label ?? "Category A"}`, 24)}
            <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.55;0.6;1" dur="4s" repeatCount="indefinite" />
          </text>
          <text x="105" y="58" textAnchor="middle" fontSize="16" fill="#ffd166" opacity="0">
            BOOM! ✔
            <animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.56;0.62;0.9" dur="4s" repeatCount="indefinite" />
          </text>
        </g>
        {/* bullet */}
        <rect x="103" y="160" width="3" height="10" fill="#fff3b0" opacity="0">
          <animate attributeName="y" values="160;160;95" keyTimes="0;0.4;0.55" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.4;0.54;0.56;1" dur="4s" repeatCount="indefinite" />
        </rect>
        {/* B target passes untouched */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;0,90" dur="4s" repeatCount="indefinite" />
          <rect x="200" y="40" width="130" height="24" rx="4" fill="#fff8e7" stroke="#0b2a3d" />
          <text x="265" y="56" textAnchor="middle" fontSize="9" fill="#0b2a3d">
            {clip(`${b?.icon ?? ""} ${b?.label ?? "Category B"}`, 24)}
          </text>
        </g>
        <rect x="0" y="176" width="360" height="24" fill="#4e3b26" />
        <circle cx="105" cy="170" r="8" fill="#55603a" stroke="#fff" />
      </svg>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
        <li>
          Move with <b>A/D</b> or <b>← →</b>. Hold <b>SPACE</b> to fire.
        </li>
        <li>
          Shoot every <b>{A}</b> before it reaches your line.
        </li>
        <li>
          Let <b>{B}</b> fly past — shooting it is friendly fire!
        </li>
        <li>Mistakes show you the right answer, and that one comes back later.</li>
      </ol>
    </div>
  );
}

export function HowToRunner({ spec }: { spec: WorldSpec }) {
  const steps = spec.sequence?.steps ?? [];
  const first = steps[0];
  const later = steps[Math.min(2, steps.length - 1)];
  return (
    <div>
      <h2 className="text-xl font-bold">How to play: {spec.sequence?.title ?? "Timeline Run"} 🏃</h2>
      <svg viewBox="0 0 360 190" className="mt-3 w-full rounded-xl bg-[#9fd8f0]" role="img" aria-label="Example of choosing the next step">
        <rect x="0" y="150" width="90" height="40" fill="#6b4a2e" />
        <rect x="270" y="150" width="90" height="40" fill="#6b4a2e" />
        {/* high bridge = correct */}
        <rect x="90" y="100" width="180" height="10" fill="#8a5a32">
          <animate attributeName="fill" values="#8a5a32;#8a5a32;#4fb35a;#4fb35a" keyTimes="0;0.45;0.5;1" dur="4s" repeatCount="indefinite" />
        </rect>
        <text x="180" y="92" textAnchor="middle" fontSize="10" fill="#0b2a3d">
          {clip(`${first?.icon ?? "1️⃣"} ${first?.label ?? "Step 1"}`, 28)}
        </text>
        {/* low bridge = wrong, crumbles */}
        <rect x="90" y="150" width="180" height="10" fill="#8a5a32">
          <animate attributeName="opacity" values="1;1;0.2;1" keyTimes="0;0.7;0.8;1" dur="4s" repeatCount="indefinite" />
        </rect>
        <text x="180" y="176" textAnchor="middle" fontSize="10" fill="#7a1f1f">
          {clip(`${later?.icon ?? "3️⃣"} ${later?.label ?? "Step 3"} (too early!)`, 34)}
        </text>
        <circle r="8" fill="#3d5afe" stroke="#fff" strokeWidth="2">
          <animate attributeName="cx" values="40;80;130;180;180" keyTimes="0;0.2;0.35;0.45;1" dur="4s" repeatCount="indefinite" />
          <animate attributeName="cy" values="142;142;80;92;92" keyTimes="0;0.2;0.35;0.45;1" dur="4s" repeatCount="indefinite" />
        </circle>
        <text x="180" y="40" textAnchor="middle" fontSize="12" fill="#0b2a3d" fontWeight="bold">
          Which comes FIRST?
        </text>
      </svg>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
        <li>
          Run with <b>A/D</b> or <b>← →</b>, jump with <b>W / ↑ / SPACE</b>.
        </li>
        <li>Each gap has two bridges (low and high), each showing a step.</li>
        <li>
          Land on the step that comes <b>next</b> in the order. Wrong bridges crumble and drop you back to the checkpoint 🚩.
        </li>
        <li>Collect ⭐ on the way and reach the 🏁 to finish.</li>
      </ol>
    </div>
  );
}
