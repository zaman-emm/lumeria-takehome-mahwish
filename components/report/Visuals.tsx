"use client";

import { useId, type CSSProperties } from "react";
import { fmtDay, type FaceMark, type FaceRegion, type Milestone, type Rhythm, type ScoreKey } from "@/lib/insights";
import v from "./visuals.module.css";

// Small visual vocabulary shared by the report: icons, score rings, tick bars,
// the face map, milestone badges and the scan-rhythm strip.

const PATHS: Record<string, string> = {
  close: "M4 4l8 8M12 4l-8 8",
  play: "M5.5 3.5v9l7-4.5z",
  chevronL: "M10 3L5 8l5 5",
  chevronR: "M6 3l5 5-5 5",
  up: "M8 13V3M4 7l4-4 4 4",
  down: "M8 3v10M4 9l4 4 4-4",
  hydration: "M8 2.5C8 2.5 3.5 7.2 3.5 10a4.5 4.5 0 009 0C12.5 7.2 8 2.5 8 2.5z",
  evenness: "M8 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM8 2.5v11",
  redness: "M3 13c0-5.5 4-9.5 10-10-.5 6-4.5 10-10 10zM3 13l5.5-5.5",
  pigmentation: "M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2",
  oiliness: "M8 3.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM8 1v1.2M8 13.8V15M1 8h1.2M13.8 8H15",
  radiance:
    "M8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9",
  pores: "M4.5 4.5h.01M8 3.5h.01M11.5 4.5h.01M3.5 8h.01M8 8h.01M12.5 8h.01M4.5 11.5h.01M8 12.5h.01M11.5 11.5h.01",
  spots: "M5.5 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM11 7.5a2 2 0 100 4 2 2 0 000-4zM5 11.5a1 1 0 100 2 1 1 0 000-2z",
  overall: "M8 2l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.4l-3.7 2.1.8-4.2L2 6.4l4.2-.5z",
  product: "M6 2h4v2.5l1.5 1.5V14h-7V6L6 4.5zM4.5 8.5h7",
  travel: "M2 9.5l12-4-1-1.5-4 1L5 2.5 4 3l2.5 3.5-3 1L2 6.5l-.5.5zM2 13.5h12",
  sleep: "M12.5 9.5A5 5 0 016.5 3.5a5 5 0 106 6z",
  period: "M8 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM8 5.5v5M5.5 8h5",
  climate:
    "M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M8 5a3 3 0 100 6 3 3 0 000-6z",
  food: "M2.5 7.5h11a5.5 5.5 0 01-11 0zM6 5c0-1 1-1.5 1-2.5M9 5c0-1 1-1.5 1-2.5",
  lock: "M4.5 7.5h7v6h-7zM6 7.5V5.5a2 2 0 014 0v2",
  calendar: "M2.5 4h11v9.5h-11zM2.5 7h11M5.5 2.5v3M10.5 2.5v3",
  camera: "M2 5h3l1.5-2h3L11 5h3v8H2zM8 6.8a2.6 2.6 0 100 5.2 2.6 2.6 0 000-5.2z",
  trend: "M2 12l4-4 3 2.5L14 4M10.5 4H14v3.5",
  glance: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  check: "M3.5 8.5l3 3 6-7",
  spark: "M8 1.5l1.4 4.1 4.1 1.4-4.1 1.4L8 12.5 6.6 8.4 2.5 7l4.1-1.4z",
  clock: "M8 2a6 6 0 100 12A6 6 0 008 2zM8 4.8V8l2.2 1.6",
  target: "M8 2a6 6 0 100 12A6 6 0 008 2zM8 5a3 3 0 100 6 3 3 0 000-6zM8 7.6v.8",
  grid: "M2.5 2.5h3v3h-3zM6.5 2.5h3v3h-3zM10.5 2.5h3v3h-3zM2.5 6.5h3v3h-3zM6.5 6.5h3v3h-3zM10.5 6.5h3v3h-3zM2.5 10.5h3v3h-3zM6.5 10.5h3v3h-3zM10.5 10.5h3v3h-3z",
  large: "M2.5 2.5h11v8h-11zM2.5 13h11",
};

