"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  METRICS,
  dayOf,
  fmtDay,
  fmtTime,
  metricMeta,
  previousSameArea,
  scanTz,
  signed,
  spansOn,
  trendSentence,
  type Derived,
} from "@/lib/insights";
import type { Scan } from "@/lib/types";
import type { ReportState } from "@/lib/useReport";
import { LIGHTS, ScanPhoto, type Light } from "../../_shared/ScanPhoto";
import { Sheet } from "../../_shared/Sheet";
import { StateScreen } from "../../_shared/StateScreen";
import { Trend } from "../../_shared/Trend";
import s from "./lens.module.css";

// Direction 3, "Lens": the scope is the interface. One thumb scrubs a tape of
// every scan along the bottom, and the lens, scores and that day's context
// follow it. The month is something you move through, not read about.

export function Lens({ state }: { state: ReportState }) {
  if (state.status !== "ready") return <StateScreen state={state} tone="dark" />;
  return <LensReady d={state.data} />;
}

function LensReady({ d }: { d: Derived }) {
  const [area, setArea] = useState<string | null>(null);
  const tape = useMemo(() => (area ? d.scans.filter((x) => x.area === area) : d.scans), [d.scans, area]);
  const [idx, setIdx] = useState(tape.length - 1);
  const [light, setLight] = useState<Light>("ambient");
  const [prevLight, setPrevLight] = useState<Light | null>(null);
  const [month, setMonth] = useState(false);

  useEffect(() => setIdx(tape.length - 1), [tape]);

  const scan = tape[Math.min(idx, tape.length - 1)];
  const tz = scanTz(scan) ?? d.tz;
  const prev = previousSameArea(d, scan);
  const hasLights = Boolean(scan.photos);
  const shownLight = hasLights ? light : "ambient";
  const active = spansOn(d, dayOf(d, scan));
  const sleep = scan.health?.sleepHours ?? scan.checkin?.sleepHours;
  const env = scan.location?.environment;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (month || (e.target as HTMLElement).closest("[role=slider]")) return;
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx((i) => Math.min(tape.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tape.length, month]);

  const pickLight = (l: Light) => {
    if (l === light) return;
    setPrevLight(light);
    setLight(l);
  };

  const context = [
    scan.location && { k: scan.location.city, v: env ? `${env.humidityPct}% humid · UV ${env.uvIndexMax}` : "" },
    sleep != null && { k: "Sleep", v: `${sleep} h` },
    scan.health && { k: "Cycle", v: `Day ${scan.health.cycleDay}` },
    (scan.annotation?.stress ?? scan.checkin?.stress) != null && {
      k: "Stress",
      v: `${scan.annotation?.stress ?? scan.checkin?.stress} of 5`,
    },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div className={s.root}>
      <header className={s.top}>
        <div>
          <p className="label">{d.firstName}’s lens</p>
          <p className={s.when}>
            {fmtDay(scan.takenAt, tz)}
            <span>
              {fmtTime(scan.takenAt, tz)} · {scan.area}
            </span>
          </p>
        </div>
        <button className={s.monthBtn} onClick={() => setMonth(true)}>
          {d.trend ? "Month" : "About"}
        </button>
      </header>

      <main className={s.main}>
        <div className={s.lensWrap}>
          <svg className={s.ring} viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(244,239,230,.1)" strokeWidth="1" />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="var(--bronze)"
              strokeWidth="1.4"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              style={{ strokeDashoffset: 100 - scan.scores.overall }}
              transform="rotate(-90 50 50)"
              className={s.arc}
            />
          </svg>
          <div className={s.lens}>
            {prevLight && hasLights && <ScanPhoto scan={scan} light={prevLight} className={s.base} alt="" />}
            <ScanPhoto
              key={`${scan.id}-${shownLight}`}
              scan={scan}
              light={shownLight}
              className={prevLight && hasLights ? s.wipe : s.photo}
              alt={`${scan.area} on ${fmtDay(scan.takenAt, tz)}, ${LIGHTS.find((l) => l.key === shownLight)!.label} light`}
              priority
            />
          </div>
        </div>

        <div className={s.scoreRow}>
          <span className={s.score} aria-live="polite">
            {scan.scores.overall}
          </span>
          <span className={s.scoreMeta}>
            <span>overall</span>
            {prev ? (
              <span>
                {signed(scan.scores.overall - prev.scores.overall)} vs {fmtDay(dayOf(d, prev))}
              </span>
            ) : (
              <span>First {scan.area.toLowerCase()} scan</span>
            )}
          </span>
        </div>

        <div className={s.lights} role="radiogroup" aria-label="Light">
          {LIGHTS.map((l) => (
            <button
              key={l.key}
              role="radio"
              aria-checked={shownLight === l.key}
              disabled={!hasLights && l.key !== "ambient"}
              onClick={() => pickLight(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className={s.lightNote}>
          {hasLights ? LIGHTS.find((l) => l.key === shownLight)!.body : "Polarized and UV views come with full scope scans."}
        </p>

        <ul className={s.metrics}>
          {METRICS.map((m) => {
            const v = scan.scores[m.key as keyof Scan["scores"]];
            const pv = prev?.scores[m.key as keyof Scan["scores"]];
            return (
              <li key={m.key}>
                <span>{m.label}</span>
                <b>{v ?? "–"}</b>
                <small>{v != null && pv != null ? signed(v - pv) : v == null ? "not read" : " "}</small>
              </li>
            );
          })}
        </ul>

        <p className={s.read}>
          {scan.annotation?.note ? (
            <>
              <span className="label">You wrote</span>“{scan.annotation.note}”
            </>
          ) : (
            <>
              <span className="label">We saw</span>
              {scan.summary.observations.join(" ")}
            </>
          )}
        </p>

        {(context.length > 0 || active.length > 0) && (
          <div className={s.context}>
            {active.map((sp) => (
              <span key={sp.id} className={s.span} data-kind={sp.kind}>
                {sp.kind === "travel" ? sp.label : sp.short}
              </span>
            ))}
            {context.map((c) => (
              <span key={c.k} className={s.ctx}>
                <b>{c.k}</b>
                {c.v}
              </span>
            ))}
          </div>
        )}
      </main>

      <Dock d={d} tape={tape} idx={idx} setIdx={setIdx} area={area} setArea={setArea} />

      <Sheet open={month} onClose={() => setMonth(false)} label="Your month" tone="dark">
        <MonthSheet d={d} />
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- dock

function Dock({
  d,
  tape,
  idx,
  setIdx,
  area,
  setArea,
}: {
  d: Derived;
  tape: Scan[];
  idx: number;
  setIdx: (i: number) => void;
  area: string | null;
  setArea: (a: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const n = tape.length;
  const vals = tape.map((x) => x.scores.overall);
  const lo = Math.min(...vals) - 6;
  const hi = Math.max(...vals);
  const cur = tape[Math.min(idx, n - 1)];

  const fromX = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const f = (clientX - r.left) / r.width;
    return Math.max(0, Math.min(n - 1, Math.round(f * n - 0.5)));
  };

  // Which slots each span covers, by scan index.
  const lanes = d.spans
    .map((sp) => {
      const hit = tape.map((x, i) => [dayOf(d, x), i] as const).filter(([day]) => day >= sp.start && day <= sp.end);
      return hit.length ? { sp, a: hit[0][1], b: hit[hit.length - 1][1] } : null;
    })
    .filter(Boolean)
    // A span covering nearly the whole tape (an everyday moisturizer) says nothing here.
    .filter((l) => (l!.b - l!.a + 1) / n < 0.9) as { sp: Derived["spans"][number]; a: number; b: number }[];

  return (
    <div className={s.dock}>
      <div className={s.dockHead}>
        <p>
          {d.trend ? `${signed(d.trend.delta)} since ${fmtDay(dayOf(d, d.trend.from))}` : "Your first scan"}
          {d.trend && d.areas.length > 1 && <span className={s.dockArea}> on your {d.area.toLowerCase()}</span>}
        </p>
        {d.areas.length > 1 && (
          <label className={s.areaPick}>
            <span className="sr-only">Body area</span>
            <select value={area ?? ""} onChange={(e) => setArea(e.target.value || null)}>
              <option value="">All areas</option>
              {d.areas.map((a) => (
                <option key={a.area} value={a.area}>
                  {a.area} ({a.count})
                </option>
              ))}
            </select>
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden>
              <path d="M3 4.5L6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </label>
        )}
      </div>

      {lanes.length > 0 && (
        <div className={s.lanes} aria-hidden>
          {lanes.map(({ sp, a, b }) => {
            const left = a / n;
            const name = sp.kind === "travel" ? sp.short : sp.short;
            return (
              <div key={sp.id} className={s.lane} data-kind={sp.kind} data-on={idx >= a && idx <= b}>
                <i style={{ left: `${left * 100}%`, width: `${((b - a + 1) / n) * 100}%` } as CSSProperties} />
                <b style={(left < 0.6 ? { left: `${left * 100}%` } : { right: `${(1 - (b + 1) / n) * 100}%` }) as CSSProperties}>
                  {name}
                </b>
              </div>
            );
          })}
        </div>
      )}

      <div
        ref={ref}
        className={s.tape}
        role="slider"
        tabIndex={0}
        aria-label="Scans over time"
        aria-valuemin={1}
        aria-valuemax={n}
        aria-valuenow={idx + 1}
        aria-valuetext={`${fmtDay(cur.takenAt, scanTz(cur) ?? d.tz)}, ${cur.area}, overall ${cur.scores.overall}`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setIdx(fromX(e.clientX));
        }}
        onPointerMove={(e) => dragging.current && setIdx(fromX(e.clientX))}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setIdx(Math.max(0, idx - 1));
          if (e.key === "ArrowRight") setIdx(Math.min(n - 1, idx + 1));
          if (e.key === "Home") setIdx(0);
          if (e.key === "End") setIdx(n - 1);
        }}
      >
        {tape.map((x, i) => (
          <span key={x.id} className={s.slot} data-on={i === idx}>
            <i style={{ "--h": (x.scores.overall - lo) / (hi - lo || 1), "--d": `${i * 14}ms` } as CSSProperties} />
          </span>
        ))}
      </div>
      <div className={s.axis}>
        <span>{fmtDay(dayOf(d, tape[0]))}</span>
        <span>{n > 1 ? "Drag to move through your scans" : ""}</span>
        <span>{fmtDay(dayOf(d, tape[n - 1]))}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- month sheet

function MonthSheet({ d }: { d: Derived }) {
  if (!d.trend) {
    return (
      <div className={s.sheet}>
        <p className="label">Your first scan</p>
        <h2>This is your baseline</h2>
        <p className={s.sheetBody}>
          Scan your {d.latest.area.toLowerCase()} again in two or three days. Each new scan adds a bar to the tape, and the month view
          fills in as you go.
        </p>
      </div>
    );
  }
  return (
    <div className={s.sheet}>
      <p className="label">
        {d.area} · {d.periodLabel}
      </p>
      <h2>{trendSentence(d)}</h2>
      <div className={s.sheetChart}>
        <Trend d={d} scans={d.areaScans} tone="dark" height={170} band={d.dip?.during ?? null} />
      </div>
      {d.factors.length > 0 && (
        <>
          <p className="label">What lined up with it</p>
          <ul className={s.factors}>
            {d.factors.map((f) => (
              <li key={f.id} data-dir={f.direction}>
                <span aria-label={f.direction === "helped" ? "Helped" : "Held back"}>{f.direction === "helped" ? "↑" : "↓"}</span>
                <div>
                  <b>{f.title}</b>
                  <small>
                    {f.when} · {metricMeta(f.change.key).label} {f.change.from} → {f.change.to}
                  </small>
                  <p>{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className={s.sheetTip}>
        <p className="label">One thing to try</p>
        <p>{d.latest.summary.tip}</p>
      </div>
    </div>
  );
}
