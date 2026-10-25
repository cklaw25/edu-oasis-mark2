// Server-only: learning telemetry in Tiger Data (TimescaleDB on Postgres).
// Every answer, game result and completed world is a row in the `learning_events` hypertable (partitioned by time);
// a continuous aggregate rolls game results up per day. The insights route turns these into predictions and decisions.
import { Pool } from "pg";

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

export function tigerConfigured() {
  return !!process.env.TIGER_DATABASE_URL;
}

function db(): Pool {
  if (!pool) {
    pool = new Pool({
      // drop sslmode from the URL: pg treats "require" as full verification, which overrides the ssl option below
      connectionString: process.env.TIGER_DATABASE_URL?.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, ""),
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/** Create the hypertable + continuous aggregate once per server instance (all statements are idempotent). */
function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const c = db();
      await c.query(`
        CREATE TABLE IF NOT EXISTS learning_events (
          time      TIMESTAMPTZ NOT NULL,
          learner   TEXT NOT NULL,
          world     TEXT NOT NULL,
          type      TEXT NOT NULL,
          game      TEXT,
          correct   INT,
          mistakes  INT,
          accuracy  DOUBLE PRECISION,
          ms        INT,
          data      JSONB
        )`);
      await c.query(`SELECT create_hypertable('learning_events', 'time', if_not_exists => TRUE, migrate_data => TRUE)`);
      await c.query(`CREATE INDEX IF NOT EXISTS learning_events_learner ON learning_events (learner, time DESC)`);
      // daily roll-up of game results (real-time: includes rows not yet materialised)
      try {
        await c.query(`
          CREATE MATERIALIZED VIEW IF NOT EXISTS game_daily
          WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
          SELECT time_bucket('1 day', time) AS day, game,
                 sum(correct) AS correct, sum(mistakes) AS mistakes, count(*) AS plays
          FROM learning_events WHERE game IS NOT NULL
          GROUP BY day, game
          WITH NO DATA`);
        await c.query(`SELECT add_continuous_aggregate_policy('game_daily',
          start_offset => INTERVAL '30 days', end_offset => INTERVAL '1 hour',
          schedule_interval => INTERVAL '15 minutes', if_not_exists => TRUE)`);
      } catch (e) {
        console.error("game_daily continuous aggregate not created", e);
      }
    })().catch((e) => {
      ready = null; // retry on the next request
      throw e;
    });
  }
  return ready;
}