export type IconName = keyof typeof PATHS | ScoreKey;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden>
      <path
        d={PATHS[name] ?? PATHS.overall}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A score as a ring. Fuller ring, healthier skin. */
export function Gauge({
  value,
  size = 58,
  delay = 0,
  tone = "light",
}: {
  value: number | null;
  size?: number;
  delay?: number;
  tone?: "light" | "dark";
}) {
  const r = 24;
  return (
    <span className={v.gauge} data-tone={tone} style={{ width: size, height: size } as CSSProperties}>
      <svg viewBox="0 0 56 56" width={size} height={size} aria-hidden>
        <circle cx="28" cy="28" r={r} className={v.gTrack} />
        {value != null && (
          <circle
            cx="28"
            cy="28"
            r={r}
            className={v.gValue}
            pathLength={100}
            strokeDasharray="100"
            style={
              {
                "--off": 100 - value,
                animationDelay: `${delay}ms`,
              } as CSSProperties
            }
            transform="rotate(-90 28 28)"
          />
        )}
      </svg>
      <b>{value ?? "–"}</b>
    </span>
  );
}

export function Badge({ m, tone = "light" }: { m: Milestone; tone?: "light" | "dark" }) {
  return (
    <span className={v.badge} data-earned={m.earned} data-tone={tone}>
      <span className={v.badgeMark}>
        <Icon name={m.earned ? (m.id === "run" ? "spark" : m.id === "weeks" ? "calendar" : "check") : "lock"} size={12} />
      </span>
      <span>
        {m.label}
        {m.hint && <small>{m.hint}</small>}
      </span>
    </span>
  );
}

/** Every day of the period as a dot: filled on scan days, ringed on double days. */
export function RhythmStrip({ r, tone = "light" }: { r: Rhythm; tone?: "light" | "dark" }) {
  const long = r.calendar.length > 35;
  if (long) {
    // Contribution grid: a column per week, so long periods still fit.
    const weeks = Math.ceil(r.calendar.length / 7);
    return (
      <div
        className={v.grid}
        data-tone={tone}
        style={{ "--w": weeks } as CSSProperties}
        role="img"
        aria-label={`${r.scanDays} scan days out of ${r.days}`}
      >
        {r.calendar.map((c, i) => (
          <i key={c.day} data-n={Math.min(c.count, 2)} style={{ "--d": `${Math.floor(i / 7) * 40}ms` } as CSSProperties} />
        ))}
      </div>
    );
  }
  return (
    <div className={v.strip} data-tone={tone}>
      <div className={v.dots} role="img" aria-label={`${r.scanDays} scan days out of ${r.days}`}>
        {r.calendar.map((c, i) => (
          <i key={c.day} data-n={Math.min(c.count, 2)} style={{ "--d": `${i * 22}ms` } as CSSProperties} />
        ))}
      </div>
      <div className={v.stripAxis}>
        <span>{fmtDay(r.calendar[0].day)}</span>
        <span>{fmtDay(r.calendar[r.calendar.length - 1].day)}</span>
      </div>
    </div>
  );
}

/**
 * A score as a row of ticks, one per five points. Gaps sit where the bands
 * change (60 and 75), so where a score falls reads without a word. The tallest
 * tick is now; the dot underneath marks the last scan of the same spot.
 */
export function TickBar({ value, prev }: { value: number | null; prev?: number | null }) {
  const on = value == null ? 0 : Math.max(1, Math.round(value / 5));
  const was = prev == null ? -1 : Math.max(1, Math.round(prev / 5)) - 1;
  return (
    <span className={v.ticks} aria-hidden>
      {Array.from({ length: 20 }, (_, i) => (
        <i
          key={i}
          data-on={i < on}
          data-now={i === on - 1}
          data-was={i === was}
          data-gap={i === 12 || i === 15}
          style={{ "--d": `${i * 16}ms` } as CSSProperties}
        />
      ))}
    </span>
  );
}

/** The scale under a column of tick bars: where the band edges fall. */
export function TickAxis() {
  return (
    <span className={v.tickAxis} aria-hidden>
      <span>0</span>
      <span style={{ left: "60%" }}>60</span>
      <span style={{ left: "75%" }}>75</span>
      <span style={{ left: "100%" }}>100</span>
    </span>
  );
}

