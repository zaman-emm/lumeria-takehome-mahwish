"use client";

import { useId, useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import { area, curveMonotoneX, line } from "d3-shape";
import type { RevealState } from "./hooks";
import { useWidth } from "./hooks";
import { Icon } from "./Icon";
import c from "./curve.module.css";

// A score across the period as one smooth curve. The product's own days sit
// on a soft band and carry its colour; a trip that may share the blame shows
// as a hatched band with a plane. Drag along it to read any scan day.

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
}

const H = 84;
const PAD_X = 6;
const PAD_TOP = 10;
const PAD_BOTTOM = 8;

export function DayCurve({
  days,
  points,
  band,
  trips = [],
  marks,
  tone,
  label,
  reveal = "done",
}: {
  /** How many days the period spans. */
  days: number;
  points: CurvePoint[];
  band?: CurveBand;
  trips?: CurveBand[];
  /** Day indexes of the "was" and "now" dots. */
  marks?: { from?: number; to?: number };
  tone: "helped" | "held" | "neutral";
  label: string;
  reveal?: RevealState;
}) {
  const id = useId().replace(/:/g, "");
  const [box, w] = useWidth<HTMLDivElement>();
  const [at, setAt] = useState<CurvePoint | null>(null);

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
  }, [points, days, w]);

  // A product used all period needs no band: the whole line wears its colour.
  const whole = band != null && band.from <= 0 && band.to >= days - 1;
  const bandX = (b: CurveBand) => ({ left: x(b.from) - 4, width: x(b.to) - x(b.from) + 8 });
  const dot = (i?: number) => points.find((p) => p.i === i);
  const from = dot(marks?.from);
  const to = dot(marks?.to);

  // Nearest scan day to the finger.
  const read = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = points[0];
    for (const p of points) if (Math.abs(x(p.i) - px) < Math.abs(x(best.i) - px)) best = p;
    setAt(best);
  };

  return (
    <div
      ref={box}
      className={c.curve}
      data-tone={tone}
      data-reveal={reveal}
      role="img"
      aria-label={label}
      onPointerDown={read}
      onPointerMove={(e) => (e.pointerType === "mouse" || e.buttons ? read(e) : undefined)}
      onPointerLeave={() => setAt(null)}
      onPointerUp={(e) => e.pointerType !== "mouse" && setAt(null)}
      onPointerCancel={() => setAt(null)}
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
              {band && (
                <clipPath id={`${id}-in`}>
                  <rect x={x(band.from)} y={0} width={Math.max(0, x(band.to) - x(band.from))} height={H} />
                </clipPath>
              )}
            </defs>

            {band && !whole && <rect className={c.band} x={bandX(band).left} y={0} width={bandX(band).width} height={H} rx={10} />}
            {trips.map((t) => (
              <rect key={t.id} className={c.trip} x={bandX(t).left} y={0} width={bandX(t).width} height={H} rx={10} fill={`url(#${id}-hatch)`} />
            ))}

            <path className={c.fill} d={fill} fill={`url(#${id}-wash)`} clipPath={band ? `url(#${id}-in)` : undefined} />
            <path className={c.rest} d={path} pathLength={1} />
            {band && <path className={c.line} d={path} pathLength={1} clipPath={`url(#${id}-in)`} />}

            {from && <circle className={c.from} cx={x(from.i)} cy={y(from.value)} r={4} />}
            {to && <circle className={c.to} cx={x(to.i)} cy={y(to.value)} r={4.5} />}

            {at && (
              <g className={c.scrub}>
                <line x1={x(at.i)} x2={x(at.i)} y1={0} y2={H} />
                <circle cx={x(at.i)} cy={y(at.value)} r={4.5} />
              </g>
            )}
          </svg>

          {trips.map((t) => (
            <span key={t.id} className={c.plane} style={{ left: x((t.from + t.to) / 2) } as CSSProperties} aria-hidden>
              <Icon name="plane" size={12} />
            </span>
          ))}

          {at && (
            <span className={c.pill} style={{ left: Math.max(36, Math.min(w - 36, x(at.i))) } as CSSProperties} aria-hidden>
              {at.label} · <b>{at.value}</b>
            </span>
          )}
        </>
      )}
    </div>
  );
}
