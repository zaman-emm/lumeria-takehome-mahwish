"use client";

import { useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { area, curveMonotoneX, line } from "d3-shape";
import type { RevealState } from "./hooks";
import { useWidth } from "./hooks";
import { Icon } from "./Icon";
import c from "./curve.module.css";

// A score across the period as one smooth curve. Products sit on soft bands
// in their colour and trips on hatched ones; when one band is in focus the
// line wears its colour only there. Pins at the top of each band can be
// tapped for its name, and dragging along the curve reads any scan day.

export interface CurvePoint {
  /** Day index from the start of the period. */
  i: number;
  value: number;
  label: string;
}

export interface CurveBand {
  id: string;
  from: number;
  to: number;
  kind: "product" | "trip";
  tone: "helped" | "held" | "neutral";
  /** What a tapped pin says, e.g. "Retinol 0.3% Night Serum · Sep 30–Oct 11". */
  label?: string;
}

type Tone = "helped" | "held" | "neutral";

// A light tap of the motor as the reading moves to a new scan, where the
// phone supports it.
export function tick() {
  try {
    navigator.vibrate?.(4);
  } catch {}
}

const PAD_X = 6;
const PAD_TOP = 10;
const PAD_BOTTOM = 8;

export function DayCurve({
  days,
  points,
  bands = [],
  focus,
  pins = false,
  marks,
  values = false,
  tone,
  label,
  height = 84,
  reveal = "done",
}: {
  /** How many days the period spans. */
  days: number;
  points: CurvePoint[];
  bands?: CurveBand[];
  /** The band whose days the line wears its colour on. Without one, the whole line does. */
  focus?: string;
  /** Pin every band, not only trips. */
  pins?: boolean;
  /** Day indexes of the "was" and "now" dots. */
  marks?: { from?: number; to?: number };
  /** Print the score beside the "was" and "now" dots. */
  values?: boolean;
  tone: Tone;
  label: string;
  height?: number;
  reveal?: RevealState;
}) {
  const id = useId().replace(/:/g, "");
  const H = height;
  const [box, w] = useWidth<HTMLDivElement>();
  const [at, setAt] = useState<CurvePoint | null>(null);
  const [pinned, setPinned] = useState<CurveBand | null>(null);
  const finger = useRef<number | null>(null);

  const { x, y, path, fill } = useMemo(() => {
    const vs = points.map((p) => p.value);
    const lo = Math.floor((Math.min(...vs) - 4) / 5) * 5;
    const hi = Math.ceil((Math.max(...vs) + 4) / 5) * 5;
    const x = (i: number) => PAD_X + (i / Math.max(1, days - 1)) * Math.max(0, w - PAD_X * 2);
    const y = (v: number) => PAD_TOP + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - PAD_TOP - PAD_BOTTOM);
    const path = line<CurvePoint>()
      .x((p) => x(p.i))
      .y((p) => y(p.value))
      .curve(curveMonotoneX)(points);
    const fill = area<CurvePoint>()
      .x((p) => x(p.i))
      .y0(H)
      .y1((p) => y(p.value))
      .curve(curveMonotoneX)(points);
    return { x, y, path: path ?? "", fill: fill ?? "" };
  }, [points, days, w, H]);

  // A band that covers the whole period needs no shading: the line says it.
  const shown = bands.filter((b) => !(b.from <= 0 && b.to >= days - 1));
  const lit = bands.find((b) => b.id === focus);
  const bandX = (b: CurveBand) => ({ left: x(b.from) - 4, width: x(b.to) - x(b.from) + 8 });
  const dot = (i?: number) => points.find((p) => p.i === i);
  const from = dot(marks?.from);
  const to = dot(marks?.to);
  const pinsShown = shown.filter((b) => pins || b.kind === "trip");

  // Nearest scan day to the finger.
  const read = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = points[0];
    for (const p of points) if (Math.abs(x(p.i) - px) < Math.abs(x(best.i) - px)) best = p;
    setPinned(null);
    if (best !== at) {
      setAt(best);
      if (e.pointerType !== "mouse") tick();
    }
  };
  const lift = (e: PointerEvent<HTMLDivElement>) => {
    if (finger.current === e.pointerId) finger.current = null;
    if (e.pointerType !== "mouse") setAt(null);
  };
  const step = (by: number) => {
    const k = at ? points.indexOf(at) : by > 0 ? -1 : points.length;
    const next = points[Math.max(0, Math.min(points.length - 1, k + by))];
    setPinned(null);
    setAt(next);
  };
  // The pill centres on its day or band, kept inside the chart by half its width.
  const pillText = at ? `${at.label} · ${at.value}` : (pinned?.label ?? "");
  const half = pillText.length * 3.4 + 12;
  const pillAt = Math.max(half, Math.min(w - half, at ? x(at.i) : pinned ? x((pinned.from + pinned.to) / 2) : 0));

  return (
    <div
      ref={box}
      className={c.curve}
      data-tone={tone}
      data-focus={Boolean(lit)}
      data-reveal={reveal}
      style={{ height: H } as CSSProperties}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, points.length - 1)}
      aria-valuenow={at ? points.indexOf(at) : points.length - 1}
      aria-valuetext={at ? `${at.label}: ${at.value}` : undefined}
      onPointerDown={(e) => {
        if (finger.current != null) return;
        finger.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        read(e);
      }}
      onPointerMove={(e) => (e.pointerType === "mouse" || finger.current === e.pointerId ? read(e) : undefined)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setAt(null)}
      onPointerUp={lift}
      onPointerCancel={lift}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") step(-1);
        if (e.key === "ArrowRight") step(1);
        if (e.key === "Escape") setAt(null);
      }}
      onBlur={() => setAt(null)}
    >
      {w > 0 && points.length > 1 && (
        <>
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden>
            <defs>
              <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className={c.washTop} />
                <stop offset="1" className={c.washEnd} />
              </linearGradient>
              <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" className={c.hatchBg} />
                <line x1="0" y1="0" x2="0" y2="6" className={c.hatchLine} />
              </pattern>
              {lit && (
                <clipPath id={`${id}-in`}>
                  <rect x={x(lit.from)} y={0} width={Math.max(0, x(lit.to) - x(lit.from))} height={H} />
                </clipPath>
              )}
            </defs>

            {shown
              .filter((b) => b.kind === "product")
              .map((b) => (
                <rect key={b.id} className={c.band} data-tone={b.tone} x={bandX(b).left} y={0} width={bandX(b).width} height={H} rx={10} />
              ))}
            {shown
              .filter((b) => b.kind === "trip")
              .map((b) => (
                <rect key={b.id} className={c.trip} x={bandX(b).left} y={0} width={bandX(b).width} height={H} rx={10} fill={`url(#${id}-hatch)`} />
              ))}

            <path className={c.fill} d={fill} fill={`url(#${id}-wash)`} clipPath={lit ? `url(#${id}-in)` : undefined} />
            {lit && <path className={c.rest} d={path} pathLength={1} />}
            <path className={c.line} d={path} pathLength={1} clipPath={lit ? `url(#${id}-in)` : undefined} />

            {from && <circle className={c.from} cx={x(from.i)} cy={y(from.value)} r={4} />}
            {to && <circle className={c.to} cx={x(to.i)} cy={y(to.value)} r={4.5} />}

            {at && (
              <g className={c.scrub}>
                <line x1={x(at.i)} x2={x(at.i)} y1={0} y2={H} />
                <circle cx={x(at.i)} cy={y(at.value)} r={4.5} />
              </g>
            )}
          </svg>

          {pinsShown.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={c.pin}
              data-tone={b.kind === "trip" ? "trip" : b.tone}
              data-on={pinned?.id === b.id}
              style={{ left: x(b.from + Math.min(2, (b.to - b.from) / 2)), "--i": i } as CSSProperties}
              aria-label={b.label ?? b.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setAt(null);
                setPinned((p) => (p?.id === b.id ? null : b));
              }}
            >
              <Icon name={b.kind === "trip" ? "plane" : "bottle"} size={12} />
            </button>
          ))}

          {values &&
            [from, to].map(
              (pt, k) =>
                pt && (
                  <span key={k} className={c.value} data-end={k === 1} style={{ left: x(pt.i), top: y(pt.value) } as CSSProperties} aria-hidden>
                    {pt.value}
                  </span>
                ),
            )}

          {(at || pinned?.label) && (
            <span className={c.pill} style={{ left: pillAt } as CSSProperties} aria-live="polite">
              {at ? (
                <>
                  {at.label} · <b>{at.value}</b>
                </>
              ) : (
                pinned?.label
              )}
            </span>
          )}
        </>
      )}
    </div>
  );
}
