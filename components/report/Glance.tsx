"use client";

import {
  EXTRAS,
  METRICS,
  faceMarks,
  fmtDay,
  obsLabel,
  score,
  scanTz,
  shortTip,
  signed,
  type Derived,
  type Rhythm,
} from "@/lib/insights";
import type { ReportActions } from "./Report";
import { FaceMap, Gauge, Icon, RhythmStrip, onFace } from "./Visuals";
import r from "./report.module.css";

// "How is my skin today?" Rings first, then the face map of what we saw, then
// the rhythm. Words only where a picture can't carry it.

export function Glance({ d, rh, actions }: { d: Derived; rh: Rhythm; actions: ReportActions }) {
  const latest = d.latest;
  const tz = scanTz(latest) ?? d.tz;
  const prevSame = d.trend ? d.trend.from : null;
  const marks = faceMarks(latest.summary.observations);
  const mapped = onFace(latest.area) && marks.length > 0;

  return (
    <>
      <section className={r.card}>
        <ul className={r.gauges}>
          {METRICS.map((m, i) => {
            const v = score(latest, m.key);
            const p = prevSame ? score(prevSame, m.key) : null;
            return (
              <li key={m.key}>
                <button
                  onClick={() => actions.openMetric(m.key)}
                  aria-label={`${m.label} ${v ?? "not measured"}. See the trend.`}
                >
                  <Gauge value={v} size={54} delay={i * 70} />
                  <span className={r.gLabel}>{m.label}</span>
                  <span className={r.gDelta}>
                    {v != null && p != null && (
                      <>
                        {v - p !== 0 && <Icon name={v > p ? "up" : "down"} size={11} />}
                        {signed(v - p)}
                      </>
                    )}
                    <Icon name="chevronR" size={11} className={r.gGo} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className={r.legend}>
          <span>0–100 · Higher is better</span>
          {d.trend && <span>Change since {fmtDay(d.trend.from.takenAt, scanTz(d.trend.from) ?? tz)}</span>}
        </p>
      </section>

      <section className={r.card}>
        {mapped ? (
          <FaceMap marks={marks} area={latest.area} />
        ) : (
          <ul className={r.seen}>
            {latest.summary.observations.map(obsLabel).map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        )}
        <p className={r.tip}>
          <Icon name="spark" size={16} />
          {shortTip(latest.summary.tip)}
        </p>
        <p className={r.aiNote}>Read from your photo. Not a diagnosis.</p>
        <button className={r.textBtn} onClick={() => actions.openScan(latest)}>
          This scan, in full
          <Icon name="chevronR" size={12} />
        </button>
      </section>

      {rh.days > 1 && (
        <section className={r.rhythm} aria-label="Your scanning rhythm">
          <RhythmStrip r={rh} tone="dark" />
          <dl className={r.rhythmStats}>
            <div>
              <dt>Days scanned</dt>
              <dd>
                {rh.scanDays}
                <small>/{rh.days}</small>
              </dd>
            </div>
            {rh.longestRun >= 2 && (
              <div>
                <dt>Best streak</dt>
                <dd>
                  {rh.longestRun}
                  <small> days</small>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <details className={r.more}>
        <summary>
          More metrics <span>· {EXTRAS.length}</span>
          <Icon name="chevronR" size={14} />
        </summary>
        <ul className={r.gauges} data-cols="3">
          {EXTRAS.map((m, i) => {
            const v = score(latest, m.key);
            return (
              <li key={m.key}>
                <button
                  onClick={() => actions.openMetric(m.key)}
                  aria-label={`${m.label} ${v ?? "not read"}. See how it’s read.`}
                >
                  <Gauge value={v} size={54} delay={i * 70} />
                  <span className={r.gLabel}>{m.label}</span>
                  <span className={r.tag}>{m.source === "derived" ? "Derived" : "Preview"}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <dl className={r.profile}>
          <div>
            <dt>Skin type</dt>
            <dd>{d.report.person.skinType ?? "Not set"}</dd>
          </div>
          <div>
            <dt>Under eyes</dt>
            <dd data-muted>Needs the under-eye scan</dd>
          </div>
        </dl>
      </details>
    </>
  );
}
