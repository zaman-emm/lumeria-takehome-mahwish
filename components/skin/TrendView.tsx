"use client";

import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "motion/react";
import {
  METRICS,
  OVERALL,
  daysBetween,
  dayOf,
  fmtDay,
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
import { Photo, Ring } from "./ui";
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
              {a.area}
              <span>{a.count}</span>
              {a.area === area && <motion.i layoutId={`${revealKey}-area`} className={t.areaLine} transition={{ type: "spring", duration: 0.35, bounce: 0 }} />}
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
        <Chart key={`${area}-${metric}`} d={d} scans={scans} metric={metric} picked={shown} onPick={setPicked} revealKey={revealKey} />
      ) : scans.length ? null : (
        <p className={t.emptyTrend}>No {metricMeta(metric).label.toLowerCase()} reads for this spot yet.</p>
      )}
      <Spans d={d} />
      {shown && <ScanCard scan={shown} metric={metric} />}
    </div>
  );
}

// ---------------------------------------------------------------- chart

const H = 150;
const PAD_T = 12;
const PAD_B = 10;

function Chart({
  d,
  scans,
  metric,
  picked,
  onPick,
  revealKey,
}: {
  d: Derived;
  scans: Scan[];
  metric: ScoreKey;
  picked: Scan | undefined;
  onPick: (s: Scan) => void;
  revealKey: string;
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
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join("");
  const trips = d.spans.filter((s) => s.kind === "travel");
  const sel = picked ? scans.indexOf(picked) : -1;

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    if (!scans.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    pts.forEach(([qx], i) => {
      if (Math.abs(qx - px) < Math.abs(pts[best][0] - px)) best = i;
    });
    if (scans[best] !== picked) onPick(scans[best]);
  };

  const label = `${metricMeta(metric).label}, ${scans.length} scans from ${values[0]} to ${values[values.length - 1]}`;

  return (
    <div ref={revealRef} className={t.chartWrap} data-reveal={reveal}>
      <div
        ref={box}
        className={t.chart}
        data-base-ui-swipe-ignore="x"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, scans.length - 1)}
        aria-valuenow={Math.max(0, sel)}
        aria-valuetext={picked ? `${fmtDay(dayOf(d, picked))}: ${score(picked, metric)}` : undefined}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === "touch") pick(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" && sel > 0) onPick(scans[sel - 1]);
          if (e.key === "ArrowRight" && sel < scans.length - 1) onPick(scans[sel + 1]);
        }}
      >
        {w > 0 && scans.length > 0 && (
          <svg width={w} height={H} aria-hidden className={t.svg}>
            {trips.map((tr) => (
              <rect key={tr.id} x={x(tr.start) - 5} y={PAD_T - 4} width={x(tr.end) - x(tr.start) + 10} height={H - PAD_T - PAD_B + 8} rx={3} className={t.trip} />
            ))}
            {[hi, mid, lo].map((g) => (
              <g key={g}>
                <line x1={30} x2={w} y1={y(g)} y2={y(g)} className={t.grid} />
                <text x={0} y={y(g)} dominantBaseline="central" className={t.gridLabel}>
                  {g}
                </text>
              </g>
            ))}
            {sel >= 0 && <line x1={pts[sel][0]} x2={pts[sel][0]} y1={PAD_T - 6} y2={H - PAD_B + 4} className={t.cursor} />}
            <path d={line} className={t.line} pathLength={1} />
            {pts.map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r={i === sel ? 4.5 : 2} className={t.dot} data-on={i === sel} style={{ "--i": i } as CSSProperties} />
            ))}
          </svg>
        )}
      </div>
      <div className={t.axis} aria-hidden>
        <span>{fmtDay(d.start)}</span>
        <span>{fmtDay(d.end)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- spans

function Spans({ d }: { d: Derived }) {
  if (!d.spans.length && !d.moments.length) return null;
  const days = daysBetween(d.start, d.end) || 1;
  const pct = (day: string) => `${(Math.max(0, daysBetween(d.start, day)) / days) * 100}%`;
  const helped = new Set(d.factors.filter((f) => f.direction === "helped").map((f) => f.spanId));
  return (
    <ul className={t.spans} aria-label="What was going on">
      {d.spans.map((sp) => (
        <li key={sp.id}>
          <span
            className={t.span}
            data-kind={sp.kind}
            data-tone={sp.kind === "travel" ? "travel" : helped.has(sp.id) ? "helped" : "plain"}
            style={{ left: pct(sp.start), width: `max(calc(${pct(sp.end)} - ${pct(sp.start)}), 8px)` } as CSSProperties}
          >
            {sp.kind === "product" && <span className={t.spanLabel}>{sp.short}</span>}
          </span>
          {sp.kind === "travel" && (
            <span className={t.spanOutside} style={{ left: `calc(${pct(sp.end)} + 8px)` }}>
              {sp.short}
            </span>
          )}
          <span className="sr-only">
            {sp.label}, {fmtDay(sp.start)} to {sp.ongoing ? "now" : fmtDay(sp.end)}
          </span>
        </li>
      ))}
      {d.moments.map((m) => (
        <li key={m.id}>
          <span className={t.moment} style={{ left: pct(m.day) }}>
            <i aria-hidden />
            {m.label}
          </span>
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
  const note = scan.annotation?.note;
  return (
    <button className={t.card} onClick={() => openScan(scan)} aria-label={`Open the scan from ${fmtDay(scan.takenAt, tz)}`}>
      <Photo scan={scan} alt="" className={t.cardPhoto} />
      <span className={t.cardText}>
        <span className={t.cardWhen}>
          {fmtDay(scan.takenAt, tz)} · {fmtTime(scan.takenAt, tz)}
        </span>
        <span className={t.cardNote}>{note ? `“${note}”` : scan.summary.headline}</span>
      </span>
      <span className={t.cardScore}>
        <b>{v ?? "–"}</b>
        {delta != null && delta !== 0 && (
          <span className={t.cardDelta}>
            <Icon name={delta > 0 ? "up" : "down"} size={9} stroke={2} />
            {Math.abs(delta)}
          </span>
        )}
      </span>
      <Icon name="chevronR" size={12} stroke={1.8} className={t.cardChevron} />
    </button>
  );
}
