"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import type { Mesh } from "three";
import type { Clue, Verdict } from "@/content/bobo";
import { track } from "@/lib/telemetry";
import { Card, btn } from "@/components/BoboFlow";

// 3D test Kata: memory crystals floating in a small room. Click one, judge its claim, it turns green or red.
// Loaded with next/dynamic (ssr: false) from Kata3DFlow, so three.js never runs on the server or in the hub.

type Result = "right" | "wrong";

const COLORS = { idle: "#7fd6ff", right: "#4fb35a", wrong: "#e63946" } as const;

function Crystal({
  index,
  total,
  label,
  result,
  onPick,
}: {
  index: number;
  total: number;
  label: string;
  result?: Result;
  onPick: () => void;
}) {
  const mesh = useRef<Mesh>(null);
  const [hover, setHover] = useState(false);
  const angle = (index / total) * Math.PI * 2;
  const x = Math.cos(angle) * 4;
  const z = Math.sin(angle) * 4;
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += 0.01;
    mesh.current.position.y = 1.4 + Math.sin(clock.elapsedTime * 1.5 + index) * 0.2;
  });
  const color = result ? COLORS[result] : COLORS.idle;
  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={mesh}
        name={`crystal-${index}`}
        scale={hover && !result ? 1.2 : 1}
        onClick={(e) => {
          e.stopPropagation();
          if (!result) onPick();
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.9 : 0.5} flatShading />
      </mesh>
      <Text position={[0, 0.45, 0]} fontSize={0.22} color="#fff8e7" anchorX="center" anchorY="middle" maxWidth={2.2}>
        {label}
      </Text>
    </group>
  );
}

export default function Kata3D({
  worldId,
  clues,
  onDone,
}: {
  worldId: string;
  clues: Clue[];
  onDone: (correct: number, mistakes: number) => void;
}) {
  const [results, setResults] = useState<Record<string, Result>>({});
  const [open, setOpen] = useState<Clue | null>(null);
  const answered = Object.keys(results).length;

  const finish = (next: Record<string, Result>) => {
    const correct = Object.values(next).filter((r) => r === "right").length;
    const mistakes = clues.length - correct;
    track(worldId, "gallery3d_done", { correct, mistakes });
    onDone(correct, mistakes);
  };

  return (
    <div className="absolute inset-0 z-20 bg-[#0b2a3d]">
      <Canvas camera={{ position: [0, 4, 9], fov: 55 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#0b2a3d"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[7, 48]} />
          <meshStandardMaterial color="#e8d9b5" />
        </mesh>
        {clues.map((c, i) => (
          <Crystal key={c.id} index={i} total={clues.length} label={c.tag} result={results[c.id]} onPick={() => setOpen(c)} />
        ))}
        <OrbitControls enablePan={false} minDistance={5} maxDistance={14} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>

      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-[#0b2a3d]/85 px-4 py-2 text-sm text-white">
        Drag to look around · click a crystal · {answered}/{clues.length} judged
      </div>

      {/* keyboard / no-mouse fallback: the same crystals as buttons */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-2">
        {clues.map((c) => (
          <button
            key={c.id}
            disabled={!!results[c.id]}
            onClick={() => setOpen(c)}
            className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
              results[c.id] === "right" ? "bg-[#4fb35a]" : results[c.id] === "wrong" ? "bg-[#e63946]" : "bg-[#2a6f97] hover:bg-[#245f82]"
            }`}
          >
            {c.icon} {c.tag}
          </button>
        ))}
      </div>

      {open && (
        <QuestionCard
          key={open.id}
          clue={open}
          onDone={(correct, ms) => {
            track(worldId, "review_answer", { id: open.id, correct, ms });
            const next = { ...results, [open.id]: (correct ? "right" : "wrong") as Result };
            setResults(next);
            setOpen(null);
            if (Object.keys(next).length === clues.length) finish(next);
          }}
        />
      )}
    </div>
  );
}

function QuestionCard({ clue, onDone }: { clue: Clue; onDone: (correct: boolean, ms: number) => void }) {
  const [shownAt] = useState(() => Date.now());
  const [picked, setPicked] = useState<Verdict | null>(null);
  const correct = picked === clue.answer;
  return (
    <Card>
      <div className="text-4xl">{clue.icon}</div>
      <div className="mt-1 text-xs font-bold uppercase opacity-60">{clue.label}</div>
      <p className="mt-2 text-lg leading-snug">{clue.claim}</p>
      {!picked ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-xl bg-emerald-600 py-3 font-bold text-white" onClick={() => setPicked("strength")}>
            🛡 Strength
          </button>
          <button className="rounded-xl bg-rose-600 py-3 font-bold text-white" onClick={() => setPicked("weakness")}>
            ⚡ Weakness
          </button>
        </div>
      ) : (
        <>
          <div className={`mt-4 rounded-lg p-3 text-sm ${correct ? "bg-emerald-100" : "bg-rose-100"}`}>
            <b>{correct ? "Correct!" : `Not quite — it's a ${clue.answer}.`}</b> <span className="opacity-60">({clue.tag})</span>
            <p className="mt-1">{clue.why}</p>
          </div>
          <button className={btn} onClick={() => onDone(correct, Date.now() - shownAt)}>
            Continue
          </button>
        </>
      )}
    </Card>
  );
}
