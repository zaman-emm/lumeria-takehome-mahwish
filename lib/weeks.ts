// Weekly check-ins, the way the shipped app counts streaks: weeks in a row with
// at least one scan. Computed from scan timestamps only, so it needs no extra data.

import { dayOf, daysBetween, type Derived } from "./insights";

export interface WeekStreak {
  /** Weeks in a row up to the latest week. 0 when the latest week has no scan. */
  current: number;
  /** Longest run of weeks in the period. */
  best: number;
  /** One entry per week of the period: did it have a scan? */
  weeks: boolean[];
  milestones: { weeks: number; earned: boolean }[];
}

const MILESTONES = [4, 8, 12];

export function weekStreak(d: Derived): WeekStreak {
  const total = Math.max(1, Math.ceil((daysBetween(d.start, d.end) + 1) / 7));
  const weeks = Array.from({ length: total }, () => false);
  for (const s of d.scans) {
    const i = Math.floor(daysBetween(d.start, dayOf(d, s)) / 7);
    if (i >= 0 && i < total) weeks[i] = true;
  }

  let best = 0;
  let run = 0;
  for (const w of weeks) {
    run = w ? run + 1 : 0;
    best = Math.max(best, run);
  }
  let current = 0;
  for (let i = weeks.length - 1; i >= 0 && weeks[i]; i--) current++;

  return {
    current,
    best,
    weeks,
    milestones: MILESTONES.map((n) => ({ weeks: n, earned: best >= n })),
  };
}
