"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { area as d3area, curveMonotoneX, line as d3line } from "d3-shape";
import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "motion/react";
import {
  METRICS,
  OVERALL,
  daysBetween,
  dayOf,
  fmtDay,
  fmtRange,
  fmtTime,
  metricMeta,
  previousSameArea,
  scanTz,
  score,
  type Derived,
  type ScoreKey,
} from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { useReportApi } from "./context";
import { useReveal, useWidth } from "./hooks";
import { Icon } from "./Icon";
import { NoteCard } from "./notes";
import { ChangeSince, Photo, Ring } from "./ui";
import { tick } from "./DayCurve";
import t from "./trends.module.css";

// One score over time for one spot. Pick the spot, pick the score, then drag
// along the line to read any scan; the card under it follows your finger.
// Shared by the Trends tab and a score's trend sheet.

const PICKER: ScoreKey[] = [OVERALL.key, ...METRICS.map((m) => m.key)];
const MOVED = 10;

export function areaChange(d: Derived, area: string, key: ScoreKey) {
  const scans = d.scans.filter((s) => s.area === area && score(s, key) != null);
  if (scans.length < 2) return null;
  const from = score(scans[0], key)!;
  const to = score(scans[scans.length - 1], key)!;
  return { from, to, delta: to - from, since: scans[0] };
}

