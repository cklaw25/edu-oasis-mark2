"use client";

import { PALETTES } from "@/game/palettes";
import type { SlideScene as Scene, Theme } from "@/lib/worldSpec";

// The picture on each intro slide: emoji "actors" on a themed backdrop with a small looping animation.
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

const CSS = `
@keyframes ss-pop { 0% { transform: scale(0); opacity: 0 } 70% { transform: scale(1.15) } 100% { transform: scale(1); opacity: 1 } }
@keyframes ss-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes ss-left { 0% { transform: translateX(-120px) } 45%,70% { transform: translateX(0) } 100% { transform: translateX(-120px) } }
@keyframes ss-right { 0% { transform: translateX(120px) scaleX(-1) } 45%,70% { transform: translateX(0) scaleX(-1) } 100% { transform: translateX(120px) scaleX(-1) } }
@keyframes ss-boom { 0%,40% { transform: scale(0); opacity: 0 } 48% { transform: scale(1.4); opacity: 1 } 70% { transform: scale(1); opacity: 1 } 78%,100% { transform: scale(0); opacity: 0 } }
@keyframes ss-lean-l { 0%,100% { transform: translateX(0) } 50% { transform: translateX(14px) } }
@keyframes ss-lean-r { 0%,100% { transform: translateX(0) } 50% { transform: translateX(-14px) } }
@keyframes ss-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.3) } }
`;

function Actor({ a, style }: { a: Scene["actors"][number]; style?: React.CSSProperties }) {
  return (
    <div className="flex flex-col items-center" style={style}>
      <div className="text-5xl leading-none drop-shadow-md sm:text-6xl">{a.emoji}</div>
      {a.label && <div className="mt-1 rounded-full bg-white/85 px-2 text-[11px] font-bold text-[#0b2a3d]">{a.label}</div>}
    </div>
  );
}

export default function SlideScene({ scene, theme }: { scene?: Scene; theme?: Theme }) {
  if (!scene?.actors?.length) return null;
  const p = PALETTES[theme ?? "city"] ?? PALETTES.city;
  const actors = scene.actors.slice(0, 4);
  const half = Math.ceil(actors.length / 2);
  return (
    <div
      className="relative my-3 flex h-36 items-center justify-center gap-3 overflow-hidden rounded-xl"
      style={{ background: `linear-gradient(${hex(p.skyTop)}, ${hex(p.skyBottom)} 70%, ${hex(p.groundTop)} 70%, ${hex(p.ground)})` }}
      role="img"
      aria-label={actors.map((a) => a.label ?? a.emoji).join(", ")}
    >
      <style>{CSS}</style>
      {scene.style === "flow" &&
        actors.map((a, i) => (
          <div key={i} className="flex items-center gap-3">
            {i > 0 && (
              <span className="text-2xl font-bold text-white drop-shadow" style={{ animation: `ss-pop .4s ${i * 0.5 - 0.2}s both` }}>
                ➜
              </span>
            )}
            <Actor a={a} style={{ animation: `ss-pop .5s ${i * 0.5}s both, ss-bob 2s ${i * 0.5 + 0.5}s infinite` }} />
          </div>
        ))}
      {scene.style === "versus" && (
        <>
          <div className="flex gap-2" style={{ animation: "ss-lean-l 1.6s infinite" }}>
            {actors.slice(0, half).map((a, i) => (
              <Actor key={i} a={a} />
            ))}
          </div>
          <span className="mx-2 text-3xl font-black text-[#ffd166] drop-shadow" style={{ animation: "ss-pulse 1.6s infinite" }}>
            VS
          </span>
          <div className="flex gap-2" style={{ animation: "ss-lean-r 1.6s infinite" }}>
            {actors.slice(half).map((a, i) => (
              <Actor key={i} a={a} />
            ))}
          </div>
        </>
      )}
      {scene.style === "crash" && (
        <>
          <Actor a={actors[0]} style={{ animation: "ss-left 2.8s ease-in infinite" }} />
          <span className="absolute text-6xl" style={{ animation: "ss-boom 2.8s infinite" }}>
            💥
          </span>
          {actors[1] && (
            <div style={{ animation: "ss-right 2.8s ease-in infinite" }}>
              {/* flipped so it faces the first actor; un-flip the label */}
              <Actor a={{ emoji: actors[1].emoji }} />
            </div>
          )}
          {actors[1]?.label && <div className="absolute bottom-2 right-3 rounded-full bg-white/85 px-2 text-[11px] font-bold text-[#0b2a3d]">{actors[1].label}</div>}
          {actors.slice(2).map((a, i) => (
            <Actor key={i} a={a} style={{ animation: `ss-pop .5s ${1.2 + i * 0.3}s both` }} />
          ))}
        </>
      )}
      {scene.style !== "flow" && scene.style !== "versus" && scene.style !== "crash" &&
        actors.map((a, i) => <Actor key={i} a={a} style={{ animation: `ss-pop .5s ${i * 0.25}s both, ss-bob 1.8s ${i * 0.3}s infinite` }} />)}
    </div>
  );
}
