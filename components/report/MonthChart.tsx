"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { EXTRAS, METRICS, OVERALL, dayOf, fmtDay, fmtTime, metricMeta, scanTz, score, signed, type Derived, type ScoreKey } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import s from "./monthChart.module.css";

// The period as one line: pick a score, scrub along it, and every point opens
// the scan behind it. Product and travel bands sit underneath, so what lined up
// with a change is visible without reading a word.

const DAY = 86_400_000;

/** A scan's position on the period axis, in the place it was taken. */
export function localTime(d: Derived, scan: Scan) {
  const tz = scanTz(scan) ?? d.tz;
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: tz }).formatToParts(
    new Date(scan.takenAt),
  );
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return Date.parse(`${dayOf(d, scan)}T00:00:00Z`) + (h + m / 60) * 3_600_000;
}

// ---------------------------------------------------------------- sparkline

export function Spark({ d, metric }: { d: Derived; metric: ScoreKey }) {
  const vs = d.areaScans.map((x) => score(x, metric)).filter((v): v is number => v != null);
  if (vs.length < 2) return <span className={s.spark} />;
  const W = 72;
  const H = 24;
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const pts = vs.map((v, i) => [(i / (vs.length - 1)) * (W - 4) + 2, H - 3 - ((v - lo) / (hi - lo || 1)) * (H - 6)]);
  const last = pts[pts.length - 1];
  return (
    <svg className={s.spark} viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--bark-3)" strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--forest)" />
    </svg>
  );
}

// ---------------------------------------------------------------- month chart

