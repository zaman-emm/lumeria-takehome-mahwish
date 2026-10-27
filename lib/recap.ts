// "Play your month": the period as a few tap-through slides, each answering
// one question. Pure: every number on a slide is read from the report, and a
// slide is left out when the data for it isn't there (one scan, no trip…).

import {
  METRICS,
  addDays,
  band,
  byTime,
  dayOf,
  daysBetween,
  fmtDay,
  fmtRange,
  metricMeta,
  score,
  scanTz,
  shortTip,
  type Derived,
  type Factor,
  type ScoreKey,
  type Span,
} from "./insights";
import type { Scan } from "./types";
import { weekStreak } from "./weeks";

/** A headline with one phrase picked out, the way the slides set it. */
export interface Title {
  before: string;
  bold: string;
  after: string;
}

export interface Stat {
  label: string;
  value: string;
}

export interface Point {
  /** 0–1 across the period. */
  x: number;
  value: number;
}

export type Slide =
  | { kind: "highs"; title: Title; scan: Scan; stats: Stat[]; body: string }
  | {
      kind: "showedUp";
      title: Title;
      /** Weeks in a row with a scan: the number on the streak card. */
      streak: number;
      /** The month the card turns over to, once the streak has counted up. */
      cover: string;
      /** Three of the month's scans, first to latest, stacked like polaroids on the cover. */
      snaps: Scan[];
      stats: Stat[];
      /** The calendar month the period ends in, e.g. "October". */
      month: string;
      /** That month as a Sunday-first grid, padded with the days either side of it. */
      days: { day: string; date: number; inMonth: boolean; scanned: boolean; latest: boolean }[];
    }
  | { kind: "scanTime"; title: Title; hour: number; minutes: number[]; stats: Stat[]; body: string }
  | {
      kind: "better";
      title: Title;
      stats: Stat[];
      line: Point[];
      grid: number[];
      band: { x0: number; x1: number; label: string } | null;
      marks: { x: number; value: number; tone: "good" | "low" }[];
      axis: { x: number; label: string }[];
      tiles: { label: string; value: number; tone: "good" | "low" }[];
      body: string;
    }
  | {
      kind: "rough";
      big: number;
      from: number;
      title: Title;
      bars: { x: number; value: number; away: boolean }[];
      line: Point[];
      low: Point;
      metric: string;
      axis: { x: number; label: string }[];
      stats: Stat[];
      body: string;
    }
  | {
      kind: "helped";
      title: Title;
      metric: string;
      line: Point[];
      from: Point;
      to: Point;
      band: { x0: number; x1: number; label: string } | null;
      spans: { label: string; x0: number; x1: number; tone: "base" | "held" | "helped"; stopped: boolean }[];
      axis: { x: number; label: string }[];
      stats: Stat[];
      body: string;
    }
  | {
      kind: "nights";
      title: Title;
      bars: { x: number; hours: number; recent: boolean }[];
      before: number;
      metric: string;
      line: Point[];
      recent: Point[];
      axis: { x: number; label: string }[];
      stats: Stat[];
      body: string;
    }
  | { kind: "scope"; title: Title; scan: Scan; body: string }
  | { kind: "tip"; title: Title; stats: Stat[]; chips: string[]; tip: string };

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n: number) => WORDS[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const t = (before: string, bold: string, after = ""): Title => ({ before, bold, after });

/** What a falling score looks like, for "Dry air showed up as redness". */
const LOOKS: Record<string, string> = {
  hydration: "dryness",
  evenness: "uneven tone",
  redness: "redness",
  pigmentation: "dark spots",
  oiliness: "shine",
};

export function buildRecap(d: Derived): Slide[] {
  if (d.scans.length < 2) return [];
  const days = daysBetween(d.start, d.end) + 1;
  const xOf = (day: string) => (days <= 1 ? 0 : daysBetween(d.start, day) / (days - 1));
  const axis3 = () => {
    const mid = addDays(d.start, Math.round((days - 1) / 2));
    return [
      { x: 0, label: fmtDay(d.start) },
      { x: xOf(mid), label: fmtDay(mid) },
      { x: 1, label: fmtDay(d.end) },
    ];
  };
  const axis2 = () => [
    { x: 0, label: fmtDay(d.start) },
    { x: 1, label: fmtDay(d.end) },
  ];
  const travel = d.spans.find((s) => s.kind === "travel") ?? null;
  const bandOf = (sp: Span | null) => (sp ? { x0: xOf(sp.start), x1: xOf(sp.end), label: sp.short } : null);
  const lineOf = (scans: Scan[], key: ScoreKey) =>
    scans
      .map((s) => ({ x: xOf(dayOf(d, s)), value: score(s, key) }))
      .filter((p): p is Point => p.value != null);
  const span = d.isMonthly ? "this month" : "so far";
  const out: Slide[] = [];

  // 1. Highs: the best scan of the main spot, and what stood out on it.
  const best = d.trend?.high ?? [...d.scans].sort((a, b) => b.scores.overall - a.scores.overall)[0];
  const top = METRICS.map((m) => ({ m, v: score(best, m.key) }))
    .filter((x): x is { m: (typeof METRICS)[number]; v: number } => x.v != null)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2);
  const note = best.annotation?.note;
  out.push({
    kind: "highs",
    title: t(`${d.firstName}, let’s start with your `, "highs", "."),
    scan: best,
    stats: [{ label: "Overall", value: String(best.scores.overall) }, ...top.map((x) => ({ label: x.m.label, value: String(x.v) }))],
    body: `${fmtDay(dayOf(d, best))} was your best scan ${span}${note ? `, and you felt it too: “${note.replace(/^honestly,?\s*/i, "")}”` : "."}`,
  });

  // 2. Showing up: the week streak, scan days, and the month they fell in.
  const counts = new Map<string, number>();
  for (const s of d.scans) {
    const day = dayOf(d, s);
    counts.set(day, Math.max(counts.get(day) ?? 0, s.scores.overall));
  }
  const ws = weekStreak(d);
  // The month the period ends in, Sunday first, with the days either side
  // filling out its first and last weeks, the way the Calendar app draws it.
  const monthStart = `${d.end.slice(0, 7)}-01`;
  const [yy, mm] = d.end.split("-").map(Number);
  const monthLength = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const lead = new Date(`${monthStart}T12:00:00Z`).getUTCDay();
  const gridStart = addDays(monthStart, -lead);
  const latestDay = dayOf(d, d.latest);
  const grid = Array.from({ length: Math.ceil((lead + monthLength) / 7) * 7 }, (_, i) => {
    const day = addDays(gridStart, i);
    return { day, date: Number(day.slice(8)), inMonth: day.slice(0, 7) === d.end.slice(0, 7), scanned: counts.has(day), latest: day === latestDay };
  });
  // The cover's snapshots: the first scan, one from the middle and the latest.
  const inOrder = [...d.scans].sort(byTime);
  const snaps = [...new Set([0, Math.floor((inOrder.length - 1) / 2), inOrder.length - 1])].map((i) => inOrder[i]).filter(Boolean);
  const run = ws.current || ws.best;
  out.push({
    kind: "showedUp",
    // Said the way a big sister would: proud, plain, a little nudge.
    title: t("Look at you, ", "showing up", "."),
    streak: run,
    cover: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${d.end}T12:00:00Z`)),
    snaps,
    stats: [
      { label: "Scan days", value: `${counts.size}/${days}` },
      { label: "Scans", value: String(d.scans.length) },
      { label: "Areas", value: String(d.areas.length) },
    ],
    month: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${monthStart}T12:00:00Z`)),
    days: grid,
  });

  // 3. Scan time: the hour most scans land in, one minute hand per scan.
  const local = d.scans.map((s) => {
    const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: scanTz(s) ?? d.tz })
      .formatToParts(new Date(s.takenAt));
    const get = (k: string) => Number(parts.find((p) => p.type === k)?.value ?? 0);
    return { h: get("hour"), m: get("minute") };
  });
  const byHour = new Map<number, number>();
  local.forEach(({ h }) => byHour.set(h, (byHour.get(h) ?? 0) + 1));
  const [hour, inHour] = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0];
  if (inHour >= 3) {
    const mornings = local.filter((x) => x.h < 12);
    const earliest = [...local].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))[0];
    const h12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);
    const ampm = hour < 12 ? "AM" : "PM";
    out.push({
      kind: "scanTime",
      title: t("You usually scan between ", `${h12(hour)} and ${h12(hour + 1)} ${ampm}`, "."),
      hour,
      minutes: local.filter((x) => x.h === hour).map((x) => x.m).sort((a, b) => a - b),
      stats: [
        { label: "Mornings", value: String(mornings.length) },
        { label: "Evenings", value: String(local.length - mornings.length) },
        { label: "Earliest", value: `${h12(earliest.h)}:${String(earliest.m).padStart(2, "0")}` },
      ],
      body: "Scanning at the same time, in the same light, makes your scans easier to compare.",
    });
  }

  // 4. Getting better: overall, first to latest, for the main spot.
  if (d.trend) {
    const { delta, low, high, to } = d.trend;
    const line = lineOf(d.areaScans, "overall");
    const vals = line.map((p) => p.value);
    const lo = Math.floor(Math.min(...vals) / 10) * 10;
    const grid = [lo + 10, lo + 20].filter((g) => g < Math.max(...vals) + 5);
    const moved = d.changes.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
    const lowDay = dayOf(d, low);
    const climbed = Math.round(daysBetween(lowDay, dayOf(d, to)) / 7);
    out.push({
      kind: "better",
      title:
        delta >= 3
          ? t("Your overall score rose ", `${delta} points`, ` ${span}.`)
          : delta <= -3
            ? t("Your overall score dipped ", `${Math.abs(delta)} points`, ` ${span}.`)
            : t("Your overall score held ", "steady", ` ${span}.`),
      stats: moved.map((c) => ({ label: metricMeta(c.key).label, value: `+${c.delta}` })),
      line,
      grid,
      band: bandOf(travel),
      marks: [
        { x: line[0].x, value: line[0].value, tone: "good" },
        ...(low !== d.trend.from && low !== to ? [{ x: xOf(lowDay), value: low.scores.overall, tone: "low" as const }] : []),
        { x: line[line.length - 1].x, value: line[line.length - 1].value, tone: "good" },
      ],
      axis: [
        { x: 0, label: fmtDay(d.start) },
        ...(low !== d.trend.from && low !== to ? [{ x: xOf(lowDay), label: fmtDay(lowDay) }] : []),
        { x: 1, label: fmtDay(d.end) },
      ],
      tiles: [
        { label: `Lowest · ${fmtDay(lowDay)}`, value: low.scores.overall, tone: "low" },
        { label: `Best · ${fmtDay(dayOf(d, high))}`, value: high.scores.overall, tone: "good" },
      ],
      body:
        low !== d.trend.from && low !== to
          ? `You dipped to ${low.scores.overall} on ${fmtDay(lowDay)}, then climbed${climbed >= 2 ? ` for ${word(climbed)} weeks straight` : ""} to ${
              d.isBest ? "your best score yet" : to.scores.overall
            }.`
          : delta >= 3
            ? "Scan after scan, the line kept climbing."
            : "Small moves either way. Steady is good news for skin.",
    });
  }

  // 5. The rough patch: a trip whose air lined up with a dip.
  const trip = d.factors.find((f) => f.kind === "travel");
  const tripSpan = trip && d.spans.find((s) => s.id === trip.spanId);
  if (trip && tripSpan) {
    const inTrip = (day: string) => day >= tripSpan.start && day <= tripSpan.end;
    const env = new Map<string, number[]>();
    for (const s of d.scans) {
      if (!s.location) continue;
      const day = dayOf(d, s);
      env.set(day, [...(env.get(day) ?? []), s.location.environment.humidityPct]);
    }
    const away = d.scans.filter((s) => inTrip(dayOf(d, s)) && s.location);
    const home = d.scans.filter((s) => !inTrip(dayOf(d, s)) && s.location);
    const big = Math.min(...away.map((s) => s.location!.environment.humidityPct));
    const key = trip.change.key;
    const line = lineOf(d.scans, key);
    const lowScan = d.scans.filter((s) => inTrip(dayOf(d, s))).sort((a, b) => (score(a, key) ?? 101) - (score(b, key) ?? 101))[0];
    const back = Math.round(trip.change.from / 10) * 10;
    const after = d.scans.filter((s) => dayOf(d, s) > tripSpan.end).sort(byTime).find((s) => (score(s, key) ?? 0) >= back);
    const label = metricMeta(key).label;
    out.push({
      kind: "rough",
      big,
      from: Math.round(avg(home.map((s) => s.location!.environment.humidityPct))),
      title: t("humidity in ", tripSpan.short, `, ${fmtRange(tripSpan.start, tripSpan.end)}.`),
      bars: [...env.entries()].map(([day, hs]) => ({ x: xOf(day), value: Math.round(avg(hs)), away: inTrip(day) })),
      line,
      low: { x: xOf(dayOf(d, lowScan)), value: score(lowScan, key) ?? trip.change.to },
      metric: label,
      axis: axis2(),
      stats: [
        { label: "UV", value: String(Math.max(...away.map((s) => s.location!.environment.uvIndexMax))) },
        { label: "High", value: `${Math.max(...away.map((s) => s.location!.environment.tempHighC))}°C` },
        { label, value: String(trip.change.to) },
      ],
      body: `Dry air and strong sun showed up as ${LOOKS[key] ?? "a dip"}.${after ? ` ${label} was back above ${back} by ${fmtDay(dayOf(d, after))}.` : ""}`,
    });
  }

  // 6. What helped: the product a score climbed most alongside.
  const helped = d.factors.find((f) => f.kind === "product" && f.direction === "helped" && f.change.key !== "hydration") ??
    d.factors.find((f) => f.kind === "product" && f.direction === "helped");
  const helpedSpan = helped && d.spans.find((s) => s.id === helped.spanId);
  if (helped && helpedSpan?.product) {
    const key = helped.change.key;
    const line = lineOf(d.areaScans, key);
    const startX = xOf(helpedSpan.start);
    const fromPt = [...line].reverse().find((p) => p.x <= startX + 1e-6 && p.value === helped.change.from) ??
      line.find((p) => p.value === helped.change.from) ?? line[0];
    const held: Factor | undefined = d.factors.find((f) => f.kind === "product" && f.direction === "held" && f.evidence.caveat);
    const heldSpan = held && d.spans.find((s) => s.id === held.spanId);
    const stings = held?.evidence.facts.some((f) => /sting/i.test(f));
    const products = d.spans.filter((s) => s.kind === "product");
    const name = helpedSpan.product.keyIngredients[0] ?? helpedSpan.short;
    out.push({
      kind: "helped",
      title: t(`${metricMeta(key).label} rose `, `${helped.change.delta} points`, ` once you started ${name.toLowerCase()}.`),
      metric: metricMeta(key).label,
      line,
      from: fromPt,
      to: line[line.length - 1],
      band: bandOf(travel),
      spans: products.map((s) => ({
        label: s.short,
        x0: xOf(s.start),
        x1: xOf(s.end),
        tone: s.id === helped.spanId ? "helped" : s.stopped ? "held" : "base",
        stopped: Boolean(s.stopped),
      })),
      axis: axis2(),
      stats: products.map((s) => ({ label: s.short.split(" ")[0], value: `${daysBetween(s.start, s.end) + (s.ongoing ? 1 : 0)} d` })),
      body:
        held && heldSpan && travel
          ? `${heldSpan.short} overlapped the ${travel.short} trip, so it’s hard to say which one ${stings ? "caused the stinging" : "did more"}.`
          : helped.body,
    });
  }

  // 7. Shorter nights: sleep against the score that slipped with it.
  const sleep = d.factors.find((f) => f.kind === "sleep");
  if (sleep) {
    const sleepOf = (s: Scan) => s.health?.sleepHours ?? s.checkin?.sleepHours ?? null;
    const perDay = new Map<string, number>();
    d.scans.forEach((s) => {
      const h = sleepOf(s);
      if (h != null) perDay.set(dayOf(d, s), h);
    });
    const since = sleep.when.replace(/^Since\s+/, "");
    const withSleep = d.areaScans.filter((s) => sleepOf(s) != null);
    const recentScans = withSleep.slice(-3);
    const recentDays = new Set(recentScans.map((s) => dayOf(d, s)));
    const prior = withSleep.slice(-6, -3);
    const key = sleep.change.key;
    const line = lineOf(d.areaScans, key);
    const recent = recentScans.map((s) => ({ x: xOf(dayOf(d, s)), value: score(s, key) ?? 0 }));
    const label = metricMeta(key).label;
    const hrv = recentScans.map((s) => s.health?.hrvMs).filter((x): x is number => x != null);
    const sRecent = avg(recentScans.map((s) => sleepOf(s)!));
    const sPrior = avg(prior.map((s) => sleepOf(s)!));
    out.push({
      kind: "nights",
      title: t("You slept ", `${sRecent.toFixed(1)} hours`, ` a night since ${since}.`),
      bars: [...perDay.entries()].map(([day, hours]) => ({ x: xOf(day), hours, recent: recentDays.has(day) })),
      before: Math.round(sPrior),
      metric: label,
      line,
      recent,
      axis: axis3(),
      stats: [
        { label: "Before", value: `${sPrior.toFixed(1)} h` },
        ...(hrv.length ? [{ label: "HRV", value: `${Math.round(avg(hrv))} ms` }] : []),
        { label, value: String(sleep.change.to) },
      ],
      body: `${cap(LOOKS[key] ?? label)} crept up as your nights got shorter. A couple of early nights could help.`,
    });
  }

  // 8. Under the scope: the latest scan with all three lights.
  const lit = d.realPhotos[d.realPhotos.length - 1];
  if (lit) {
    out.push({
      kind: "scope",
      title: t("Your skin in ", "three lights", "."),
      scan: lit,
      body: "Polarized light shows redness under the surface. UV shows where oil builds up.",
    });
  }

  // 9. The tip, with what it's aimed at.
  const latest = d.latest;
  const low = METRICS.map((m) => ({ m, v: score(latest, m.key) }))
    .filter((x): x is { m: (typeof METRICS)[number]; v: number } => x.v != null)
    .sort((a, b) => a.v - b.v)
    .slice(0, 3);
  const tip = latest.summary.tip;
  out.push({
    kind: "tip",
    title: tipTitle(tip),
    stats: low.map((x) => ({ label: x.m.label, value: String(x.v) })),
    chips: chipsOf(tip),
    tip,
  });

  return out;
}

/** The tip as next month's headline, with the one word that matters picked out. */
function tipTitle(tip: string): Title {
  if (/lightweight|oil-free/i.test(tip) && /moisturi[sz]er/i.test(tip)) return t("Next month, try a ", "lighter", " moisturizer.");
  if (/SPF|sunscreen/i.test(tip)) return t("Next month, wear ", "SPF", " every day.");
  const short = shortTip(tip).replace(/^Try\s+/i, "").replace(/\.$/, "");
  return t("Next month, try ", short, ".");
}

const CHIP_WORDS: [RegExp, string][] = [
  [/oil-free/i, "Oil-free"],
  [/lightweight/i, "Lightweight"],
  [/fragrance-free/i, "Fragrance-free"],
  [/gentle/i, "Gentle"],
  [/SPF\s*\d+|SPF/i, "SPF"],
  [/damp/i, "On damp skin"],
];

function chipsOf(tip: string) {
  return CHIP_WORDS.filter(([re]) => re.test(tip)).map(([, w]) => w).slice(0, 2);
}

/** Calendar tones for a day's score. */
export const dayTone = (v: number) => band(v).tone;