// Face map geometry, in a 320 x 168 box: the face on the left, labels on the right.
const REGION_SHAPES: Record<FaceRegion, string> = {
  forehead: "M40 46a30 12 0 1060 0a30 12 0 10-60 0z",
  tzone: "M38 37h64v15H79v50H61V52H38z",
  nose: "M60 100a10 11 0 1020 0a10 11 0 10-20 0z",
  cheeks: "M25 110a15 15 0 1030 0a15 15 0 10-30 0zM85 110a15 15 0 1030 0a15 15 0 10-30 0z",
  chin: "M52 146a18 9 0 1036 0a18 9 0 10-36 0z",
};
const ANCHORS: Record<FaceRegion, [number, number]> = {
  forehead: [86, 44],
  tzone: [100, 44],
  nose: [78, 100],
  cheeks: [104, 110],
  chin: [86, 146],
};
/** Body areas we can point at on the face. Left and right are the person's own, so they mirror. */
const AREA_SPOTS: [RegExp, number, number][] = [
  [/left cheek/i, 100, 110],
  [/right cheek/i, 40, 110],
  [/left jaw/i, 104, 134],
  [/right jaw/i, 36, 134],
  [/forehead/i, 70, 46],
  [/chin/i, 70, 146],
  [/nose/i, 70, 100],
];
export const onFace = (area: string) => AREA_SPOTS.some(([re]) => re.test(area));

/**
 * What we saw, drawn on a face: each note is a short label on the zone it's
 * about, filled with a pattern (dots for calm, hatching for worth a look) so it
 * never leans on colour alone. A dashed ring marks the spot that was scanned.
 */
export function FaceMap({ marks, area }: { marks: FaceMark[]; area: string }) {
  const id = useId().replace(/:/g, "");
  const spot = AREA_SPOTS.find(([re]) => re.test(area));
  // Labels follow their zones top to bottom, nudged apart so none overlap.
  const placed = [...marks]
    .sort((a, b) => ANCHORS[a.region][1] - ANCHORS[b.region][1])
    .reduce<(FaceMark & { y: number })[]>((acc, m) => {
      const prevY = acc.length ? acc[acc.length - 1].y : -Infinity;
      acc.push({ ...m, y: Math.max(ANCHORS[m.region][1], prevY + 34) });
      return acc;
    }, []);
  const fill = (tone: FaceMark["tone"]) => `url(#${id}-${tone})`;

  return (
    <figure className={v.face}>
      <svg viewBox="0 14 320 154" role="img" aria-label={`${marks.map((m) => m.label).join(", ")}. Scanned: ${area}.`}>
        <defs>
          <pattern id={`${id}-good`} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" className={v.fGoodBg} />
            <circle cx="3" cy="3" r="1.3" className={v.fGoodInk} />
          </pattern>
          <pattern id={`${id}-watch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" className={v.fWatchBg} />
            <line x1="1" y1="0" x2="1" y2="5" className={v.fWatchInk} />
          </pattern>
        </defs>
        <path className={v.fHead} d="M70 20c34 0 50 30 50 66 0 42-24 72-50 72S20 128 20 86c0-36 16-66 50-66z" />
        {marks.map((m) => (
          <path key={m.region} d={REGION_SHAPES[m.region]} fill={fill(m.tone)} className={v.fZone} />
        ))}
        <path className={v.fLine} d="M45 80q8-5 16 0M79 80q8-5 16 0M70 86v20q-3 3-7 2M59 128q11 7 22 0" />
        {spot && <circle cx={spot[1]} cy={spot[2]} r="19" className={v.fSpot} />}
        {placed.map((m) => {
          const [ax, ay] = ANCHORS[m.region];
          return (
            <g key={m.region}>
              <path className={v.fLeader} d={`M${ax} ${ay}L140 ${m.y}H152`} />
              <circle cx={ax} cy={ay} r="3" className={v.fPin} />
              <rect x="158" y={m.y - 7} width="14" height="14" rx="3" fill={fill(m.tone)} className={v.fSwatch} />
              <text x="180" y={m.y} dominantBaseline="central" className={v.fLabel}>
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
      {spot && (
        <figcaption>
          <i className={v.fSpotKey} aria-hidden />
          Scanned: {area}
        </figcaption>
      )}
    </figure>
  );
}
