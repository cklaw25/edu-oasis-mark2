"use client";

import { useState } from "react";
import MoeCoin from "@/components/MoeCoin";
import { CATALOG } from "@/content/catalog";
import * as bounty from "@/lib/bounty";
import type { Bounty, Payout } from "@/lib/bounty";
import { addTime, now } from "@/lib/clock";
import { formatMoe } from "@/lib/moe";
import { allWorlds } from "@/lib/profile";
import * as chain from "@/lib/solana";
import type { Profile } from "@/lib/types";

// Bounty pools tab of the World Market. See src/lib/bounty.ts for the rules.
type Run = (label: string, fn: () => Promise<string | void>) => void;

const btn =
  "rounded-lg bg-[#e0a526] px-3 py-1.5 text-sm font-bold text-[#2b2118] hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-40";
const ghost = "rounded-lg border border-[#0b2a3d]/20 bg-white px-3 py-1.5 text-sm hover:border-[#e0a526] disabled:opacity-40";

const iconFor = (worldId: string) => CATALOG.find((c) => c.worldId === worldId)?.icon ?? "🏝️";
const pct = (n: number) => `${Math.round(n * 100)}%`;

function Moe({ n, sign }: { n: number; sign?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 font-bold">
      <MoeCoin size={16} />
      {sign && n > 0 ? "+" : ""}
      {formatMoe(n)}
    </span>
  );
}