export interface IncomingEvent {
  t: number;
  world: string;
  type: string;
  data?: Record<string, unknown>;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Insert a batch of client events (one multi-row INSERT). */
export async function insertEvents(learner: string, events: IncomingEvent[]) {
  await ensureSchema();
  const rows = events.slice(0, 200).map((e) => {
    const d = e.data ?? {};
    const game = e.type.endsWith("_done") ? e.type.slice(0, -5) : null;
    return [
      new Date(e.t),
      learner,
      String(e.world).slice(0, 80),
      String(e.type).slice(0, 40),
      game,
      num(d.correct) ?? (d.correct === true ? 1 : d.correct === false ? 0 : null),
      num(d.mistakes),
      num(d.accuracy),
      num(d.ms),
      JSON.stringify(d).slice(0, 4000),
    ];
  });
  if (!rows.length) return 0;
  const values = rows.map((_, i) => `(${Array.from({ length: 10 }, (_, j) => `$${i * 10 + j + 1}`).join(",")})`).join(",");
  await db().query(
    `INSERT INTO learning_events (time, learner, world, type, game, correct, mistakes, accuracy, ms, data) VALUES ${values}`,
    rows.flat(),
  );
  return rows.length;
}

export interface GameArm {
  game: string;
  plays: number;
  accuracy: number;
  /** UCB1 score: accuracy + exploration bonus for little-tried game types */
  ucb: number;
}

export interface WorldTrend {
  world: string;
  sessions: number;
  lastAccuracy: number;
  /** accuracy change per day from a least-squares fit over this learner's sessions (regr_slope in SQL) */
  slopePerDay: number | null;
  /** predicted accuracy if they played again now */
  predicted: number;
}

export interface Insights {
  totalEvents: number;
  learners: number;
  /** game types ranked for everyone (decision: what the generator should prefer) */
  arms: GameArm[];
  /** same, for this learner only */
  myArms: GameArm[];
  trends: WorldTrend[];
  /** average answer time per day for this learner (ms), newest last: a focus/fatigue signal */
  responseMs: { day: string; ms: number }[];
  recommendation: { game: string | null; reviewWorld: string | null; why: string };
}

function ucb(rows: { game: string; correct: number; total: number }[]): GameArm[] {
  const n = rows.reduce((s, r) => s + r.total, 0) || 1;
  return rows
    .map((r) => {
      const acc = r.total ? r.correct / r.total : 0;
      return { game: r.game, plays: r.total, accuracy: acc, ucb: acc + Math.sqrt((2 * Math.log(n)) / Math.max(1, r.total)) };
    })
    .sort((a, b) => b.ucb - a.ucb);
}

export async function insights(learner: string): Promise<Insights> {
  await ensureSchema();
  const c = db();
  const [totals, armsAll, armsMine, trends, resp] = await Promise.all([
    c.query(`SELECT count(*)::int AS events, count(DISTINCT learner)::int AS learners FROM learning_events`),
    // all learners, from the continuous aggregate (falls back to the raw table if it doesn't exist)
    c
      .query(`SELECT game, sum(correct)::float AS correct, (sum(correct) + sum(mistakes))::float AS total FROM game_daily
              WHERE day > now() - INTERVAL '30 days' GROUP BY game`)
      .catch(() =>
        c.query(`SELECT game, sum(correct)::float AS correct, (sum(correct) + sum(mistakes))::float AS total FROM learning_events
                 WHERE game IS NOT NULL AND time > now() - INTERVAL '30 days' GROUP BY game`),
      ),
    c.query(
      `SELECT game, sum(correct)::float AS correct, (sum(correct) + sum(mistakes))::float AS total FROM learning_events
       WHERE learner = $1 AND game IS NOT NULL GROUP BY game`,
      [learner],
    ),
    // per-world least-squares trend of session accuracy over time (days)
    c.query(
      `SELECT world, count(*)::int AS sessions,
              (array_agg(accuracy ORDER BY time DESC))[1] AS last,
              regr_slope(accuracy, extract(epoch FROM time) / 86400) AS slope,
              regr_intercept(accuracy, extract(epoch FROM time) / 86400) AS intercept
       FROM learning_events WHERE learner = $1 AND type = 'world_complete' AND accuracy IS NOT NULL
       GROUP BY world ORDER BY max(time) DESC LIMIT 12`,
      [learner],
    ),
    c.query(
      `SELECT time_bucket('1 day', time) AS day, avg(ms)::float AS ms FROM learning_events
       WHERE learner = $1 AND ms IS NOT NULL AND time > now() - INTERVAL '14 days'
       GROUP BY day ORDER BY day`,
      [learner],
    ),
  ]);

  const today = Date.now() / 86_400_000;
  const worldTrends: WorldTrend[] = trends.rows.map((r) => {
    const slope = r.slope === null ? null : Number(r.slope);
    const fit = slope === null ? Number(r.last) : Number(r.intercept) + slope * today;
    return {
      world: r.world,
      sessions: r.sessions,
      lastAccuracy: Number(r.last),
      slopePerDay: slope,
      predicted: Math.min(1, Math.max(0, fit)),
    };
  });

  const arms = ucb(armsAll.rows.filter((r) => r.total > 0));
  const myArms = ucb(armsMine.rows.filter((r) => r.total > 0));
  const pick = (myArms[0] ?? arms[0])?.game ?? null;
  const weakest = [...worldTrends].sort((a, b) => a.predicted - b.predicted)[0];
  const why = [
    pick ? `${pick} scores best for ${myArms.length ? "you" : "learners so far"} once untried types get a fair chance (UCB1).` : "",
    weakest ? `Review "${weakest.world}" next: predicted ${Math.round(weakest.predicted * 100)}% from your session trend.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    totalEvents: totals.rows[0].events,
    learners: totals.rows[0].learners,
    arms,
    myArms,
    trends: worldTrends,
    responseMs: resp.rows.map((r) => ({ day: new Date(r.day).toISOString().slice(0, 10), ms: Math.round(r.ms) })),
    recommendation: { game: pick, reviewWorld: weakest?.world ?? null, why: why || "Play a few games to get predictions." },
  };
}
