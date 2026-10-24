"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  METRICS,
  dayOf,
  fmtDay,
  fmtRange,
  metricMeta,
  scanTz,
  signed,
  trendSentence,
  type Derived,
  type Factor,
} from "@/lib/insights";
import type { Scan } from "@/lib/types";
import type { ReportState } from "@/lib/useReport";
import { LIGHTS, ScanPhoto, type Light } from "../../_shared/ScanPhoto";
import { ScanDetail } from "../../_shared/ScanDetail";
import { Sheet } from "../../_shared/Sheet";
import { StateScreen } from "../../_shared/StateScreen";
import { Trend } from "../../_shared/Trend";
import s from "./story.module.css";

// Direction 1, "Story": the month as a short tap-through story. Each chapter
// answers one question, so a person can get the whole picture in eight taps
// and dig into any scan from the end card.

type Theme = "dark" | "light" | "sand";
interface Chapter {
  id: string;
  theme: Theme;
  title: string;
  body: ReactNode;
}

/** Stagger helper: children fade up in order. */
const In = ({ i, children, className }: { i: number; children: ReactNode; className?: string }) => (
  <div className={`${s.in} ${className ?? ""}`} style={{ "--i": i } as CSSProperties}>
    {children}
  </div>
);

export function Story({ state }: { state: ReportState }) {
  if (state.status !== "ready") return <StateScreen state={state} tone="dark" />;
  return <StoryReady d={state.data} />;
}

