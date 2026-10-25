"use client";

import { useState } from "react";
import MoeCoin from "@/components/MoeCoin";
import { formatMoe } from "@/lib/moe";
import { allWorlds } from "@/lib/profile";
import { shopItem } from "@/lib/shop";
import {
  DEMO_INCOMING,
  DEMO_TRADERS,
  TRADING_LIVE,
  describeSide,
  emptySide,
  isEmpty,
  sideValue,
  type TradeOffer,
  type TradeSide,
  type Trader,
} from "@/lib/trading";
import type { Profile } from "@/lib/types";

const NOT_LIVE = "Trading isn't connected yet, so nothing has changed hands. This is where the trade would be processed.";

type Sent = { id: string; trader: Trader; give: TradeSide; get: TradeSide; t: number };

// World Market › Trading: build an offer with another player. The screens are real; processing is not wired up.
export default function TradingPanel({ profile }: { profile: Profile }) {
  const [traderId, setTraderId] = useState(DEMO_TRADERS[0].id);
  const [give, setGive] = useState<TradeSide>(emptySide());
  const [get, setGet] = useState<TradeSide>(emptySide());
  const [sent, setSent] = useState<Sent[]>([]);
  const [incoming, setIncoming] = useState<TradeOffer[]>(DEMO_INCOMING);
  const [notice, setNotice] = useState<string | null>(null);
  const trader = DEMO_TRADERS.find((t) => t.id === traderId)!;

  const mine: TradeSide = {
    worlds: allWorlds(profile).map((w) => w.title),
    moe: profile.moe,
    items: profile.ownedItems,
  };

  const pickTrader = (id: string) => {
    setTraderId(id);
    setGet(emptySide()); // their stock differs, so start their side again
    setNotice(null);
  };

  const send = () => {
    setSent([{ id: crypto.randomUUID(), trader, give, get, t: Date.now() }, ...sent]);
    setGive(emptySide());
    setGet(emptySide());
    setNotice(`Offer sent to ${trader.name}. ${NOT_LIVE}`);
  };

  const giveValue = sideValue(give);
  const getValue = sideValue(get);
  const ready = !isEmpty(give) || !isEmpty(get);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-[#ece2ff] p-3 text-sm text-[#3d2a73]">
        <span className="text-2xl">🐫</span>
        <div>
          <div className="font-bold">The Trading Post (preview)</div>
          Swap worlds, MOE and Rapid Fire Market items with other learners. You can build and send offers here; the
          trades themselves aren&apos;t processed yet{TRADING_LIVE ? "" : ", so nothing leaves your account"}.
        </div>
      </div>

      {notice && <div className="rounded-lg bg-amber-100 p-2 text-sm">{notice}</div>}

      {/* who to trade with */}
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-70">Trade with</h3>
        <div className="flex flex-wrap gap-2">
          {DEMO_TRADERS.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTrader(t.id)}
              className={`flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-sm font-bold ${
                t.id === traderId ? "border-[#e0a526] shadow" : "border-[#0b2a3d]/15 hover:border-[#0b2a3d]/40"
              }`}
            >
              <span className="text-xl">{t.avatar}</span>
              {t.name}
              <span className={`h-2 w-2 rounded-full ${t.online ? "bg-emerald-500" : "bg-gray-300"}`} title={t.online ? "Online" : "Offline"} />
            </button>
          ))}
        </div>
      </section>

      {/* the offer */}
      <section className="grid gap-3 md:grid-cols-2">
        <SidePicker title="You give" who="You" stock={mine} side={give} onChange={setGive} />
        <SidePicker title={`You get from ${trader.name}`} who={trader.name} stock={trader.stock} side={get} onChange={setGet} />
      </section>

      <section className="rounded-xl border-2 border-[#0b2a3d]/15 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            You give <b>{formatMoe(giveValue)}</b> MOE of value
          </span>
          <span className="opacity-50">⇄</span>
          <span>
            You get <b>{formatMoe(getValue)}</b> MOE of value
          </span>
          <FairBadge give={giveValue} get={getValue} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={send}
            disabled={!ready}
            className="rounded-lg bg-[#e0a526] px-4 py-2 text-sm font-bold text-[#2b2118] hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-40"
          >
            🐫 Send trade offer to {trader.name}
          </button>
          {!trader.online && <span className="text-xs opacity-70">{trader.name} is offline and will see it next time they play.</span>}
        </div>
      </section>

      {/* offers waiting for you */}
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-70">Offers for you ({incoming.length})</h3>
        {incoming.length === 0 && <p className="text-sm opacity-60">No offers right now.</p>}
        <div className="space-y-2">
          {incoming.map((o) => {
            const from = DEMO_TRADERS.find((t) => t.id === o.traderId)!;
            return (
              <div key={o.id} className="rounded-xl border-2 border-[#0b2a3d]/15 bg-white p-3 text-sm">
                <div className="font-bold">
                  {from.avatar} {from.name} wants to trade
                </div>
                <div className="mt-1">
                  They give: <b>{describeSide(o.give)}</b>
                </div>
                <div>
                  They want: <b>{describeSide(o.want)}</b>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setNotice(`You accepted ${from.name}'s offer. ${NOT_LIVE}`)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      pickTrader(from.id);
                      setGive(o.want);
                      setGet(o.give);
                      setNotice(`Counter-offer loaded for ${from.name}: change it above, then send.`);
                    }}
                    className="rounded-lg border-2 border-[#0b2a3d]/20 px-3 py-1.5 font-bold hover:bg-[#0b2a3d]/5"
                  >
                    Counter
                  </button>
                  <button
                    onClick={() => setIncoming(incoming.filter((x) => x.id !== o.id))}
                    className="rounded-lg border-2 border-[#9b2226]/30 px-3 py-1.5 font-bold text-[#9b2226] hover:bg-[#9b2226]/5"
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* offers you've sent */}
      {sent.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-70">Your sent offers</h3>
          <div className="space-y-2">
            {sent.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-[#0b2a3d]/15 bg-white p-3 text-sm">
                <span className="font-bold">
                  {s.trader.avatar} To {s.trader.name}:
                </span>
                <span>
                  you give {describeSide(s.give)} · you get {describeSide(s.get)}
                </span>
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold">⏳ Waiting · not processed yet</span>
                <button onClick={() => setSent(sent.filter((x) => x.id !== s.id))} className="text-xs underline opacity-70">
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SidePicker({
  title,
  who,
  stock,
  side,
  onChange,
}: {
  title: string;
  who: string;
  stock: TradeSide;
  side: TradeSide;
  onChange: (s: TradeSide) => void;
}) {
  const toggle = (key: "worlds" | "items", v: string) =>
    onChange({ ...side, [key]: side[key].includes(v) ? side[key].filter((x) => x !== v) : [...side[key], v] });
  return (
    <div className="rounded-xl border-2 border-[#0b2a3d]/15 bg-white p-3 text-sm">
      <div className="mb-2 font-bold">{title}</div>

      <div className="text-xs font-bold uppercase opacity-60">Worlds</div>
      {stock.worlds.length === 0 && <p className="text-xs opacity-50">{who === "You" ? "You don't own any worlds yet." : "No worlds to trade."}</p>}
      {stock.worlds.map((w) => (
        <label key={w} className="flex cursor-pointer items-center gap-2 py-0.5">
          <input type="checkbox" checked={side.worlds.includes(w)} onChange={() => toggle("worlds", w)} />
          🏝 {w}
        </label>
      ))}

      <div className="mt-2 text-xs font-bold uppercase opacity-60">MOE</div>
      <div className="flex items-center gap-2">
        <MoeCoin size={18} />
        <input
          type="number"
          min={0}
          max={stock.moe}
          step={500}
          value={side.moe || ""}
          placeholder="0"
          onChange={(e) => onChange({ ...side, moe: Math.max(0, Math.min(stock.moe, Math.floor(Number(e.target.value) || 0))) })}
          className="w-32 rounded-lg border-2 border-[#0b2a3d]/20 px-2 py-1"
        />
        <span className="text-xs opacity-60">of {formatMoe(stock.moe)}</span>
      </div>

      <div className="mt-2 text-xs font-bold uppercase opacity-60">Items</div>
      {stock.items.length === 0 && <p className="text-xs opacity-50">{who === "You" ? "Buy items in the Rapid Fire Market to trade them." : "No items to trade."}</p>}
      <div className="flex flex-wrap gap-1.5">
        {stock.items.map((id) => {
          const item = shopItem(id);
          const on = side.items.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle("items", id)}
              className={`rounded-lg border-2 px-2 py-1 text-xs font-bold ${on ? "border-[#e0a526] bg-[#fff3cf]" : "border-[#0b2a3d]/15 hover:border-[#0b2a3d]/40"}`}
            >
              {item?.icon} {item?.name ?? id}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FairBadge({ give, get }: { give: number; get: number }) {
  if (give === 0 && get === 0) return null;
  const diff = get - give;
  const big = Math.max(give, get) * 0.15;
  const [text, cls] =
    Math.abs(diff) <= big
      ? ["⚖️ Fair trade", "bg-emerald-100 text-emerald-800"]
      : diff > 0
        ? ["📈 Good for you", "bg-sky-100 text-sky-800"]
        : ["📉 Good for them", "bg-rose-100 text-rose-800"];
  return <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{text}</span>;
}
