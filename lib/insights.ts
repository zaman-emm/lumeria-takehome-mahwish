// Turns a raw SkinReport into the things a person actually wants to know:
// how is my skin now, is it getting better, and what lined up with the changes.
// Pure functions only, so every variant reads the same story from the same data.
// Copy here is deliberately observational ("lined up with", "at the same time"),
// never causal or medical.

import type { MetricKey, Product, Scan, SkinReport } from "./types";

/** Extra measures beyond the API. Mocked in lib/extended.ts. */
export type ExtraKey = "radiance" | "pores" | "spots";
export type ScoreKey = MetricKey | "overall" | ExtraKey;

export interface MetricMeta {
  key: ScoreKey;
  /** Named for the healthy quality, so "higher is better" reads naturally. */
  label: string;
  /** What the raw measurement is, for people who want it. */
  measures: string;
  hint: string;
}

export const METRICS: MetricMeta[] = [
  { key: "hydration", label: "Hydration", measures: "Hydration", hint: "How much moisture your skin is holding" },
  { key: "evenness", label: "Even tone", measures: "Evenness", hint: "How even your tone and texture look" },
  { key: "redness", label: "Calm", measures: "Redness", hint: "Higher means less visible redness" },
  { key: "pigmentation", label: "Clarity", measures: "Pigmentation", hint: "Higher means dark spots are less visible" },
  { key: "oiliness", label: "Oil balance", measures: "Oiliness", hint: "Higher means less excess shine" },
];

export const OVERALL: MetricMeta = {
  key: "overall",
  label: "Overall",
  measures: "Overall",
  hint: "The average of everything we measured",
};

/**
 * Extras, each with how it would be read. Radiance is derived from scores we
 * already have; pores and spots assume a dedicated photo-analysis step.
 */
export const EXTRAS: (MetricMeta & { source: "derived" | "photo"; why: string })[] = [
  {
    key: "radiance",
    label: "Radiance",
    measures: "Radiance",
    hint: "Derived from hydration and even tone",
    source: "derived",
    why: "Not a separate measurement. It blends hydration with even tone and texture, the two things that make skin look lit from within.",
  },
  {
    key: "pores",
    label: "Pores",
    measures: "Pore visibility",
    hint: "Higher means pores look smaller",
    source: "photo",
    why: "Assumes a photo-analysis step that reads pores from the UV image. Texture scores alone can’t measure them.",
  },
  {
    key: "spots",
    label: "Spots",
    measures: "Spot count",
    hint: "Higher means fewer separate spots",
    source: "photo",
    why: "Assumes photo analysis that counts separate marks. Clarity already follows overall tone; this follows the spots people point at.",
  },
];

const EXTRA_KEYS = new Set<ScoreKey>(EXTRAS.map((m) => m.key));
export const isExtra = (key: ScoreKey): key is ExtraKey => EXTRA_KEYS.has(key);

export const metricMeta = (key: ScoreKey) =>
  key === "overall" ? OVERALL : (METRICS.find((m) => m.key === key) ?? EXTRAS.find((m) => m.key === key)!);

/** A scan as the app sees it: the API's scan plus any extras we read alongside it. */
export type ScanExtras = Partial<Record<ExtraKey, number | null>>;

export const score = (scan: Scan, key: ScoreKey): number | null =>
  isExtra(key) ? ((scan as Scan & { extras?: ScanExtras }).extras?.[key] ?? null) : (scan.scores[key] ?? null);

// ---------------------------------------------------------------- dates

const DAY_MS = 86_400_000;

export const scanTz = (scan: Scan) => scan.location?.tz;

/** yyyy-mm-dd in the place the scan was taken (or the viewer's zone). */
export function localDay(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

const dayToDate = (day: string) => new Date(`${day}T12:00:00Z`);

/** "Oct 22" */
export function fmtDay(isoOrDay: string, tz?: string) {
  const isDay = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDay);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: isDay ? "UTC" : tz,
  }).format(isDay ? dayToDate(isoOrDay) : new Date(isoOrDay));
}

/** "8:49 AM" */
export function fmtTime(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}