function StoryReady({ d }: { d: Derived }) {
  const chapters = useMemo(() => buildChapters(d), [d]);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [list, setList] = useState(false);
  const [scan, setScan] = useState<Scan | null>(null);

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(chapters.length - 1, to));
      setDir(next >= i ? 1 : -1);
      setI(next);
    },
    [chapters.length, i],
  );

  useEffect(() => {
    if (list) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(i + 1);
      }
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, i, list]);

  const ch = chapters[i];
  const last = i === chapters.length - 1;

  return (
    <div className={s.stage} data-theme={ch.theme}>
      <div className={s.progress} aria-hidden>
        {chapters.map((c, n) => (
          <span key={c.id}>
            <i style={{ transform: `scaleX(${n <= i ? 1 : 0})` }} />
          </span>
        ))}
      </div>
      <header className={s.top}>
        <span className="label">Lumeria</span>
        <button className={s.allScans} onClick={() => setList(true)}>
          All scans
        </button>
      </header>

      <button className={s.zonePrev} onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous chapter" />
      <button className={s.zoneNext} onClick={() => go(i + 1)} disabled={last} aria-label="Next chapter" />

      <section
        key={ch.id}
        className={s.chapter}
        style={{ "--dir": dir } as CSSProperties}
        aria-live="polite"
        aria-label={`${ch.title}, ${i + 1} of ${chapters.length}`}
      >
        {ch.id === "end" ? (
          <EndCard
            d={d}
            onAll={() => setList(true)}
            onReplay={() => {
              setDir(-1);
              setI(0);
            }}
          />
        ) : (
          ch.body
        )}
      </section>

      {i === 0 && (
        <p className={s.hint} aria-hidden>
          Tap to begin
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </p>
      )}

      <Sheet
        open={list}
        onClose={() => {
          setList(false);
          setScan(null);
        }}
        label={scan ? "Scan details" : "All scans"}
        scrollKey={scan?.id ?? "list"}
      >
        {scan ? (
          <>
            <button className={s.back} onClick={() => setScan(null)}>
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
                <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              All scans
            </button>
            <ScanDetail d={d} scan={scan} />
          </>
        ) : (
          <ScanList d={d} onPick={setScan} />
        )}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- chapters

function buildChapters(d: Derived): Chapter[] {
  const out: Chapter[] = [];
  const latest = d.latest;
  const tz = scanTz(latest) ?? d.tz;
  const areas = d.areas.map((a) => a.area.toLowerCase());
  const areaText = areas.length === 1 ? areas[0] : `${areas.slice(0, -1).join(", ")} and ${areas[areas.length - 1]}`;
  const lensScan = d.realPhotos[d.realPhotos.length - 1] ?? latest;

  out.push({
    id: "cover",
    theme: "dark",
    title: "Cover",
    body: (
      <div className={s.cover}>
        <In i={0}>
          <p className="label">{d.isMonthly ? `Monthly report · ${d.periodLabel}` : `Your report · ${d.periodLabel}`}</p>
        </In>
        <div className={s.reticle}>
          <div className={s.coverLens}>
            <ScanPhoto scan={lensScan} priority alt="" />
          </div>
          <svg viewBox="0 0 280 280" aria-hidden>
            <circle cx="140" cy="140" r="138" fill="none" stroke="currentColor" strokeOpacity=".3" />
            {Array.from({ length: 60 }, (_, n) => {
              const a = (n / 60) * Math.PI * 2;
              const r1 = n % 5 ? 132 : 126;
              return (
                <line
                  key={n}
                  x1={140 + Math.cos(a) * r1}
                  y1={140 + Math.sin(a) * r1}
                  x2={140 + Math.cos(a) * 136}
                  y2={140 + Math.sin(a) * 136}
                  stroke="currentColor"
                  strokeOpacity={n % 5 ? 0.25 : 0.6}
                />
              );
            })}
          </svg>
        </div>
        <In i={2}>
          <h1 className={s.coverTitle}>
            {d.firstName},{" "}
            {d.scans.length === 1 ? "here’s your first read" : d.isMonthly ? "here’s your month in skin" : "here’s your skin so far"}
          </h1>
        </In>
        <In i={3}>
          <p className={s.coverSub}>
            {d.scans.length} {d.scans.length === 1 ? "scan" : "scans"} of your {areaText}
          </p>
        </In>
      </div>
    ),
  });

  out.push({
    id: "today",
    theme: "light",
    title: "Your latest scan",
    body: (
      <div className={s.today}>
        <In i={0}>
          <p className="label">
            Latest scan · {fmtDay(latest.takenAt, tz)} · {latest.area}
          </p>
        </In>
        <In i={1} className={s.heroRow}>
          <span className={s.hero}>{latest.scores.overall}</span>
          <span className={s.heroOf}>
            overall
            {d.isBest && <b className={s.best}>{d.isMonthly ? "Your best this month" : "Your best yet"}</b>}
          </span>
        </In>
        <In i={2}>
          <p className={s.lede}>{latest.summary.headline}.</p>
        </In>
        {latest.annotation?.note && (
          <In i={3}>
            <blockquote className={s.said}>
              “{latest.annotation.note}”
              <cite>You, {fmtDay(latest.takenAt, tz)}</cite>
            </blockquote>
          </In>
        )}
        <In i={4} className={s.meterBlock}>
          <ul className={s.meters}>
            {METRICS.map((m, n) => {
              const v = latest.scores[m.key as keyof Scan["scores"]];
              return (
                <li key={m.key}>
                  <span>{m.label}</span>
                  <span className={s.meter} aria-hidden>
                    <i
                      style={{ "--v": (v ?? 0) / 100, animationDelay: `${380 + n * 60}ms` } as CSSProperties}
                    />
                  </span>
                  <b>{v ?? "–"}</b>
                </li>
              );
            })}
          </ul>
          <p className={s.fine}>Every score runs 0 to 100, and higher is always healthier. Calm is the inverse of redness.</p>
        </In>
      </div>
    ),
  });

  if (d.trend) {
    // Up: the three biggest gains. Down or flat: the three biggest movers, either way.
    const gains =
      d.trend.delta >= 0
        ? [...d.changes].filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3)
        : [...d.changes].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);
    out.push({
      id: "better",
      theme: "sand",
      title: "Is it getting better?",
      body: (
        <div className={s.better}>
          <In i={0}>
            <p className="label">Is it getting better?</p>
          </In>
          <In i={1}>
            <h2 className={s.h2}>{trendSentence(d)}</h2>
          </In>
          <In i={2} className={s.chartWrap}>
            <Trend d={d} scans={d.areaScans} />
          </In>
          <In i={3}>
            <div className={s.tiles}>
              {gains.map((c) => (
                <div key={c.key} className={s.tile}>
                  <span>{metricMeta(c.key).label}</span>
                  <b>{signed(c.delta)}</b>
                  <small>
                    {c.from} → {c.to}
                  </small>
                </div>
              ))}
            </div>
          </In>
          <In i={4}>
            <p className={s.fine}>
              Your {d.area.toLowerCase()} only ({d.areaScans.length} scans), so every point compares like with like.
            </p>
          </In>
        </div>
      ),
    });
  } else {
    out.push({
      id: "baseline",
      theme: "sand",
      title: "Your starting point",
      body: (
        <div className={s.better}>
          <In i={0}>
            <p className="label">Your starting point</p>
          </In>
          <In i={1}>
            <h2 className={s.h2}>One scan is a baseline. Two start a story.</h2>
          </In>
          <In i={2}>
            <div className={s.baseline}>
              <span className={s.baseDot} />
              <span className={s.baseLine} />
              <span className={s.baseGhost} />
            </div>
          </In>
          <In i={3}>
            <p className={s.body}>
              Scan your {latest.area.toLowerCase()} again in two or three days, at about the same time. From then on you’ll see
              whether things are moving, and what lines up with it.
            </p>
          </In>
        </div>
      ),
    });
  }

  if (d.dip) {
    const dip = d.dip;
    const meta = metricMeta(dip.change.key);
    const trip = dip.during;
    const env = trip ? d.factors.find((f) => f.spanId === trip.id) : null;
    out.push({
      id: "dip",
      theme: "dark",
      title: "The rough patch",
      body: (
        <div className={s.dip}>
          <In i={0}>
            <p className="label">The rough patch</p>
          </In>
          <In i={1}>
            <h2 className={s.h2}>
              {trip
                ? `${trip.short}, ${fmtRange(trip.start, trip.end)}, was the hardest stretch`
                : `Around ${fmtDay(dayOf(d, dip.scan))} was the hardest stretch`}
            </h2>
          </In>
          <In i={2}>
            <p className={s.body}>
              {meta.label} fell from {dip.change.from} to {dip.change.to}
              {dip.recovered ? `, and you were back on track by ${fmtDay(dayOf(d, dip.recovered))}.` : "."}
              {env && ` ${env.body}`}
            </p>
          </In>
          <In i={3} className={s.chartWrap}>
            <Trend d={d} scans={d.areaScans} metric={dip.change.key} band={trip} tone="dark" height={150} />
          </In>
          {dip.notes.length > 0 && (
            <In i={4}>
              <div className={s.notes}>
                {(trip
                  ? dip.notes.filter((n) => dayOf(d, n.scan) <= trip.end)
                  : dip.notes
                )
                  .slice(-3)
                  .map((n) => (
                  <figure key={n.scan.id}>
                    <blockquote>“{n.note}”</blockquote>
                    <figcaption>{fmtDay(dayOf(d, n.scan))}</figcaption>
                  </figure>
                ))}
              </div>
            </In>
          )}
        </div>
      ),
    });
  }

  const helped = d.factors.filter((f) => f.direction === "helped");
  const held = d.factors.filter((f) => f.direction === "held");
  if (helped.length) {
    out.push({
      id: "helped",
      theme: "light",
      title: "What helped",
      body: <FactorsChapter d={d} label="What helped" title="What lined up with your best weeks" factors={helped} />,
    });
  }
  if (held.length) {
    out.push({
      id: "held",
      theme: "sand",
      title: "What held you back",
      body: <FactorsChapter d={d} label="Worth watching" title="What lined up with the dips" factors={held} />,
    });
  }

  if (lensScan.photos) {
    out.push({ id: "lens", theme: "dark", title: "Under the scope", body: <LightsChapter d={d} scan={lensScan} /> });
  }

  out.push({ id: "end", theme: "light", title: "Your tip", body: null });
  return out;
}

