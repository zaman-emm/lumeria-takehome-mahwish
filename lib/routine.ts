// The routine, read for the Products tab: when each product is used, how a
// trial is going, and how one metric moved day by day around it.
// Budget swaps are mocked here (see SUBMISSION.md, "Extra data I assumed").

import { addDays, dayOf, daysBetween, score, type Derived, type Factor, type ScoreKey } from "./insights";
import type { Product } from "./types";

export interface Schedule {
  am: boolean;
  pm: boolean;
  /** For screen readers, since the chip is icons only: "Night, 3× a week". */
  spoken: string;
}

export function schedule(p: Product): Schedule {
  const u = p.usage.toLowerCase();
  const am = /\bam\b|morning/.test(u);
  const pm = /\bpm\b|night|evening/.test(u);
  const freq = p.usage
    .replace(/\b(AM|PM)\b/gi, "")
    .replace(/[+,]/g, " ")
    .replace(/(\d)x\b/i, "$1×")
    .trim()
    .replace(/\s+/g, " ");
  const when = am && pm ? "Morning and night" : am ? "Morning" : pm ? "Night" : "";
  return { am, pm, spoken: [when, freq].filter(Boolean).join(", ") };
}

export const TRIAL_DAYS = 14;

/** A product started inside the last two weeks is on trial: "10 of 14". */
export function trial(d: Derived, p: Product): { day: number; of: number } | null {
  if (p.endDate) return null;
  const day = daysBetween(p.startDate, d.end) + 1;
  if (day < 1 || day > TRIAL_DAYS) return null;
  return { day, of: TRIAL_DAYS };
}

export interface DayValue {
  day: string;
  /** The day's average (across every area scanned, or the one asked for). null on days without a scan. */
  value: number | null;
}

/** One metric, one bar per day of the period. */
export function dailySeries(d: Derived, key: ScoreKey, area?: string): DayValue[] {
  const n = daysBetween(d.start, d.end) + 1;
  const byDay = new Map<string, number[]>();
  for (const s of d.scans) {
    // One spot only, when asked: different spots score on different scales.
    if (area && s.area !== area) continue;
    const v = score(s, key);
    if (v == null) continue;
    const day = dayOf(d, s);
    byDay.set(day, [...(byDay.get(day) ?? []), v]);
  }
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(d.start, i);
    const vs = byDay.get(day);
    return { day, value: vs ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : null };
  });
}

/** The clue a product lined up with, if one did. */
export const factorFor = (d: Derived, p: Product): Factor | undefined => d.factors.find((f) => f.spanId === p.id);

// ---------------------------------------------------------------- mocked

export type Tier = "$" | "$$" | "$$$";

/** Assumed from onboarding: the price range the person said they shop in. */
export const BUDGET_TIER: Tier = "$$";

/**
 * Gentler alternatives when an active is stopped for irritation, one per
 * price tier. Mocked: a real version would come from a product catalogue.
 */
const SWAPS: Record<string, { tier: Tier; name: string }[]> = {
  retinol: [
    { tier: "$", name: "Bakuchiol serum" },
    { tier: "$$", name: "Retinal 0.05%" },
    { tier: "$$$", name: "Granactive retinoid" },
  ],
};

export function swapsFor(p: Product) {
  if (!p.stoppedReason) return [];
  const key = p.keyIngredients.map((k) => k.toLowerCase()).find((k) => SWAPS[k]);
  return key ? SWAPS[key] : [];
}
