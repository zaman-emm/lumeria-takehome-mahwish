"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  METRICS,
  OVERALL,
  dayOf,
  fmtDay,
  fmtTime,
  metricMeta,
  scanTz,
  signed,
  type Derived,
  type ScoreKey,
} from "@/lib/insights";
import type { Scan } from "@/lib/types";
import type { ReportState } from "@/lib/useReport";
import { ScanDetail } from "../../_shared/ScanDetail";
import { ScanPhoto } from "../../_shared/ScanPhoto";
import { Sheet } from "../../_shared/Sheet";
import { StateScreen } from "../../_shared/StateScreen";
import s from "./journal.module.css";

// Direction 2, "Journal": the month as one calm editorial read. Everything is
// on the page at once; the chart is the spine, and every number can be traced
// back to the scan behind it.

export function Journal({ state }: { state: ReportState }) {
  if (state.status !== "ready") return <StateScreen state={state} />;
  return <JournalReady d={state.data} />;
}

const DAY = 86_400_000;

/** A scan's position on the period axis, in the place it was taken. */
function localTime(d: Derived, scan: Scan) {
  const tz = scanTz(scan) ?? d.tz;
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: tz }).formatToParts(
    new Date(scan.takenAt),
  );
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return Date.parse(`${dayOf(d, scan)}T00:00:00Z`) + (h + m / 60) * 3_600_000;
}