function FactorsChapter({ d, label, title, factors }: { d: Derived; label: string; title: string; factors: Factor[] }) {
  return (
    <div className={s.factors} data-dir={factors[0]?.direction}>
      <In i={0}>
        <p className="label">{label}</p>
      </In>
      <In i={1}>
        <h2 className={s.h2}>{title}</h2>
      </In>
      <In i={2}>
        <Lanes d={d} highlight={factors.map((f) => f.spanId).filter(Boolean) as string[]} />
      </In>
      <ul className={s.factorList}>
        {factors.slice(0, 3).map((f, n) => (
          <In i={3 + n} key={f.id}>
            <li data-dir={f.direction}>
              <span className={s.factorGlyph} aria-hidden>
                <svg viewBox="0 0 12 12" width="12" height="12">
                  <path
                    d={f.direction === "helped" ? "M6 10V2M2.5 5.5L6 2l3.5 3.5" : "M6 2v8M2.5 6.5L6 10l3.5-3.5"}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className={s.factorTitle}>
                  {f.title}
                  <span>{f.when}</span>
                </p>
                <p className={s.factorChange}>
                  {metricMeta(f.change.key).label} {f.change.from} → {f.change.to}
                </p>
                <p className={s.factorBody}>{f.body}</p>
              </div>
            </li>
          </In>
        ))}
      </ul>
    </div>
  );
}

