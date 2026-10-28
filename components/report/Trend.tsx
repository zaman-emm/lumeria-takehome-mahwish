"use client";

import { useId } from "react";
import { dayOf, fmtDay, scanTz, score, type Derived, type ScoreKey, type Span } from "@/lib/insights";
import type { Scan } from "@/lib/types";

/**
 * A single-series line for one area. Thin 2px line, 10% wash, ringed end dots,
 * labels only on the start, the end and the low point. Draws itself once.
 */
export function Trend({
  d,
  scans,
  metric = "overall",
  band,
  tone = "light",
  height = 176,
  draw = true,
  className,
}: {
  d: Derived;
  scans: Scan[];
  metric?: ScoreKey;
  band?: Span | null;
  tone?: "light" | "dark";
  height?: number;
  draw?: boolean;
  className?: string;
}) {
  const gid = useId();
  const W = 335;
  const H = height;
  const padT = 26;
  const padB = 30;
  const padX = 14;

  const pts = scans
    .map((s) => ({ s, t: new Date(s.takenAt).getTime(), v: score(s, metric) }))
    .filter((p): p is { s: Scan; t: number; v: number } => p.v != null);
  if (pts.length < 2) return null;

  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const vs = pts.map((p) => p.v);
  const lo = Math.max(0, Math.min(...vs) - 8);
  const hi = Math.min(100, Math.max(...vs) + 6);
  const x = (t: number) => padX + ((t - t0) / (t1 - t0 || 1)) * (W - padX * 2);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
  const dayX = (day: string) => x(new Date(`${day}T12:00:00Z`).getTime());

  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const area = `${line}L${x(t1).toFixed(1)},${H - padB}L${x(t0).toFixed(1)},${H - padB}Z`;

  const first = pts[0];
  const last = pts[pts.length - 1];
  const low = pts.reduce((m, p) => (p.v < m.v ? p : m), pts[0]);
  const showLow = low !== first && low !== last;

  const ink = tone === "dark" ? "var(--bone)" : "var(--bark)";
  const mute = tone === "dark" ? "rgba(244,239,230,.55)" : "var(--bark-3)";
  const stroke = tone === "dark" ? "var(--bronze)" : "var(--forest)";
  const surface = tone === "dark" ? "var(--evergreen)" : "var(--bone)";
  const grid = tone === "dark" ? "rgba(244,239,230,.12)" : "rgba(46,38,32,.1)";

  const label = (p: typeof first, anchor: "start" | "end" | "middle", below = false, big = false) => (
    <text
      x={x(p.t)}
      y={below ? y(p.v) + 20 : y(p.v) - 11}
      textAnchor={anchor}
      fill={ink}
      fontSize={big ? 15 : 12}
      fontWeight={big ? 600 : 500}
    >
      {p.v}
    </text>
  );

  let bandEl = null;
  if (band) {
    const bx0 = Math.max(padX, dayX(band.start) - 6);
    const bx1 = Math.min(W - padX, dayX(band.end) + 6);
    bandEl = (
      <g>
        <rect x={bx0} y={padT - 14} width={Math.max(8, bx1 - bx0)} height={H - padT - padB + 14} rx={6} fill="var(--clay)" opacity={0.14} />
        <text x={(bx0 + bx1) / 2} y={padT - 18} textAnchor="middle" fill={mute} fontSize={10} fontWeight={600} letterSpacing=".1em">
          {band.short.toUpperCase()}
        </text>
      </g>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className={className}
      role="img"
      aria-label={`Line chart, ${first.v} on ${fmtDay(first.s.takenAt, scanTz(first.s) ?? d.tz)} to ${last.v} on ${fmtDay(last.s.takenAt, scanTz(last.s) ?? d.tz)}, lowest ${low.v}.`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity={0.16} />
          <stop offset="1" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={padX} x2={W - padX} y1={H - padB} y2={H - padB} stroke={grid} strokeWidth={1} />
      {bandEl}
      <path d={area} fill={`url(#${gid})`} style={draw ? { animation: "trendFade 900ms 500ms var(--ease-out) both" } : undefined} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={draw ? 1 : undefined}
        style={draw ? { animation: "trendDraw 1100ms 150ms var(--ease-in-out) both" } : undefined}
      />
      {[first, ...(showLow ? [low] : []), last].map((p) => (
        <circle
          key={p.s.id}
          cx={x(p.t)}
          cy={y(p.v)}
          r={p === last ? 5 : 4}
          fill={p === low && showLow ? "var(--clay)" : stroke}
          stroke={surface}
          strokeWidth={2}
          style={draw ? { animation: "trendFade 300ms 1100ms var(--ease-out) both" } : undefined}
        />
      ))}
      {label(first, "start")}
      {showLow && label(low, "middle", true)}
      {label(last, "end", false, true)}
      <text x={padX} y={H - 8} fill={mute} fontSize={11}>
        {fmtDay(dayOf(d, first.s))}
      </text>
      <text x={W - padX} y={H - 8} fill={mute} fontSize={11} textAnchor="end">
        {fmtDay(dayOf(d, last.s))}
      </text>
      {showLow && (
        <text x={x(low.t)} y={H - 8} fill={mute} fontSize={11} textAnchor="middle">
          {fmtDay(dayOf(d, low.s))}
        </text>
      )}
    </svg>
  );
}