/** "Oct 4–7" or "Sep 23–Oct 22" */
export function fmtRange(startDay: string, endDay: string) {
  const a = dayToDate(startDay);
  const b = dayToDate(endDay);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  if (startDay === endDay) return fmtDay(startDay);
  return sameMonth ? `${fmtDay(startDay)}–${b.getUTCDate()}` : `${fmtDay(startDay)}–${fmtDay(endDay)}`;
}

export const daysBetween = (a: string, b: string) => Math.round((dayToDate(b).getTime() - dayToDate(a).getTime()) / DAY_MS);

const addDays = (day: string, n: number) => new Date(dayToDate(day).getTime() + n * DAY_MS).toISOString().slice(0, 10);

// ---------------------------------------------------------------- model

export interface Span {
  id: string;
  kind: "product" | "travel";
  label: string;
  short: string;
  start: string;
  /** Inclusive. Open-ended products end at the report's last day. */
  end: string;
  ongoing: boolean;
  stopped?: string;
  product?: Product;
}

export interface Moment {
  id: string;
  kind: "period";
  day: string;
  label: string;
}

export interface Change {
  key: ScoreKey;
  from: number;
  to: number;
  delta: number;
}

export interface Factor {
  id: string;
  /** helped = moved a score up, held = moved one down. */
  direction: "helped" | "held";
  kind: "product" | "travel" | "sleep";
  title: string;
  when: string;
  change: Change;
  body: string;
  /** The evidence in short form: what each end of the change compares, and the facts behind it. */
  evidence: { from: string; to: string; facts: string[]; caveat?: string };
  spanId?: string;
}

export interface Note {
  scan: Scan;
  note: string | null;
  tags: string[];
}

export interface Dip {
  scan: Scan;
  change: Change;
  recovered: Scan | null;
  /** A span that overlaps the dip, if one does. */
  during: Span | null;
  notes: Note[];
}

export interface Derived {
  report: SkinReport;
  firstName: string;
  scans: Scan[];
  latest: Scan;
  first: Scan;
  /** The area scanned most. Different areas aren't comparable, so trends use this one. */
  area: string;
  areaScans: Scan[];
  areas: { area: string; count: number }[];
  start: string;
  end: string;
  periodLabel: string;
  isMonthly: boolean;
  tz?: string;
  /** null until there are two scans of the same area. */
  trend: { from: Scan; to: Scan; delta: number; low: Scan; high: Scan } | null;
  changes: Change[];
  isBest: boolean;
  spans: Span[];
  moments: Moment[];
  factors: Factor[];
  notes: Note[];
  dip: Dip | null;
  realPhotos: Scan[];
}

export const byTime = (a: Scan, b: Scan) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime();

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);

function change(key: ScoreKey, a: Scan, b: Scan): Change | null {
  const from = score(a, key);
  const to = score(b, key);
  if (from == null || to == null) return null;
  return { key, from, to, delta: to - from };
}

const biggest = (cs: (Change | null)[]) =>
  cs.filter((c): c is Change => c != null).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null;

const allChanges = (a: Scan, b: Scan) => METRICS.map((m) => change(m.key, a, b));

const sleepOf = (s: Scan) => s.health?.sleepHours ?? s.checkin?.sleepHours ?? null;