/** Product and travel spans on one shared month axis. */
function Lanes({ d, highlight }: { d: Derived; highlight: string[] }) {
  const total = Math.max(1, new Date(`${d.end}T12:00:00Z`).getTime() - new Date(`${d.start}T12:00:00Z`).getTime());
  const pos = (day: string) => (new Date(`${day}T12:00:00Z`).getTime() - new Date(`${d.start}T12:00:00Z`).getTime()) / total;
  return (
    <div className={s.lanes}>
      {d.spans.map((sp) => {
        const a = Math.max(0, pos(sp.start));
        const b = Math.min(1, pos(sp.end));
        const on = highlight.includes(sp.id);
        return (
          <div key={sp.id} className={s.lane} data-on={on} data-kind={sp.kind}>
            <span className={s.laneName}>{sp.kind === "travel" ? sp.label : sp.short}</span>
            <span className={s.laneTrack}>
              <i style={{ left: `${a * 100}%`, width: `${Math.max(0.03, b - a) * 100}%` }} />
            </span>
          </div>
        );
      })}
      <div className={s.laneAxis}>
        <span>{fmtDay(d.start)}</span>
        <span>{fmtDay(d.end)}</span>
      </div>
    </div>
  );
}

function LightsChapter({ d, scan }: { d: Derived; scan: Scan }) {
  const [light, setLight] = useState<Light>("ambient");
  const [prev, setPrev] = useState<Light | null>(null);
  const current = LIGHTS.find((l) => l.key === light)!;
  const pick = (l: Light) => {
    if (l === light) return;
    setPrev(light);
    setLight(l);
  };
  return (
    <div className={s.lights}>
      <In i={0}>
        <p className="label">Under the scope · {fmtDay(dayOf(d, scan))}</p>
      </In>
      <In i={1}>
        <h2 className={s.h2}>Three lights, one patch of skin</h2>
      </In>
      <In i={2} className={s.lightStage}>
        {prev && <ScanPhoto scan={scan} light={prev} className={s.lightBase} alt="" />}
        <ScanPhoto key={light} scan={scan} light={light} className={s.lightTop} alt={`${scan.area} under ${current.label} light`} />
      </In>
      <In i={3}>
        <div className={s.lightSwitch} role="radiogroup" aria-label="Light">
          {LIGHTS.map((l) => (
            <button key={l.key} role="radio" aria-checked={light === l.key} onClick={() => pick(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
        <p className={s.lightBody}>{current.body}</p>
      </In>
    </div>
  );
}

function EndCard({ d, onAll, onReplay }: { d: Derived; onAll: () => void; onReplay: () => void }) {
  return (
    <div className={s.end}>
      <In i={0}>
        <p className="label">One thing to try this week</p>
      </In>
      <In i={1}>
        <p className={s.tipText}>{d.latest.summary.tip}</p>
      </In>
      <In i={2}>
        <p className={s.signoff}>
          {d.trend && d.trend.delta >= 3
            ? "Whatever you’re doing lately, your skin likes it. Keep going."
            : d.trend
              ? "Skin takes its time. Keep scanning and we’ll keep reading it with you."
              : "We’ll check in again after your next scan."}
        </p>
      </In>
      <In i={3} className={s.endActions}>
        <button className={s.primary} onClick={onAll}>
          {d.scans.length === 1 ? "See your scan" : `See all ${d.scans.length} scans`}
        </button>
        <button className={s.secondary} onClick={onReplay}>
          Watch again
        </button>
      </In>
    </div>
  );
}

function ScanList({ d, onPick }: { d: Derived; onPick: (s: Scan) => void }) {
  const rows = [...d.scans].reverse();
  const listRef = useRef<HTMLUListElement>(null);
  return (
    <div className={s.list}>
      <h2 className={s.listTitle}>All scans</h2>
      <p className={s.listSub}>Newest first. Tap one to see everything behind it.</p>
      <ul ref={listRef}>
        {rows.map((scan) => (
          <li key={scan.id}>
            <button onClick={() => onPick(scan)}>
              <span className={s.thumb}>
                <ScanPhoto scan={scan} alt="" />
              </span>
              <span className={s.rowText}>
                <b>{fmtDay(scan.takenAt, scanTz(scan) ?? d.tz)}</b>
                <small>
                  {scan.area}
                  {scan.annotation?.note ? ` · “${scan.annotation.note}”` : ""}
                </small>
              </span>
              <span className={s.rowScore}>{scan.scores.overall}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