function PayoutTable({ payouts, title }: { payouts: Payout[]; title: string }) {
  return (
    <div className="mt-3 rounded-lg bg-[#fff8e7] p-3">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide opacity-60">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs opacity-60">
            <th className="font-normal">Who</th>
            <th className="font-normal">Role</th>
            <th className="text-right font-normal">Stake back</th>
            <th className="text-right font-normal">Bonus</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p, i) => (
            <tr key={i} className={p.me ? "font-bold text-[#5b3fa0]" : ""}>
              <td>{p.me ? `${p.who} (you)` : p.who}</td>
              <td className="capitalize">{p.role}</td>
              <td className="text-right">{p.principal ? formatMoe(p.principal) : "–"}</td>
              <td className="text-right">+{formatMoe(p.bonus)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BountyCard({
  b,
  profile,
  onProfile,
  busy,
  run,
}: {
  b: Bounty;
  profile: Profile;
  onProfile: (p: Profile) => void;
  busy: string | null;
  run: Run;
}) {
  const t = now();
  const g = bounty.growth(b, t);
  const days = bounty.predictedSolveDays(b, t);
  const mine = b.positions.filter((p) => p.me).reduce((s, p) => s + p.stake, 0);
  const preview = b.status === "open" ? bounty.previewSolve(b, t, { who: "Next solver", me: false }) : null;
  const myIfSolved = preview ? bounty.myTake(preview) : 0;
  const owns = allWorlds(profile).some((w) => w.id === b.worldId);
  const canAttempt = b.status === "open" && !b.ownerIsMe && !mine;
  const hoursLeft = Math.max(0, Math.round((b.deadline - t) / 3_600_000));

  const join = (amount: number) =>
    run(`join-${b.id}`, async () => {
      if (profile.moe < amount) throw new Error(`You need ${formatMoe(amount - profile.moe)} more MOE`);
      bounty.joinBounty(b.id, amount, profile.name);
      chain.recordMoe("join-bounty", `Staked in the "${b.title}" bounty pool`, -amount);
      onProfile({ ...profile, moe: profile.moe - amount });
      return `Staked ${formatMoe(amount)} MOE. You get it back in full, plus a time-weighted bonus when someone masters this island.`;
    });

  const demoSolve = () =>
    run(`solve-${b.id}`, async () => {
      const r = bounty.simulateOtherSolver(b.id);
      chain.recordMoe("bounty-payout", `"${b.title}" was mastered by ${r.bounty.solver?.who}: your stake back + bonus`, r.delta);
      onProfile({ ...profile, moe: profile.moe + r.delta });
      const bonus = r.delta - mine;
      return `${r.bounty.solver?.who} mastered "${b.title}". You received ${formatMoe(r.delta)} MOE (your ${formatMoe(mine)} stake + ${formatMoe(bonus)} bonus).${
        bonus === 0 ? " No bonus because you'd only just staked: the bonus is weighted by time staked." : ""
      }`;
    });

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-3xl">{b.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold leading-tight">{b.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                b.status === "open" ? "bg-amber-100 text-amber-800" : b.status === "solved" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
              }`}
            >
              {b.status === "open" ? "Open bounty" : b.status === "solved" ? `Mastered by ${b.solver?.me ? "you" : b.solver?.who}` : "Expired"}
            </span>
          </div>
          <div className="text-xs opacity-70">
            Opened by <b>{b.ownerIsMe ? "you" : b.ownerName}</b> · created by {b.creatorName}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide opacity-60">Pool</div>
          <Moe n={bounty.poolTotal(b, t)} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 text-center text-[11px] sm:grid-cols-4">
        <div className="rounded bg-[#fff8e7] p-1">
          <b>{formatMoe(bounty.principal(b))}</b> + <b className="text-emerald-700">{formatMoe(g)}</b>
          <div className="opacity-60">stakes + growth</div>
        </div>
        <div className="rounded bg-[#fff8e7] p-1">
          <b>{bounty.attemptCount(b, t)}</b>
          <div className="opacity-60">attempts × {bounty.ATTEMPT_FEE} MOE</div>
        </div>
        <div className="rounded bg-[#fff8e7] p-1">
          <b>{pct(bounty.bestScore(b, t))}</b>
          <div className="opacity-60">best score (needs {pct(bounty.SOLVE_ACCURACY)})</div>
        </div>
        <div className="rounded bg-[#fff8e7] p-1">
          <b>{b.status !== "open" ? "–" : days === null ? "?" : days === 0 ? "any moment" : `~${days} days`}</b>
          <div className="opacity-60">predicted solve{b.status === "open" ? ` · ${hoursLeft}h left` : ""}</div>
        </div>
      </div>

      {b.status === "open" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {mine > 0 ? (
            <span className="rounded-lg bg-[#ece2ff] px-3 py-1.5 text-[#5b3fa0]">
              Your stake <b>{formatMoe(mine)}</b> · if solved now you get <Moe n={myIfSolved} />
              {myIfSolved <= mine && <span className="ml-1 text-xs opacity-80">(your bonus grows the longer you stay staked)</span>}
            </span>
          ) : (
            <>
              <button disabled={!!busy || profile.moe < 1_000} onClick={() => join(1_000)} className={btn}>
                Stake 1,000
              </button>
              <button disabled={!!busy || profile.moe < 5_000} onClick={() => join(5_000)} className={btn}>
                Stake 5,000
              </button>
            </>
          )}
          {canAttempt && (
            <span className="text-xs opacity-70">
              {owns
                ? `Play this island and score ${pct(bounty.SOLVE_ACCURACY)}+ to win ${formatMoe(Math.floor(g * bounty.SPLIT_SOLVED.solver))} MOE (each try costs ${bounty.ATTEMPT_FEE}).`
                : "Buy this world in the Shop, then master it to win the solver prize."}
            </span>
          )}
          {(mine > 0 || b.ownerIsMe) && (
            <button disabled={!!busy} onClick={demoSolve} className={ghost} title="Demo control: another learner masters this island">
              ▶ Demo: a learner masters it
            </button>
          )}
        </div>
      )}

      {preview && mine > 0 && <PayoutTable payouts={preview} title="If it were solved right now" />}
      {b.payouts && <PayoutTable payouts={b.payouts} title={b.status === "solved" ? "Paid out" : "Returned at the deadline"} />}
    </div>
  );
}

export default function BountiesTab({
  profile,
  onProfile,
  busy,
  run,
}: {
  profile: Profile;
  onProfile: (p: Profile) => void;
  busy: string | null;
  run: Run;
}) {
  const t = now();
  const list = bounty.loadBounties(t);
  const openIds = new Set(list.filter((b) => b.status === "open").map((b) => b.worldId));
  const mineToOpen = allWorlds(profile).filter((w) => !openIds.has(w.id));
  const [pick, setPick] = useState("");
  const [stake, setStake] = useState(5_000);

  const open = () =>
    run("open-bounty", async () => {
      const w = mineToOpen.find((x) => x.id === pick);
      if (!w) throw new Error("Pick one of your islands");
      if (profile.moe < stake) throw new Error(`You need ${formatMoe(stake - profile.moe)} more MOE`);
      bounty.openBounty({ id: w.id, title: w.title, icon: iconFor(w.id), creatorName: w.creator ?? profile.name }, stake, profile.name);
      chain.recordMoe("open-bounty", `Opened a bounty pool on "${w.title}"`, -stake);
      onProfile({ ...profile, moe: profile.moe - stake });
      setPick("");
      return `Bounty opened on "${w.title}" with ${formatMoe(stake)} MOE. It grows with every attempt; you get your stake back plus a bonus when someone masters it.`;
    });

  return (
    <>
      <p className="text-sm opacity-80">
        Hard islands become <b>bounty pools</b>. Stakers lock MOE, the pool grows with every attempt ({bounty.ATTEMPT_FEE} MOE each) and a
        daily top-up from the learning pool. When someone masters the island ({pct(bounty.SOLVE_ACCURACY)}+ in one run), every staker gets
        their stake back in full, and the growth is split{" "}
        <b>
          {pct(bounty.SPLIT_SOLVED.solver)} solver · {pct(bounty.SPLIT_SOLVED.stakers)} stakers · {pct(bounty.SPLIT_SOLVED.creator)} creator
        </b>
        . Stakers&apos; share is weighted by <b>stake × time staked</b>, so patience pays.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={!!busy}
          onClick={() => run("plus-day", async () => (addTime(86_400_000), "⏩ One day later: pools grew from new attempts and the learning-pool top-up."))}
          className={ghost}
          title="Demo control: move the app clock forward a day (same as Pip → Data → +1 day)"
        >
          ⏩ Demo: +1 day
        </button>
        <span className="text-xs opacity-60">Watch the pools grow and the time-weighted bonuses change.</span>
      </div>

      <div className="mt-4 space-y-3">
        {list.map((b) => (
          <BountyCard key={b.id} b={b} profile={profile} onProfile={onProfile} busy={busy} run={run} />
        ))}
      </div>

      <div className="mt-5 rounded-xl border-2 border-dashed border-[#0b2a3d]/20 p-4">
        <div className="font-bold">Open a bounty on one of your islands</div>
        <p className="text-xs opacity-70">
          Got an island people find hard? Lock a stake to attract learners. You can still sell or swap the island: the pool stays with it.
          Minimum {formatMoe(bounty.MIN_STAKE)} MOE, open for {bounty.BOUNTY_DAYS} days. If nobody solves it, you get your stake back plus{" "}
          {pct(bounty.SPLIT_EXPIRED.stakers)} of the growth.
        </p>
        {mineToOpen.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm">
              <option value="">Choose an island…</option>
              {mineToOpen.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
            <select value={stake} onChange={(e) => setStake(Number(e.target.value))} className="rounded-lg border px-2 py-1.5 text-sm">
              {[1_000, 2_000, 5_000, 10_000].map((n) => (
                <option key={n} value={n}>
                  {formatMoe(n)} MOE
                </option>
              ))}
            </select>
            <button disabled={!!busy || !pick || profile.moe < stake} onClick={open} className={btn}>
              {busy === "open-bounty" ? "Locking…" : "Open bounty"}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm opacity-70">You don&apos;t own an island without a bounty yet. Buy or grow one first.</p>
        )}
      </div>

      <p className="mt-4 text-xs opacity-60">
        Safety: stakers never lose their stake, returns are never promised (the bonus is only what attempts and the learning pool add), owners
        and stakers can&apos;t solve their own bounty, and MOE stays in-game. Simulated on devnet like the rest of the market; other learners&apos;
        stakes and attempts are demo data.
      </p>
    </>
  );
}
