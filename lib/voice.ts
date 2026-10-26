// The report's voice: a few lines a big sister would say, each built from this
// person's own scans, notes and routine. A line is only said when the data
// backs it; otherwise the caller keeps its plain fallback.

import { METRICS, dayOf, score, type Derived, type Factor, type ScoreKey } from "./insights";
import type { WeekStreak } from "./weeks";

/** "calmer than it's been all month" when monthly, "the calmest it's been yet" otherwise. */
const HIGH: Partial<Record<ScoreKey, [comparative: string, superlative: string]>> = {
  hydration: ["more hydrated", "the most hydrated"],
  evenness: ["more even", "the most even"],
  redness: ["calmer", "the calmest"],
  pigmentation: ["clearer", "the clearest"],
  oiliness: ["more balanced", "the most balanced"],
  overall: ["better", "the best"],
};

/** What a slip in each score looks like, said plainly. */
const LOW: Partial<Record<ScoreKey, string>> = {
  hydration: "Your skin’s thirstier lately.",
  evenness: "Your tone’s less even lately.",
  redness: "Your skin’s redder lately.",
  pigmentation: "Spots are showing more lately.",
  oiliness: "Your skin’s shinier lately.",
};

const series = (d: Derived, key: ScoreKey) =>
  d.areaScans.map((s) => score(s, key)).filter((v): v is number => v != null);

/** The hero line: the score that's at its best right now, or the one slipping most. */
export function headline(d: Derived): string {
  if (d.trend) {
    // A score whose latest scan is its high, and that climbed furthest to get there.
    const highs = METRICS.flatMap((m) => {
      const vs = series(d, m.key);
      const now = vs[vs.length - 1];
      if (vs.length < 3 || now < Math.max(...vs) || now <= vs[0]) return [];
      const words = HIGH[m.key];
      return words ? [{ words, climb: now - Math.min(...vs) }] : [];
    }).sort((a, b) => b.climb - a.climb);
    if (highs[0]) {
      const [more, most] = highs[0].words;
      return d.isMonthly ? `Your skin’s ${more} than it’s been all month.` : `Your skin’s ${most} it’s been yet.`;
    }
    const slip = [...d.changes].sort((a, b) => a.delta - b.delta)[0];
    if (d.trend.delta < 0 && slip && slip.delta <= -5 && LOW[slip.key]) return LOW[slip.key]!;
  }
  const h = d.latest.summary.headline.trim();
  return /[.!?]$/.test(h) ? h : `${h}.`;
}

/** The hero card: how far the overall score has come, or what a first scan is for. */
export function sinceStart(d: Derived): string {
  if (!d.trend) return "Your first scan. Every one from here shows what’s changing.";
  const n = Math.abs(d.trend.delta);
  if (!n) return "Holding steady since you started.";
  return `${d.trend.delta > 0 ? "Up" : "Down"} ${n} since you started.`;
}

/** After the streak count: the run, and how far the next badge is. */
export function streakLine(streak: WeekStreak): string {
  const run = streak.current || streak.best;
  const weeks = run === 1 ? "week" : "weeks";
  if (!streak.current) return `${weeks}, your best run.`;
  const next = streak.milestones.find((m) => !m.earned && m.weeks > run);
  return next ? `${weeks} in a row. ${next.weeks - run} more for ${next.weeks}.` : `${weeks} in a row.`;
}

/** The answer to her own words, when the scan proves her right. Her note shows above it, in its card. */
export function noteEcho(d: Derived): string | null {
  const note = d.latest.annotation?.note?.trim();
  if (!note || !d.isBest || !d.trend) return null;
  return `You’re right: ${d.trend.to.scores.overall} is your high.`;
}

/** How each routine change and trip moved the month, in order: "Retinol stung, Phoenix dried you out, and azelaic acid brought the calm back." */
export function monthStory(d: Derived): string | null {
  const shaped = d.spans
    .filter((sp) => !(sp.start <= d.start && sp.end >= d.end))
    .flatMap((sp) => {
      const f = d.factors.find((x) => x.spanId === sp.id);
      return f ? [{ sp, f }] : [];
    })
    .sort((a, b) => a.sp.start.localeCompare(b.sp.start))
    .slice(0, 3);
  if (shaped.length < 2) return null;

  const clauses = shaped.map(({ sp, f }, i) => {
    // Her notes during the span say how it felt better than any score.
    const felt = d.notes
      .filter((n) => n.note && dayOf(d, n.scan) >= sp.start && dayOf(d, n.scan) <= sp.end)
      .map((n) => n.note!)
      .join(" ");
    const name = i === 0 || sp.kind === "travel" ? sp.short : sp.short[0].toLowerCase() + sp.short.slice(1);
    const settled = shaped.slice(0, i).some((p) => p.f.direction === "held" && p.f.change.key === f.change.key);
    return `${name} ${verb(f, felt, settled)}`;
  });
  const last = clauses.pop();
  return `${clauses.join(", ")}${clauses.length > 1 ? "," : ""} and ${last}.`;
}

function verb(f: Factor, felt: string, settled: boolean): string {
  if (f.direction === "held") {
    if (/sting|tingl|burn/i.test(felt)) return "stung";
    if (/flak|dry|tight/i.test(felt)) return "dried you out";
    const said: Partial<Record<ScoreKey, string>> = {
      hydration: "dried you out",
      evenness: "roughed up your tone",
      redness: "stirred up redness",
      pigmentation: "darkened a few spots",
      oiliness: "made you shinier",
    };
    return said[f.change.key] ?? "set you back";
  }
  const said: Partial<Record<ScoreKey, string>> = {
    hydration: "brought the moisture back",
    evenness: "evened things out",
    redness: settled ? "brought the calm back" : "calmed things down",
    pigmentation: "cleared things up",
    oiliness: "balanced the shine",
  };
  return said[f.change.key] ?? "helped";
}