function mostCommon<T>(xs: T[]): T | undefined {
  const counts = new Map<T, number>();
  xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function derive(report: SkinReport): Derived | null {
  if (!report.scans.length) return null;

  const scans = [...report.scans].sort(byTime);
  const latest = scans[scans.length - 1];
  const first = scans[0];
  const tz = mostCommon(scans.map(scanTz).filter(Boolean) as string[]);
  const day = (s: Scan) => localDay(s.takenAt, scanTz(s) ?? tz);

  const areaCounts = new Map<string, number>();
  scans.forEach((s) => areaCounts.set(s.area, (areaCounts.get(s.area) ?? 0) + 1));
  const areas = [...areaCounts.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count);
  // Prefer the latest scan's area when it ties for most scanned.
  const area = areas.find((a) => a.area === latest.area && a.count === areas[0].count)?.area ?? areas[0].area;
  const areaScans = scans.filter((s) => s.area === area);

  const start = report.period?.start ?? day(first);
  const end = report.period?.end ?? day(latest);
  const isMonthly = Boolean(report.period);

  // Trend: same area only, first vs latest.
  let trend: Derived["trend"] = null;
  let changes: Change[] = [];
  if (areaScans.length >= 2) {
    const from = areaScans[0];
    const to = areaScans[areaScans.length - 1];
    const sortedByScore = [...areaScans].sort((a, b) => a.scores.overall - b.scores.overall);
    trend = {
      from,
      to,
      delta: to.scores.overall - from.scores.overall,
      low: sortedByScore[0],
      high: sortedByScore[sortedByScore.length - 1],
    };
    changes = allChanges(from, to).filter((c): c is Change => c != null);
  }
  const isBest = trend ? trend.to.scores.overall >= trend.high.scores.overall && trend.to === latest : false;

  // Spans: products, plus trips away from the home city.
  const spans: Span[] = (report.products ?? []).map((p) => ({
    id: p.id,
    kind: "product",
    label: p.name,
    short: shortProduct(p),
    start: p.startDate,
    end: p.endDate ?? end,
    ongoing: p.endDate == null,
    stopped: p.stoppedReason,
    product: p,
  }));

  const home = mostCommon(scans.map((s) => s.location?.city).filter(Boolean) as string[]);
  if (home) {
    let trip: Scan[] = [];
    const flush = () => {
      if (!trip.length) return;
      const city = trip[0].location!.city;
      spans.push({
        id: `trip_${day(trip[0])}`,
        kind: "travel",
        label: `${city} trip`,
        short: city,
        start: day(trip[0]),
        end: day(trip[trip.length - 1]),
        ongoing: false,
      });
      trip = [];
    };
    for (const s of scans) {
      const city = s.location?.city;
      if (city && city !== home && (!trip.length || trip[0].location!.city === city)) trip.push(s);
      else flush();
    }
    flush();
  }
  spans.sort((a, b) => a.start.localeCompare(b.start));

  const moments: Moment[] = scans
    .filter((s) => s.health?.cycleDay === 1)
    .map((s) => ({ id: `period_${s.id}`, kind: "period", day: day(s), label: "Period started" }));

  const notes: Note[] = scans
    .filter((s) => s.annotation && (s.annotation.note || s.annotation.tags.length))
    .map((s) => ({ scan: s, note: s.annotation!.note, tags: s.annotation!.tags }));

  const inSpan = (s: Scan, sp: Span) => day(s) >= sp.start && day(s) <= sp.end;

  // Factors: what lined up with the biggest changes.
  const factors: Factor[] = [];
  for (const sp of spans) {
    if (sp.kind === "product" && sp.product) {
      const before = areaScans.filter((s) => day(s) < sp.start);
      const during = areaScans.filter((s) => inSpan(s, sp));
      const base = before[before.length - 1] ?? (sp.start <= start ? areaScans[0] : undefined);
      const last = during[during.length - 1];
      if (!base || !last || base === last) continue;
      const c =
        sp.product.category === "Moisturizer"
          ? change("hydration", base, last)
          : biggest(allChanges(base, last));
      if (!c || Math.abs(c.delta) < 3) continue;
      const stings = notes.filter((n) => inSpan(n.scan, sp) && n.tags.some((t) => /sting|burn/i.test(t))).length;
      const overlap = spans.find((o) => o.kind === "travel" && o.start <= sp.end && o.end >= sp.start);
      const label = metricMeta(c.key).label.toLowerCase();
      let body: string;
      if (c.delta > 0) {
        const name = capitalize(label);
        body = !sp.ongoing
          ? `${name} rose while you were using it.`
          : sp.start <= start
            ? `${name} has climbed since your first scan, and it’s still in your routine.`
            : `${name} has climbed steadily since you started it.`;
      } else {
        const bits = [
          stings ? `You noted stinging ${stings} ${stings === 1 ? "time" : "times"}` : null,
          sp.ongoing ? null : `stopped on ${fmtDay(sp.end)}`,
        ].filter(Boolean);
        body = bits.length ? `${capitalize(bits.join(" and "))}.` : `${capitalize(label)} dipped while you used it.`;
        if (overlap) body += ` It overlapped your ${overlap.short} trip, so it’s hard to say which did more.`;
      }
      const facts = [c.delta < 0 && stings ? `Stinging noted ${stings}×` : null, !sp.ongoing ? `Stopped ${fmtDay(sp.end)}` : null].filter(
        (x): x is string => x != null,
      );
      factors.push({
        id: sp.id,
        direction: c.delta > 0 ? "helped" : "held",
        kind: "product",
        title: sp.label,
        when: sp.start <= start && sp.ongoing ? "All month" : sp.ongoing ? `Since ${fmtDay(sp.start)}` : fmtRange(sp.start, sp.end),
        change: c,
        body,
        evidence: {
          from: fmtDay(day(base)),
          to: fmtDay(day(last)),
          facts,
          caveat: c.delta < 0 && overlap ? `Overlaps the ${overlap.short} trip, so it’s hard to say which did more.` : undefined,
        },
        spanId: sp.id,
      });
    }
    if (sp.kind === "travel") {
      const during = scans.filter((s) => inSpan(s, sp));
      const before = scans.filter((s) => day(s) < sp.start && day(s) >= addDays(sp.start, -7));
      if (!during.length || !before.length) continue;
      // The metric that fell furthest from the week before to its lowest point away.
      const drops = METRICS.map((m) => {
        const b = avg(before.map((s) => score(s, m.key)).filter((x): x is number => x != null));
        const lows = during.map((s) => score(s, m.key)).filter((x): x is number => x != null);
        if (Number.isNaN(b) || !lows.length) return null;
        const to = Math.min(...lows);
        return { key: m.key, from: Math.round(b), to, delta: to - Math.round(b) } as Change;
      });
      const c = biggest(drops);
      if (!c || c.delta > -3) continue;
      const envAway = during.map((s) => s.location!.environment);
      const envHome = before.map((s) => s.location?.environment).filter(Boolean) as NonNullable<Scan["location"]>["environment"][];
      const humAway = Math.round(avg(envAway.map((e) => e.humidityPct)));
      const humHome = Math.round(avg(envHome.map((e) => e.humidityPct)));
      const uv = Math.max(...envAway.map((e) => e.uvIndexMax));
      factors.push({
        id: sp.id,
        direction: "held",
        kind: "travel",
        title: sp.label,
        when: fmtRange(sp.start, sp.end),
        change: c,
        body: `The air there was much drier, around ${humAway}% humidity against ${humHome}% at home, with UV up to ${uv}.`,
        evidence: {
          from: "Week before",
          to: `Low, ${fmtDay(day(during.reduce((lo, s) => ((score(s, c.key) ?? 101) < (score(lo, c.key) ?? 101) ? s : lo))))}`,
          facts: [`Humidity ${humAway}% vs ${humHome}% at home`, `UV up to ${uv}`],
        },
        spanId: sp.id,
      });
    }
  }

  // Sleep: the last few nights against the few before them (same area, so scores compare).
  const withSleep = areaScans.filter((s) => sleepOf(s) != null);
  if (withSleep.length >= 6) {
    const recent = withSleep.slice(-3);
    const prior = withSleep.slice(-6, -3);
    const sRecent = avg(recent.map((s) => sleepOf(s)!));
    const sPrior = avg(prior.map((s) => sleepOf(s)!));
    if (sPrior - sRecent >= 1) {
      const c = biggest(
        METRICS.map((m) => {
          const a = prior.map((s) => score(s, m.key)).filter((x): x is number => x != null);
          const b = recent.map((s) => score(s, m.key)).filter((x): x is number => x != null);
          if (!a.length || !b.length) return null;
          const from = Math.round(avg(a));
          const to = Math.round(avg(b));
          return { key: m.key, from, to, delta: to - from };
        }).filter((c) => c && c.delta < 0),
      );
      if (c && c.delta <= -3) {
        factors.push({
          id: "sleep",
          direction: "held",
          kind: "sleep",
          title: "Shorter nights",
          when: `Since ${fmtDay(day(recent[0]))}`,
          change: c,
          body: `You’ve averaged ${sRecent.toFixed(1)} hours of sleep lately, down from ${sPrior.toFixed(1)}. ${metricMeta(c.key).label} slipped at the same time.`,
          evidence: {
            from: `${fmtDay(day(prior[0]))}–${fmtDay(day(prior[prior.length - 1]))}`,
            to: `${fmtDay(day(recent[0]))}–${fmtDay(day(recent[recent.length - 1]))}`,
            facts: [`Sleep ${sPrior.toFixed(1)} h → ${sRecent.toFixed(1)} h`],
          },
        });
      }
    }
  }
  factors.sort((a, b) =>
    a.direction === b.direction ? Math.abs(b.change.delta) - Math.abs(a.change.delta) : a.direction === "helped" ? -1 : 1,
  );

  // The dip: the lowest point for the main area, and what was going on.
  let dip: Dip | null = null;
  if (trend && trend.low !== trend.from && trend.low !== trend.to) {
    const low = trend.low;
    const c = biggest(allChanges(trend.from, low).filter((x) => x && x.delta < 0));
    if (c) {
      // Report the metric's own lowest point in the dip, which can land a scan later.
      const after = areaScans.filter((s) => byTime(s, trend!.from) > 0);
      const lowest = Math.min(...after.map((s) => score(s, c.key)).filter((x): x is number => x != null));
      c.to = lowest;
      c.delta = lowest - c.from;
      const metricLow = after.find((s) => score(s, c.key) === lowest) ?? low;
      const lowDay = day(metricLow);
      const pre = trend.from.scores.overall;
      const recovered = areaScans.find((s) => byTime(s, low) > 0 && s.scores.overall >= pre) ?? null;
      const during =
        spans.find((sp) => sp.kind === "travel" && Math.abs(daysBetween(sp.start, lowDay)) <= 3) ??
        spans.find((sp) => sp.kind === "travel" && lowDay >= sp.start && lowDay <= sp.end) ??
        null;
      const windowStart = addDays(lowDay, -4);
      const windowNotes = notes.filter((n) => n.note && day(n.scan) >= windowStart && day(n.scan) <= addDays(lowDay, 2));
      dip = { scan: metricLow, change: c, recovered, during, notes: windowNotes };
    }
  }

  const realPhotos = scans.filter((s) => s.photos);

  return {
    report,
    firstName: report.person.firstName,
    scans,
    latest,
    first,
    area,
    areaScans,
    areas,
    start,
    end,
    periodLabel: fmtRange(start, end),
    isMonthly,
    tz,
    trend,
    changes,
    isBest,
    spans,
    moments,
    factors,
    notes,
    dip,
    realPhotos,
  };
}

// ---------------------------------------------------------------- helpers for views

export const dayOf = (d: Derived, s: Scan) => localDay(s.takenAt, scanTz(s) ?? d.tz);

/** Actives go by their ingredient ("Retinol"); basics by what they are ("Moisturizer"). */
export function shortProduct(p: Product) {
  const ing = p.keyIngredients[0];
  const active = /serum|treatment|exfoliant|peel/i.test(p.category);
  return active && ing && ing.length < 16 ? ing : p.category;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Plain-language read of a single score. */
export function band(value: number | null): { word: string; tone: "good" | "fair" | "low" | "none" } {
  if (value == null) return { word: "Not measured", tone: "none" };
  if (value >= 75) return { word: "Looking good", tone: "good" };
  if (value >= 60) return { word: "Steady", tone: "fair" };
  return { word: "Needs care", tone: "low" };
}

const TIPS: [RegExp, string][] = [
  [/SPF/i, "Wear SPF daily, even when it’s cloudy."],
  [/hot water/i, "Go easy on hot water and strong actives."],
  [/damp/i, "Moisturize while skin is still damp."],
  [/lightweight, oil-free/i, "Try a lightweight, oil-free moisturizer."],
];

/** A tip cut down to the one action in it. */
export function shortTip(tip: string) {
  const hit = TIPS.find(([re]) => re.test(tip));
  if (hit) return hit[1];
  const m = tip.match(/^(an?|the)\s+(.+?)\s+(can|could|may|will|should|might)\s/i);
  return m ? `Try ${m[1].toLowerCase()} ${m[2]}.` : tip;
}

export type FaceRegion = "forehead" | "tzone" | "nose" | "cheeks" | "chin";

const MARKS: [RegExp, FaceRegion, string, "good" | "watch"][] = [
  [/shine.*T-zone/i, "tzone", "T-zone shine", "watch"],
  [/more shine/i, "tzone", "More shine", "watch"],
  [/redness is calm/i, "cheeks", "Redness calm", "good"],
  [/redness, especially around the nose/i, "nose", "Redness by nose", "watch"],
  [/more visible redness/i, "cheeks", "More redness", "watch"],
  [/well hydrated/i, "cheeks", "Well hydrated", "good"],
  [/drier/i, "cheeks", "Drier", "watch"],
  [/patchier/i, "cheeks", "Patchier tone", "watch"],
  [/dark spots/i, "cheeks", "Spots showing", "watch"],
  [/tone looks even/i, "forehead", "Even tone", "good"],
  [/texture looks smooth/i, "forehead", "Smooth texture", "good"],
];

export interface FaceMark {
  region: FaceRegion;
  label: string;
  /** good reads as calm, watch as worth a look. Shown by pattern and label, never colour alone. */
  tone: "good" | "watch";
}

/** One observation as its short label, or as written when we have no label for it. */
export const obsLabel = (o: string) => MARKS.find(([re]) => re.test(o))?.[2] ?? o;

/** What we saw, as short labels pinned to a part of the face. */
export function faceMarks(observations: string[]): FaceMark[] {
  const out: FaceMark[] = [];
  for (const o of observations) {
    const hit = MARKS.find(([re]) => re.test(o));
    if (hit && !out.some((m) => m.region === hit[1])) out.push({ region: hit[1], label: hit[2], tone: hit[3] });
  }
  return out.slice(0, 3);
}

export interface LumiQuestion {
  id: string;
  /** The pattern Lumi noticed, as evidence: a score from → to and when. */
  seen: { key: ScoreKey; from: number; to: number; when: string };
  ask: string;
  answers: [string, string];
}

/**
 * Lumi asks about patterns rather than explaining them: one question per
 * clue, so the person's answer can sharpen the next read. Never diagnoses.
 */
export function lumiQuestions(d: Derived): LumiQuestion[] {
  const qs = d.factors.slice(0, 4).map((f): LumiQuestion => {
    const seen = { key: f.change.key, from: f.change.from, to: f.change.to, when: f.when };
    if (f.kind === "travel")
      return { id: f.id, seen, ask: "Do dry places usually leave your skin like this?", answers: ["Yes, usually", "Not that I’ve noticed"] };
    if (f.kind === "sleep") return { id: f.id, seen, ask: "Have your nights been shorter lately?", answers: ["Yes", "Not really"] };
    const name = f.title.replace(/\s[\d.]+%.*$/, "");
    if (f.direction === "helped")
      return { id: f.id, seen, ask: `Has your skin felt different since you started ${name}?`, answers: ["Yes, it has", "Not yet"] };
    if (/^Since/.test(f.when) || f.when === "All month")
      return { id: f.id, seen, ask: `Is ${name} still part of your routine?`, answers: ["Yes", "I stopped"] };
    return { id: f.id, seen, ask: `Did your skin settle after you stopped ${name}?`, answers: ["Yes, it did", "Not really"] };
  });
  if (!qs.length) {
    const c = d.changes.find((x) => Math.abs(x.delta) >= 3);
    if (c)
      qs.push({
        id: "change",
        seen: { key: c.key, from: c.from, to: c.to, when: d.trend ? `Since ${fmtDay(d.trend.from.takenAt, d.tz)}` : "" },
        ask: "Did anything change in your routine around then?",
        answers: ["Yes", "Nothing new"],
      });
  }
  return qs;
}

export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");

/** One kind sentence answering "is it getting better?" */
export function trendSentence(d: Derived) {
  if (!d.trend) return "This is your starting point. Your next scan starts the line.";
  const { delta, from } = d.trend;
  const since = fmtDay(from.takenAt, scanTz(from) ?? d.tz);
  if (delta >= 3) return `Up ${delta} points since ${since}.`;
  if (delta <= -3) return `Down ${Math.abs(delta)} points since ${since}.`;
  return `Holding steady since ${since}.`;
}

/** Spans active on a given day. */
export const spansOn = (d: Derived, day: string) => d.spans.filter((sp) => day >= sp.start && day <= sp.end);

/** Scans of the same area before this one, for "vs last time". */
export function previousSameArea(d: Derived, scan: Scan) {
  const same = d.scans.filter((s) => s.area === scan.area && byTime(s, scan) < 0);
  return same[same.length - 1] ?? null;
}

// ---------------------------------------------------------------- rhythm

export interface Milestone {
  id: string;
  label: string;
  earned: boolean;
  /** Short progress line for the next one, e.g. "3 to go". */
  hint?: string;
}

export interface Rhythm {
  scans: number;
  /** Days in the period, inclusive. */
  days: number;
  /** One entry per day of the period: how many scans landed on it. */
  calendar: { day: string; count: number }[];
  scanDays: number;
  /** Most consecutive days with a scan. */
  longestRun: number;
  /** Largest gap between two scans, in days. */
  longestGap: number;
  weeks: number;
  weeksWithScan: number;
  tone: "devoted" | "steady" | "building" | "starting";
  title: string;
  body: string;
  milestones: Milestone[];
}

const COUNT_MILESTONES = [
  { n: 1, label: "First scan" },
  { n: 10, label: "10 scans" },
  { n: 25, label: "25 scans" },
  { n: 50, label: "50 scans" },
];

/**
 * How regularly someone shows up, and what a kind big sister would say
 * about it. Never guilt: sparse scanning gets a tip, not a telling-off.
 */
export function rhythm(d: Derived): Rhythm {
  const counts = new Map<string, number>();
  d.scans.forEach((s) => counts.set(dayOf(d, s), (counts.get(dayOf(d, s)) ?? 0) + 1));
  const days = daysBetween(d.start, d.end) + 1;
  const calendar = Array.from({ length: days }, (_, i) => {
    const day = addDays(d.start, i);
    return { day, count: counts.get(day) ?? 0 };
  });
  const scanDays = calendar.filter((c) => c.count).length;

  let longestRun = 0;
  let run = 0;
  calendar.forEach((c) => {
    run = c.count ? run + 1 : 0;
    longestRun = Math.max(longestRun, run);
  });
  const sortedDays = [...counts.keys()].sort();
  let longestGap = 0;
  for (let i = 1; i < sortedDays.length; i++) longestGap = Math.max(longestGap, daysBetween(sortedDays[i - 1], sortedDays[i]));

  const weeks = Math.ceil(days / 7);
  const weeksWithScan = new Set(calendar.filter((c) => c.count).map((c) => Math.floor(daysBetween(d.start, c.day) / 7))).size;
  const scans = d.scans.length;

  let tone: Rhythm["tone"];
  let title: string;
  let body: string;
  if (scans === 1) {
    tone = "starting";
    title = "Day one, done";
    body = "The first scan is the hardest one, and you did it. Scan again in two or three days and your story starts.";
  } else if (longestGap <= 2 && scanDays / days >= 0.6) {
    tone = "devoted";
    title = "You showed up for your skin";
    body = `${scanDays} of ${days} days, and never more than ${longestGap} days apart. That rhythm is exactly why we could spot what changed. Proud of you.`;
  } else if (weeksWithScan === weeks) {
    tone = "steady";
    title = `${weeks} weeks, not one missed`;
    body = "Every few days is the sweet spot, and you’ve been right in it. That’s how the real trends show up.";
  } else {
    tone = "building";
    title = "Little and often wins";
    body = `Your scans have been up to ${longestGap} days apart. Once a week, say Sunday night, is enough to make your picture much clearer.`;
  }

  // The highest count reached, any streak worth naming, then the next goal so
  // there's always something to reach for.
  const shown: Milestone[] = [];
  const reached = [...COUNT_MILESTONES].reverse().find((m) => scans >= m.n);
  if (reached) shown.push({ id: `n${reached.n}`, label: reached.label, earned: true });
  if (weeks >= 3 && weeksWithScan === weeks) shown.push({ id: "weeks", label: "Every week", earned: true });
  if (longestRun >= 5) shown.push({ id: "run", label: `${longestRun}-day streak`, earned: true });
  const next = COUNT_MILESTONES.find((m) => scans < m.n);
  if (next) shown.push({ id: `n${next.n}`, label: next.label, earned: false, hint: `${next.n - scans} to go` });

  return { scans, days, calendar, scanDays, longestRun, longestGap, weeks, weeksWithScan, tone, title, body, milestones: shown };
}
