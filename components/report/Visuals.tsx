"use client";

import type { CSSProperties } from "react";
import { fmtDay, type Milestone, type Rhythm, type ScoreKey } from "@/lib/insights";
import v from "./visuals.module.css";

// Small visual vocabulary shared by the report: icons, score rings,
// milestone badges and the scan-rhythm strip.

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
  radiance: "M8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9",
  pores: "M4.5 4.5h.01M8 3.5h.01M11.5 4.5h.01M3.5 8h.01M8 8h.01M12.5 8h.01M4.5 11.5h.01M8 12.5h.01M11.5 11.5h.01",
  spots: "M5.5 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM11 7.5a2 2 0 100 4 2 2 0 000-4zM5 11.5a1 1 0 100 2 1 1 0 000-2z",
  overall: "M8 2l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.4l-3.7 2.1.8-4.2L2 6.4l4.2-.5z",
  product: "M6 2h4v2.5l1.5 1.5V14h-7V6L6 4.5zM4.5 8.5h7",
  travel: "M2 9.5l12-4-1-1.5-4 1L5 2.5 4 3l2.5 3.5-3 1L2 6.5l-.5.5zM2 13.5h12",
  sleep: "M12.5 9.5A5 5 0 016.5 3.5a5 5 0 106 6z",
  period: "M8 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM8 5.5v5M5.5 8h5",
  climate: "M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M8 5a3 3 0 100 6 3 3 0 000-6z",
  food: "M2.5 7.5h11a5.5 5.5 0 01-11 0zM6 5c0-1 1-1.5 1-2.5M9 5c0-1 1-1.5 1-2.5",
  lock: "M4.5 7.5h7v6h-7zM6 7.5V5.5a2 2 0 014 0v2",
  calendar: "M2.5 4h11v9.5h-11zM2.5 7h11M5.5 2.5v3M10.5 2.5v3",
  camera: "M2 5h3l1.5-2h3L11 5h3v8H2zM8 6.8a2.6 2.6 0 100 5.2 2.6 2.6 0 000-5.2z",
  trend: "M2 12l4-4 3 2.5L14 4M10.5 4H14v3.5",
  glance: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  check: "M3.5 8.5l3 3 6-7",
  spark: "M8 1.5l1.4 4.1 4.1 1.4-4.1 1.4L8 12.5 6.6 8.4 2.5 7l4.1-1.4z",
};

export type IconName = keyof typeof PATHS | ScoreKey;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden>
      <path d={PATHS[name] ?? PATHS.overall} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
            style={{ "--off": 100 - value, animationDelay: `${delay}ms` } as CSSProperties}
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