function monthTitle(d: Derived) {
  if (!d.isMonthly) return d.scans.length === 1 ? "Your first read" : "Your skin so far";
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${d.end}T12:00:00Z`));
}

/** The opening paragraph, composed from what actually happened. */
function lede(d: Derived) {
  if (!d.trend) {
    return `This is your first read, ${d.firstName}. It’s the line every future scan will be measured against, so here’s where your skin is starting from.`;
  }
  const { delta } = d.trend;
  const span = d.isMonthly ? "the month" : "your scans so far";
  const area = d.area.toLowerCase();
  let first: string;
  if (delta >= 3)
    first = d.isMonthly
      ? `Your ${area} ended ${span} ${delta} points higher than it started`
      : `Your ${area} is ${delta} points higher than when you started`;
  else if (delta <= -3) first = `Your ${area} is ${Math.abs(delta)} points lower than when you started`;
  else first = `Your ${area} held steady through ${span}`;
  const dip = d.dip
    ? d.dip.during
      ? `, even after a rough few days in ${d.dip.during.short}`
      : `, even after a rough patch around ${fmtDay(dayOf(d, d.dip.scan))}`
    : "";
  const helped = d.factors.find((f) => f.direction === "helped" && f.kind === "product" && !f.when.startsWith("All"));
  const best = [...d.changes].sort((a, b) => b.delta - a.delta)[0];
  const worst = [...d.changes].sort((a, b) => a.delta - b.delta)[0];
  let second = "";
  if (helped) {
    second = ` ${metricMeta(helped.change.key).label} made the biggest comeback, and it lines up with starting your ${
      d.spans.find((sp) => sp.id === helped.spanId)?.short.toLowerCase() ?? "new product"
    }.`;
  } else if (delta >= 3 && best) {
    second = ` ${metricMeta(best.key).label} moved the most, up ${best.delta}.`;
  } else if (delta <= -3 && worst) {
    second = ` Most of that is ${metricMeta(worst.key).label.toLowerCase()}, down ${Math.abs(worst.delta)}. Small shifts like this are common, and steady scanning will show if it sticks.`;
  }
  return `${first}${dip}.${second}`;
}

function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

function JournalReady({ d }: { d: Derived }) {
  const root = useRef<HTMLDivElement>(null);
  const mast = useRef<HTMLElement>(null);
  const chartRef = useRef<HTMLElement>(null);
  const [metric, setMetric] = useState<ScoreKey>("overall");
  const [area, setArea] = useState(d.area);
  const [open, setOpen] = useState<Scan | null>(null);
  const [stuck, setStuck] = useState(false);
  useReveal(root);

  useEffect(() => {
    const el = mast.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: "-40px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const latest = d.latest;
  const tz = scanTz(latest) ?? d.tz;
  const heroScan = [...d.realPhotos].reverse().find((x) => x.area === latest.area) ?? latest;

  const pickMetric = (k: ScoreKey) => {
    setMetric(k);
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={s.page} ref={root}>
      <div className={s.sticky} data-on={stuck} aria-hidden={!stuck}>
        <span>
          {d.firstName} · {monthTitle(d)}
        </span>
        <b>{latest.scores.overall}</b>
      </div>

      <header className={s.mast} ref={mast}>
        <div className={s.mastTop}>
          <span className="label">Lumeria</span>
          <span className="label">{d.isMonthly ? "Monthly read" : "Skin report"}</span>
        </div>
        <h1 className={s.title}>{monthTitle(d)}</h1>
        <p className={s.byline}>
          For <span className={s.name}>{d.firstName}</span> · {d.periodLabel} · {d.scans.length}{" "}
          {d.scans.length === 1 ? "scan" : "scans"}
        </p>
      </header>

      <figure className={s.hero}>
        <div className={s.heroImg}>
          <ScanPhoto scan={heroScan} priority alt={`${heroScan.area} on ${fmtDay(heroScan.takenAt, tz)}`} />
        </div>
        <div className={s.heroCard}>
          <span className="label">Latest overall</span>
          <div className={s.heroScore}>
            <b>{latest.scores.overall}</b>
            {d.trend && <span data-dir={d.trend.delta >= 0 ? "up" : "down"}>{signed(d.trend.delta)} since {fmtDay(dayOf(d, d.trend.from))}</span>}
          </div>
        </div>
        <figcaption>
          {heroScan.area}, {fmtDay(heroScan.takenAt, tz)} at {fmtTime(heroScan.takenAt, tz)}
          {d.isBest && (d.isMonthly ? " · your best scan this month" : " · your best scan yet")}
        </figcaption>
      </figure>

      <p className={s.lede} data-reveal>
        {lede(d)}
      </p>

      <section className={s.section} data-reveal>
        <h2 className={s.h2}>
          <span className="label">01</span>Where you are today
        </h2>
        <p className={s.sub}>
          Your {latest.area.toLowerCase()} on {fmtDay(latest.takenAt, tz)}. Every score runs 0 to 100, and higher is always healthier.
        </p>
        <ul className={s.glance}>
          {METRICS.map((m) => {
            const v = latest.scores[m.key as keyof Scan["scores"]];
            const c = d.changes.find((x) => x.key === m.key);
            return (
              <li key={m.key}>
                <button onClick={() => d.trend && pickMetric(m.key)} disabled={!d.trend}>
                  <span className={s.gName}>
                    {m.label}
                    <small>{m.hint}</small>
                  </span>
                  {d.trend && <Spark d={d} metric={m.key} />}
                  <span className={s.gVal}>
                    {v ?? "–"}
                    {c && <small>{signed(c.delta)}</small>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className={s.saw}>
          <p className="label">What we saw</p>
          {latest.summary.observations.map((o, i) => (
            <p key={i}>{o}</p>
          ))}
          <button className={s.textLink} onClick={() => setOpen(latest)}>
            See this scan
          </button>
        </div>
      </section>

      <section className={s.section} ref={chartRef} data-reveal>
        <h2 className={s.h2}>
          <span className="label">02</span>
          {d.trend ? "How your skin moved" : "What happens next"}
        </h2>
        {d.trend ? (
          <MonthChart d={d} metric={metric} setMetric={setMetric} area={area} setArea={setArea} onOpen={setOpen} />
        ) : (
          <div className={s.baseline}>
            <p>
              Scan the same spot again in two or three days, at about the same time of day. Your second scan starts the line, and
              by the fourth we can start to show what lines up with the changes.
            </p>
          </div>
        )}
      </section>

      {d.factors.length > 0 && (
        <section className={s.section} data-reveal>
          <h2 className={s.h2}>
            <span className="label">03</span>What lined up with the changes
          </h2>
          <p className={s.sub}>We look for things that happened at the same time as a shift. They’re clues, not causes.</p>
          <ul className={s.factors}>
            {d.factors.map((f) => (
              <li key={f.id} data-dir={f.direction}>
                <span className={s.fGlyph} aria-label={f.direction === "helped" ? "Helped" : "Held back"}>
                  {f.direction === "helped" ? "↑" : "↓"}
                </span>
                <div>
                  <p className={s.fTitle}>{f.title}</p>
                  <p className={s.fMeta}>
                    {f.when} · {metricMeta(f.change.key).label} {f.change.from} → {f.change.to}
                  </p>
                  <p className={s.fBody}>{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.notes.some((n) => n.note) && (
        <section className={s.section} data-reveal>
          <h2 className={s.h2}>
            <span className="label">{d.factors.length ? "04" : "03"}</span>In your words
          </h2>
          <div className={s.notes}>
            {d.notes
              .filter((n) => n.note)
              .map((n) => (
                <button key={n.scan.id} className={s.note} onClick={() => setOpen(n.scan)}>
                  <span className={s.noteDate}>{fmtDay(dayOf(d, n.scan))}</span>
                  <span className={s.noteText}>“{n.note}”</span>
                  {n.tags.length > 0 && (
                    <span className={s.noteTags}>
                      {n.tags.map((t) => (
                        <i key={t}>{t}</i>
                      ))}
                    </span>
                  )}
                </button>
              ))}
          </div>
        </section>
      )}

      <section className={s.section} data-reveal>
        <h2 className={s.h2}>
          <span className="label">{d.factors.length ? (d.notes.some((n) => n.note) ? "05" : "04") : "03"}</span>
          Every scan, by day
        </h2>
        <Calendar d={d} onOpen={setOpen} />
      </section>

      <section className={s.tip} data-reveal>
        <p className="label">One thing to try</p>
        <p className={s.tipText}>{latest.summary.tip}</p>
      </section>

      <footer className={s.foot}>
        <p>
          Lumeria reads how your skin looks, not what’s going on underneath. If something worries you, a dermatologist is the right
          next step.
        </p>
      </footer>

      <Sheet open={!!open} onClose={() => setOpen(null)} label="Scan details" scrollKey={open?.id}>
        {open && <ScanDetail d={d} scan={open} />}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- sparkline

function Spark({ d, metric }: { d: Derived; metric: ScoreKey }) {
  const vs = d.areaScans.map((x) => x.scores[metric as keyof Scan["scores"]]).filter((v): v is number => v != null);
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

function MonthChart({
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
    () => d.scans.filter((x) => x.area === area && x.scores[metric as keyof Scan["scores"]] != null),
    [d.scans, area, metric],
  );
  const [active, setActive] = useState(scans.length - 1);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  useEffect(() => setActive(scans.length - 1), [scans.length, area]);

  const W = 335;
  const H = 210;
  const padT = 18;
  const padB = 22;
  const padX = 6;
  const t0 = Date.parse(`${d.start}T00:00:00Z`);
  const t1 = Date.parse(`${d.end}T00:00:00Z`) + DAY;
  const fx = (t: number) => (t - t0) / (t1 - t0);
  const x = (t: number) => padX + fx(t) * (W - padX * 2);

  const vals = scans.map((sc) => sc.scores[metric as keyof Scan["scores"]] as number);
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

  const metrics = [OVERALL, ...METRICS];
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
      <div className={s.chips} role="radiogroup" aria-label="Score">
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
                  <text x={padX} y={y(g) - 4} fontSize="10" fill="var(--bark-3)">
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
              <text x={padX} y={H - 4} fontSize="10" fill="var(--bark-3)">
                {fmtDay(d.start)}
              </text>
              <text x={W - padX} y={H - 4} fontSize="10" fill="var(--bark-3)" textAnchor="end">
                {fmtDay(d.end)}
              </text>
            </svg>
          </div>

          {d.spans.length > 0 && (
            <div className={s.bands}>
              {d.spans.map((sp) => {
                const left = fx(Date.parse(`${sp.start}T00:00:00Z`));
                const right = fx(Date.parse(`${sp.end}T00:00:00Z`) + DAY);
                const widthPct = Math.max(0.012, right - left);
                const name = sp.kind === "travel" ? sp.short : sp.short;
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

// ---------------------------------------------------------------- calendar

function Calendar({ d, onOpen }: { d: Derived; onOpen: (s: Scan) => void }) {
  const byDay = new Map<string, Scan>();
  d.scans.forEach((sc) => byDay.set(dayOf(d, sc), sc)); // latest scan of the day wins
  const vals = [...byDay.values()].map((x) => x.scores.overall);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);

  const start = new Date(`${d.start}T12:00:00Z`);
  const end = new Date(`${d.end}T12:00:00Z`);
  const first = new Date(start.getTime() - start.getUTCDay() * DAY);
  const cells: (string | null)[] = [];
  for (let t = first.getTime(); t <= end.getTime() || cells.length % 7; t += DAY) {
    const day = new Date(t).toISOString().slice(0, 10);
    cells.push(t < start.getTime() || t > end.getTime() ? null : day);
  }
  const months = new Set(cells.filter(Boolean).map((c) => c!.slice(0, 7)));

  return (
    <div className={s.cal}>
      <div className={s.calHead} aria-hidden>
        {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className={s.calGrid}>
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const sc = byDay.get(day);
          const date = Number(day.slice(8));
          const showMonth = date === 1 || (i === cells.findIndex(Boolean) && months.size > 1);
          if (!sc)
            return (
              <span key={day} className={s.calDay}>
                {showMonth ? fmtDay(day) : date}
              </span>
            );
          const k = hi === lo ? 1 : (sc.scores.overall - lo) / (hi - lo);
          return (
            <button
              key={day}
              className={s.calScan}
              style={{ "--k": `${Math.round(14 + k * 72)}%` } as CSSProperties}
              data-dark={k > 0.5}
              onClick={() => onOpen(sc)}
              aria-label={`${fmtDay(day)}, overall ${sc.scores.overall}`}
            >
              <span>{date}</span>
            </button>
          );
        })}
      </div>
      <div className={s.calKey}>
        <span>{lo}</span>
        <i aria-hidden />
        <span>{hi}</span>
        <em>Overall score on each day you scanned, {d.periodLabel}. Tap a day to open it.</em>
      </div>
    </div>
  );
}