export function TrendView({
  metric,
  area,
  onMetric,
  onArea,
  showDelta,
  revealKey,
}: {
  metric: ScoreKey;
  area: string;
  onMetric: (k: ScoreKey) => void;
  onArea: (a: string) => void;
  showDelta?: boolean;
  revealKey: string;
}) {
  const { d } = useReportApi();
  const scans = useMemo(() => d.scans.filter((s) => s.area === area && score(s, metric) != null), [d, area, metric]);
  const change = areaChange(d, area, metric);
  const [picked, setPicked] = useState<Scan | null>(null);
  const shown = picked && scans.includes(picked) ? picked : scans[scans.length - 1];
  useEffect(() => setPicked(null), [area, metric]);
  // The range a tapped legend item picks out on the chart.
  const [focus, setFocus] = useState<string | null>(null);
  const reduce = useReducedMotion();

  return (
    <div className={t.view}>
      {showDelta && change && (
        <p className={t.delta} data-down={change.delta < 0} aria-live="polite">
          <NumberFlow value={change.delta} format={{ signDisplay: "exceptZero" }} animated={!reduce} />
          <span className="sr-only">
            {metricMeta(metric).label} in {area}
            {` since ${fmtDay(change.since.takenAt, scanTz(change.since) ?? d.tz)}`}
          </span>
        </p>
      )}

      {d.areas.length > 1 && (
        <div className={t.areas} role="tablist" aria-label="Spot">
          {d.areas.map((a) => (
            <button key={a.area} role="tab" aria-selected={a.area === area} className={t.area} onClick={() => onArea(a.area)}>
              {a.area === area && <motion.i layoutId={`${revealKey}-area`} className={t.areaLine} transition={{ type: "spring", duration: 0.35, bounce: 0 }} />}
              <b>{a.area}</b>
              <span>{a.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className={t.picker} role="tablist" aria-label="Score">
        {PICKER.map((k) => {
          const c = areaChange(d, area, k);
          const v = (() => {
            const ss = d.scans.filter((s) => s.area === area && score(s, k) != null);
            return ss.length ? score(ss[ss.length - 1], k) : null;
          })();
          return (
            <button key={k} role="tab" aria-selected={k === metric} className={t.pick} onClick={() => onMetric(k)} data-on={k === metric}>
              <span className={t.pickRing}>
                <Ring value={v} />
                {c && Math.abs(c.delta) >= MOVED && (
                  <span className={t.moved} aria-label={`moved ${c.delta > 0 ? "up" : "down"} ${Math.abs(c.delta)}`}>
                    <Icon name={c.delta > 0 ? "up" : "down"} size={10} stroke={2} />
                  </span>
                )}
              </span>
              <span className={t.pickLabel}>{metricMeta(k).label}</span>
            </button>
          );
        })}
      </div>

      {scans.length > 1 ? (
        <>
          {/* What the chart plots, in words: the score, the spot, how many scans and when. */}
          <p className={t.caption}>
            {metricMeta(metric).label} score on your {area.toLowerCase()} · {scans.length} scans,{" "}
            {fmtRange(dayOf(d, scans[0]), dayOf(d, scans[scans.length - 1]))}
          </p>
          <Legend d={d} focus={focus} onFocus={setFocus} />
          <Chart key={`${area}-${metric}`} d={d} scans={scans} metric={metric} picked={shown} onPick={setPicked} revealKey={revealKey} focus={focus} />
        </>
      ) : (
        <div className={t.chartVoid}>
          <p className={t.emptyTrend}>
            {scans.length
              ? `Just one ${area.toLowerCase()} scan so far. Scan it again to see how your ${metricMeta(metric).label.toLowerCase()} score changes.`
              : `No ${metricMeta(metric).label.toLowerCase()} readings for your ${area.toLowerCase()} yet.`}
          </p>
        </div>
      )}
      {shown ? <ScanCard scan={shown} metric={metric} /> : <div className={t.cardVoid} aria-hidden />}
    </div>
  );
}

// ---------------------------------------------------------------- chart

const H = 150;
const PAD_T = 12;
const PAD_B = 10;
/** Product lanes under the plot: the gap above them, each lane's height, and its bar. */
const LANE_GAP = 6;
const LANE = 9;
const LANE_BAR = 4;

/** The products, in the order they started; each keeps its colour slot wherever it shows. */
const productSpans = (d: Derived) => d.spans.filter((s) => s.kind === "product");
/** Fixed slots (trends.module.css), never cycled: a fourth product and on are plain. */
const rangeColor = (i: number) => `var(--range-${i + 1}, var(--bark-3))`;
/** Each slot's line: solid, dashed, dotted. */
const RANGE_DASH = [undefined, "5 2", "2 2"];

function Chart({
  d,
  scans,
  metric,
  picked,
  onPick,
  revealKey,
  focus,
}: {
  d: Derived;
  scans: Scan[];
  metric: ScoreKey;
  picked: Scan | undefined;
  onPick: (s: Scan) => void;
  revealKey: string;
  /** A range picked out from the legend: it stays, the others fade. */
  focus: string | null;
}) {
  const [box, w] = useWidth<HTMLDivElement>();
  const [revealRef, reveal] = useReveal<HTMLDivElement>(`${revealKey}-chart`);
  const days = daysBetween(d.start, d.end) || 1;
  const values = scans.map((s) => score(s, metric)!);
  const lo = Math.floor((Math.min(...values) - 6) / 5) * 5;
  const hi = Math.ceil((Math.max(...values) + 6) / 5) * 5;
  const mid = Math.round((lo + hi) / 10) * 5;
  const W = Math.max(1, w - 30);
  const x = (s: Scan | string) => 30 + (daysBetween(d.start, typeof s === "string" ? s : dayOf(d, s)) / days) * (W - 8);
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD_T - PAD_B);
  const pts = scans.map((s, i) => [x(s), y(values[i])] as const);
  const line = d3line().curve(curveMonotoneX)(pts as [number, number][]) ?? "";
  const wash = d3area().curve(curveMonotoneX).y0(H - PAD_B).y1((p) => p[1])(pts as [number, number][]) ?? "";
  const washId = `${useId().replace(/:/g, "")}-wash`;
  const trips = d.spans.filter((s) => s.kind === "travel");
  const hatchId = `${washId}-period`;
  // Products run in thin lanes under the plot, one each, on the same x scale.
  const products = productSpans(d);
  const lanesH = products.length ? LANE_GAP + products.length * LANE : 0;
  const focused = products.find((p) => p.id === focus);
  const dim = (id: string) => (focus ? focus !== id : undefined);
  const sel = picked ? scans.indexOf(picked) : -1;
  // Only the first finger reads the chart; the pill shows while it's down.
  const finger = useRef<number | null>(null);
  const [touching, setTouching] = useState(false);
  // A mouse reads the chart just by hovering, no press needed.
  const [hovering, setHovering] = useState(false);
  const reading = touching || hovering;

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    if (!scans.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    pts.forEach(([qx], i) => {
      if (Math.abs(qx - px) < Math.abs(pts[best][0] - px)) best = i;
    });
    if (scans[best] !== picked) {
      onPick(scans[best]);
      tick();
    }
  };
  const release = (e: PointerEvent<HTMLDivElement>) => {
    if (finger.current !== e.pointerId) return;
    finger.current = null;
    setTouching(false);
  };
  const pillText = sel >= 0 ? `${fmtDay(dayOf(d, scans[sel]))} · ${values[sel]}` : "";
  const half = pillText.length * 3.4 + 12;
  const pillAt = sel >= 0 ? Math.max(half, Math.min(w - half, pts[sel][0])) : 0;

  const label = `${metricMeta(metric).label}, ${scans.length} scans from ${values[0]} to ${values[values.length - 1]}`;

  return (
    <div ref={revealRef} className={t.chartWrap} data-reveal={reveal}>
      <div
        ref={box}
        className={t.chart}
        style={{ height: H + lanesH }}
        data-base-ui-swipe-ignore="x"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, scans.length - 1)}
        aria-valuenow={Math.max(0, sel)}
        aria-valuetext={picked ? `${fmtDay(dayOf(d, picked))}: ${score(picked, metric)}` : undefined}
        onPointerDown={(e) => {
          if (finger.current != null) return;
          finger.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          setTouching(true);
          pick(e);
        }}
        onPointerMove={(e) => {
          if (finger.current === e.pointerId) pick(e);
          else if (e.pointerType === "mouse" && finger.current == null) {
            setHovering(true);
            pick(e);
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHovering(false);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" && sel > 0) onPick(scans[sel - 1]);
          if (e.key === "ArrowRight" && sel < scans.length - 1) onPick(scans[sel + 1]);
        }}
      >
        {w > 0 && scans.length > 0 && (
          <svg width={w} height={H + lanesH} aria-hidden className={t.svg}>
            <defs>
              <linearGradient id={washId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className={t.washTop} />
                <stop offset="1" className={t.washEnd} />
              </linearGradient>
              <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" className={t.periodBg} />
                <line x1="1" y1="0" x2="1" y2="6" className={t.periodInk} />
              </pattern>
            </defs>
            {trips.map((tr) => (
              <rect
                key={tr.id}
                x={x(tr.start) - 5}
                y={PAD_T - 4}
                width={x(tr.end) - x(tr.start) + 10}
                height={H - PAD_T - PAD_B + 8}
                rx={3}
                className={t.trip}
                data-dim={dim(tr.id)}
              />
            ))}
            {d.moments.map((m) => (
              <rect
                key={m.id}
                x={x(m.day) - 3}
                y={PAD_T - 4}
                width={x(m.end) - x(m.day) + 6}
                height={H - PAD_T - PAD_B + 8}
                rx={3}
                fill={`url(#${hatchId})`}
                className={t.period}
                data-dim={dim(m.id)}
              />
            ))}
            {/* A product picked in the legend washes its stretch of the plot in its own colour. */}
            {focused && (
              <rect
                x={x(focused.start)}
                y={PAD_T - 4}
                width={Math.max(4, x(focused.end) - x(focused.start))}
                height={H - PAD_T + lanesH}
                rx={3}
                className={t.focusBand}
                style={{ fill: rangeColor(products.indexOf(focused)) }}
              />
            )}
            {products.map((p, i) => (
              <line
                key={p.id}
                x1={x(p.start)}
                x2={Math.max(x(p.start) + 1, x(p.end))}
                y1={H + LANE_GAP + i * LANE + LANE / 2}
                y2={H + LANE_GAP + i * LANE + LANE / 2}
                strokeWidth={LANE_BAR}
                strokeDasharray={RANGE_DASH[i]}
                className={t.lane}
                style={{ stroke: rangeColor(i) }}
                data-dim={dim(p.id)}
              />
            ))}
            {[hi, mid, lo].map((g) => (
              <g key={g}>
                <line x1={30} x2={w} y1={y(g)} y2={y(g)} className={t.grid} />
                <text x={0} y={y(g)} dominantBaseline="central" className={t.gridLabel}>
                  {g}
                </text>
              </g>
            ))}
            {sel >= 0 && <line x1={pts[sel][0]} x2={pts[sel][0]} y1={PAD_T - 6} y2={H - PAD_B + 4} className={t.cursor} data-on={reading} />}
            <path d={wash} className={t.wash} fill={`url(#${washId})`} />
            <path d={line} className={t.line} pathLength={1} />
            {pts.map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r={i === sel ? 4.5 : 2} className={t.dot} data-on={i === sel} style={{ "--i": i } as CSSProperties} />
            ))}
          </svg>
        )}
        {reading && sel >= 0 && (
          <span className={t.pill} style={{ left: pillAt } as CSSProperties} aria-hidden>
            {fmtDay(dayOf(d, scans[sel]))} · <b>{values[sel]}</b>
          </span>
        )}
      </div>
      <div className={t.axis} aria-hidden>
        <span>{fmtDay(d.start)}</span>
        <span>{fmtDay(d.end)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- legend

/**
 * What was going on, as one tidy row above the chart, the way Health labels
 * its series: a swatch and a name, left-aligned and wrapping. The ranges
 * themselves live in the chart (product lanes under the plot, trips and the
 * period as bands across it). Tapping an item picks its range out; tapping it
 * again lets go.
 */
function Legend({ d, focus, onFocus }: { d: Derived; focus: string | null; onFocus: (id: string | null) => void }) {
  const items = [
    ...productSpans(d).map((sp, i) => ({
      id: sp.id,
      kind: "product",
      label: sp.short,
      color: rangeColor(i),
      slot: i,
      spoken: `${sp.label}, ${fmtDay(sp.start)} to ${sp.ongoing ? "now" : fmtDay(sp.end)}`,
    })),
    ...d.spans
      .filter((sp) => sp.kind === "travel")
      .map((sp) => ({
        id: sp.id,
        kind: "travel",
        label: `${sp.short} · ${fmtRange(sp.start, sp.end)}`,
        color: undefined,
        slot: undefined,
        spoken: `${sp.label}, ${fmtDay(sp.start)} to ${fmtDay(sp.end)}`,
      })),
    ...d.moments.map((m) => ({
      id: m.id,
      kind: "period",
      label: `${m.label} · ${fmtRange(m.day, m.end)}`,
      color: undefined,
      slot: undefined,
      spoken: `${m.label}, ${fmtDay(m.day)} to ${fmtDay(m.end)}`,
    })),
  ];
  if (!items.length) return null;
  return (
    <ul className={t.legend} aria-label="What was going on">
      {items.map((it) => (
        <li key={it.id}>
          <button
            type="button"
            className={t.legendItem}
            aria-pressed={focus === it.id}
            data-dim={focus ? focus !== it.id : undefined}
            onClick={() => onFocus(focus === it.id ? null : it.id)}
          >
            <i className={t.swatch} data-kind={it.kind} data-slot={it.slot} style={it.color ? ({ "--c": it.color } as CSSProperties) : undefined} aria-hidden />
            <span aria-hidden>{it.label}</span>
            <span className="sr-only">{it.spoken}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- scan card

export function ScanCard({ scan, metric = "overall" }: { scan: Scan; metric?: ScoreKey }) {
  const { d, openScan } = useReportApi();
  const tz = scanTz(scan) ?? d.tz;
  const prev = previousSameArea(d, scan);
  const v = score(scan, metric);
  const pv = prev ? score(prev, metric) : null;
  const delta = v != null && pv != null ? v - pv : null;
  // The card opens the scan through one button stretched over it; the note
  // sits above that button so its pencil works on its own.
  return (
    <div className={t.card}>
      <button className={t.cardHit} onClick={() => openScan(scan)} aria-label={`Open the scan from ${fmtDay(scan.takenAt, tz)}`} />
      <div className={t.cardTop} aria-hidden>
        <Photo scan={scan} alt="" className={t.cardPhoto} />
        <span className={t.cardText}>
          <span className={t.cardWhen}>
            {fmtDay(scan.takenAt, tz)} · {fmtTime(scan.takenAt, tz)}
          </span>
          <span className={t.cardSaw}>{scan.summary.headline}</span>
        </span>
        <span className={t.cardScore}>
          <b>{v ?? "–"}</b>
          {delta != null && delta !== 0 && prev && <ChangeSince n={delta} since={fmtDay(prev.takenAt, scanTz(prev) ?? d.tz)} />}
        </span>
        <Icon name="chevronR" size={12} stroke={1.8} className={t.cardChevron} />
      </div>
      {scan.annotation !== undefined && <NoteCard scan={scan} compact lines={1} addable className={t.cardNote} />}
    </div>
  );
}