export function MonthChart({
  d,
  metric,
  setMetric,
  area,
  setArea,
  onOpen,
}: {
  d: Derived;
  metric: ScoreKey;
  setMetric: (k: ScoreKey) => void;
  area: string;
  setArea: (a: string) => void;
  onOpen: (s: Scan) => void;
}) {
  const scans = useMemo(
    () => d.scans.filter((x) => x.area === area && score(x, metric) != null),
    [d.scans, area, metric],
  );
  const [active, setActive] = useState(scans.length - 1);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  useEffect(() => setActive(scans.length - 1), [scans.length, area]);

  // Keep the picked score's chip in view, e.g. when the chart opens on "Spots".
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = chipsRef.current;
    const on = row?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!row || !on) return;
    if (on.offsetLeft + on.offsetWidth > row.scrollLeft + row.clientWidth || on.offsetLeft < row.scrollLeft)
      row.scrollTo({ left: on.offsetLeft - 18, behavior: "smooth" });
  }, [metric]);

  const W = 335;
  const H = 210;
  const padT = 18;
  const padB = 22;
  const padX = 6;
  const t0 = Date.parse(`${d.start}T00:00:00Z`);
  const t1 = Date.parse(`${d.end}T00:00:00Z`) + DAY;
  const fx = (t: number) => (t - t0) / (t1 - t0);
  const x = (t: number) => padX + fx(t) * (W - padX * 2);

  const vals = scans.map((sc) => score(sc, metric) as number);
  const lo = Math.max(0, Math.floor((Math.min(...vals, 100) - 8) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...vals, 0) + 4) / 5) * 5);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
  const pts = scans.map((sc, i) => ({ sc, x: x(localTime(d, sc)), y: y(vals[i]), v: vals[i] }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
  const grid = [lo, Math.round((lo + hi) / 2 / 5) * 5, hi].filter((v, i, a) => a.indexOf(v) === i);

  const a = pts[Math.min(active, pts.length - 1)];
  const prev = active > 0 ? pts[active - 1] : null;

  const pick = (clientX: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.x - vx) < Math.abs(pts[best].x - vx)) best = i;
    });
    setActive(best);
  };

  const metrics = [OVERALL, ...METRICS, ...EXTRAS];
  const multiArea = d.areas.length > 1;

  return (
    <div className={s.chart}>
      {multiArea && (
        <div className={s.areas} role="radiogroup" aria-label="Body area">
          {d.areas.map((ar) => (
            <button key={ar.area} role="radio" aria-checked={ar.area === area} onClick={() => setArea(ar.area)}>
              {ar.area}
              <small>{ar.count}</small>
            </button>
          ))}
        </div>
      )}
      <div className={s.chips} ref={chipsRef} role="radiogroup" aria-label="Score">
        {metrics.map((m) => (
          <button key={m.key} role="radio" aria-checked={m.key === metric} onClick={() => setMetric(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {pts.length < 2 ? (
        <p className={s.sub}>
          Only one {metricMeta(metric).label.toLowerCase()} reading for your {area.toLowerCase()} so far. Scan it again to start the line.
        </p>
      ) : (
        <>
          <div className={s.plot}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              tabIndex={0}
              role="img"
              aria-label={`${metricMeta(metric).label} for your ${area.toLowerCase()}. Use the arrow keys to move between scans.`}
              onPointerDown={(e) => {
                dragging.current = true;
                pick(e.clientX);
              }}
              onPointerMove={(e) => (dragging.current || e.pointerType === "mouse") && pick(e.clientX)}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
              onPointerLeave={() => (dragging.current = false)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1));
                if (e.key === "ArrowRight") setActive((i) => Math.min(pts.length - 1, i + 1));
                if (e.key === "Enter") onOpen(a.sc);
              }}
            >
              {d.spans.map((sp) => (
                <rect
                  key={sp.id}
                  x={x(Date.parse(`${sp.start}T00:00:00Z`))}
                  width={Math.max(3, x(Date.parse(`${sp.end}T00:00:00Z`) + DAY) - x(Date.parse(`${sp.start}T00:00:00Z`)))}
                  y={padT}
                  height={H - padT - padB}
                  fill={sp.kind === "travel" ? "var(--clay)" : "transparent"}
                  opacity={0.08}
                />
              ))}
              {grid.map((g) => (
                <g key={g}>
                  <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="rgba(46,38,32,.1)" strokeWidth="1" />
                  <text x={padX} y={y(g) - 4} fontSize="12" fill="var(--bark-2)">
                    {g}
                  </text>
                </g>
              ))}
              <path
                key={`${metric}-${area}`}
                d={line}
                fill="none"
                stroke="var(--forest)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                className={s.drawn}
              />
              {pts.map((p, i) => (
                <circle key={p.sc.id} cx={p.x} cy={p.y} r={i === active ? 0 : 2.5} fill="var(--forest)" stroke="var(--bone)" strokeWidth="1.5" />
              ))}
              <line x1={a.x} x2={a.x} y1={padT - 6} y2={H - padB} stroke="var(--bark)" strokeWidth="1" opacity=".35" />
              <circle cx={a.x} cy={a.y} r="6" fill="var(--forest)" stroke="var(--bone)" strokeWidth="2.5" />
              <text x={padX} y={H - 4} fontSize="12" fill="var(--bark-2)">
                {fmtDay(d.start)}
              </text>
              <text x={W - padX} y={H - 4} fontSize="12" fill="var(--bark-2)" textAnchor="end">
                {fmtDay(d.end)}
              </text>
            </svg>
          </div>

          {(d.spans.length > 0 || d.moments.length > 0) && (
            <div className={s.bands}>
              {d.spans.map((sp) => {
                const left = fx(Date.parse(`${sp.start}T00:00:00Z`));
                const right = fx(Date.parse(`${sp.end}T00:00:00Z`) + DAY);
                const widthPct = Math.max(0.012, right - left);
                const name = sp.short;
                // Label inside when it fits, otherwise beside the bar. Never clipped.
                const fits = widthPct * 323 > name.length * 6.4 + 14;
                return (
                  <div key={sp.id} className={s.band} data-kind={sp.kind}>
                    <i
                      style={{ left: `calc(${left * 100}% )`, width: `${widthPct * 100}%` } as CSSProperties}
                      data-stopped={!sp.ongoing && sp.kind === "product"}
                    >
                      {fits && <span>{name}</span>}
                    </i>
                    {!fits && (
                      <span
                        className={s.bandOut}
                        style={
                          (right < 0.7 ? { left: `calc(${right * 100}% + 6px)` } : { right: `calc(${(1 - left) * 100}% + 6px)` }) as CSSProperties
                        }
                      >
                        {name}
                      </span>
                    )}
                  </div>
                );
              })}
              {d.moments.map((m) => {
                const at = fx(Date.parse(`${m.day}T12:00:00Z`));
                return (
                  <div key={m.id} className={s.band} data-kind="period">
                    <i className={s.moment} style={{ left: `calc(${at * 100}% - 5px)` } as CSSProperties} />
                    <span
                      className={s.bandOut}
                      style={(at < 0.7 ? { left: `calc(${at * 100}% + 10px)` } : { right: `calc(${(1 - at) * 100}% + 10px)` }) as CSSProperties}
                    >
                      Period started
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <button className={s.reading} onClick={() => onOpen(a.sc)}>
            <span className={s.readTop}>
              <span>
                {fmtDay(a.sc.takenAt, scanTz(a.sc) ?? d.tz)} · {fmtTime(a.sc.takenAt, scanTz(a.sc) ?? d.tz)}
                {a.sc.location && a.sc.location.city !== d.scans[0].location?.city ? ` · ${a.sc.location.city}` : ""}
              </span>
              <span className={s.readVal}>
                {a.v}
                {prev && <small>{signed(a.v - prev.v)}</small>}
              </span>
            </span>
            <span className={s.readNote}>
              {a.sc.annotation?.note ? `“${a.sc.annotation.note}”` : a.sc.summary.observations[0]}
            </span>
            <span className={s.readMore}>Open this scan</span>
          </button>
        </>
      )}
    </div>
  );
}
