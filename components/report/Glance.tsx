"use client";

import { EXTRAS, METRICS, fmtDay, metricMeta, score, scanTz, signed, type Derived, type Rhythm, type ScoreKey } from "@/lib/insights";
import type { ReportActions } from "./Report";
import { Badge, Gauge, Icon, RhythmStrip } from "./Visuals";
import r from "./report.module.css";

// "How is my skin today?" Rings first, words second: five scores you can read
// in a second, what's going well and what to watch, then the rhythm that
// makes it all trustworthy.

interface Chip {
  key: ScoreKey;
  text: string;
}

/** Strengths and things to watch, from change when we have it, level when we don't. */
function chips(d: Derived): { good: Chip[]; watch: Chip[] } {
  const keys = [...METRICS, EXTRAS[0]].map((m) => m.key);
  if (d.trend) {
    const moves = keys
      .map((key) => {
        const a = score(d.trend!.from, key);
        const b = score(d.trend!.to, key);
        return a == null || b == null ? null : { key, delta: b - a };
      })
      .filter((m): m is { key: ScoreKey; delta: number } => m != null);
    return {
      good: moves
        .filter((m) => m.delta >= 3)
        .sort((a, b) => b.delta - a.delta)
        .map((m) => ({ key: m.key, text: signed(m.delta) })),
      watch: moves
        .filter((m) => m.delta <= -3)
        .sort((a, b) => a.delta - b.delta)
        .map((m) => ({ key: m.key, text: signed(m.delta) })),
    };
  }
  const levels = keys
    .map((key) => ({ key, v: score(d.latest, key) }))
    .filter((m): m is { key: ScoreKey; v: number } => m.v != null);
  return {
    good: levels.filter((m) => m.v >= 70).sort((a, b) => b.v - a.v).map((m) => ({ key: m.key, text: String(m.v) })),
    watch: levels.filter((m) => m.v < 60).sort((a, b) => a.v - b.v).map((m) => ({ key: m.key, text: String(m.v) })),
  };
}

export function Glance({ d, rh, actions }: { d: Derived; rh: Rhythm; actions: ReportActions }) {
  const latest = d.latest;
  const tz = scanTz(latest) ?? d.tz;
  const prevSame = d.trend ? d.trend.from : null;
  const { good, watch } = chips(d);

  return (
    <>
      <section className={r.card}>
        <header className={r.cardHead}>
          <span className="label">Today’s read</span>
          <span className={r.cardMeta}>
            {latest.area} · {fmtDay(latest.takenAt, tz)}
          </span>
        </header>
        <ul className={r.gauges}>
          {METRICS.map((m, i) => {
            const v = score(latest, m.key);
            const p = prevSame ? score(prevSame, m.key) : null;
            return (
              <li key={m.key}>
                <button onClick={() => actions.openMetric(m.key)} aria-label={`${m.label} ${v ?? "not measured"}. See the trend.`}>
                  <Gauge value={v} size={54} delay={i * 70} />
                  <span className={r.gLabel}>{m.label}</span>
                  {v != null && p != null && (
                    <span className={r.gDelta}>
                      {v - p !== 0 && <Icon name={v > p ? "up" : "down"} size={10} />}
                      {signed(v - p)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className={r.hint}>
          Every score runs 0 to 100, and higher is always healthier. {d.trend ? `Changes are since ${fmtDay(d.trend.from.takenAt, tz)}. ` : ""}
          Tap a ring to see its story.
        </p>
      </section>

      <section className={r.card}>
        <div className={r.chipBlock}>
          <span className="label">Going well</span>
          <div className={r.chipRow}>
            {good.length ? (
              good.map((c) => (
                <button key={c.key} className={r.chip} data-tone="good" onClick={() => actions.openMetric(c.key)}>
                  <Icon name={c.key} size={14} />
                  {metricMeta(c.key).label}
                  <b>{c.text}</b>
                </button>
              ))
            ) : (
              <span className={r.chipEmpty}>
                {d.trend ? "Nothing climbed this time, and that’s okay" : "Your first read sets the bar"}
              </span>
            )}
          </div>
        </div>
        <div className={r.chipBlock}>
          <span className="label">Worth watching</span>
          <div className={r.chipRow}>
            {watch.length ? (
              watch.map((c) => (
                <button key={c.key} className={r.chip} data-tone="watch" onClick={() => actions.openMetric(c.key)}>
                  <Icon name={c.key} size={14} />
                  {metricMeta(c.key).label}
                  <b>{c.text}</b>
                </button>
              ))
            ) : (
              <span className={r.chipEmpty}>{d.trend ? "Nothing slipping. Lovely." : "Nothing to worry about"}</span>
            )}
          </div>
        </div>
      </section>

      <section className={r.rhythm}>
        <header className={r.cardHead}>
          <span className="label">Your rhythm</span>
          <span className={r.cardMeta}>
            {rh.scanDays} of {rh.days} {rh.days === 1 ? "day" : "days"}
          </span>
        </header>
        <div className={r.rhythmTop}>
          <b className={r.bigNum}>{rh.scans}</b>
          <span>
            {rh.scans === 1 ? "scan" : "scans"}
            {rh.longestRun >= 3 && (
              <>
                <br />
                {rh.longestRun} days in a row at best
              </>
            )}
          </span>
        </div>
        {rh.days > 1 && <RhythmStrip r={rh} tone="dark" />}
        <h2 className={r.rhythmTitle}>{rh.title}</h2>
        <p className={r.rhythmBody}>{rh.body}</p>
        <div className={r.badges}>
          {rh.milestones.map((m) => (
            <Badge key={m.id + m.label} m={m} tone="dark" />
          ))}
        </div>
      </section>

      <section className={r.card}>
        <header className={r.cardHead}>
          <span className="label">Also tracked</span>
          <span className={r.cardMeta}>New</span>
        </header>
        <ul className={r.gauges} data-cols="3">
          {EXTRAS.map((m, i) => {
            const v = score(latest, m.key);
            return (
              <li key={m.key}>
                <button onClick={() => actions.openMetric(m.key)} aria-label={`${m.label} ${v ?? "not read"}. See how it’s read.`}>
                  <Gauge value={v} size={54} delay={i * 70} />
                  <span className={r.gLabel}>{m.label}</span>
                  <span className={r.tag}>{m.source === "derived" ? "Derived" : "Preview"}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className={r.duo}>
          <div className={r.mini}>
            <FaceMap type={d.report.person.skinType} />
            <span>
              <span className="label">Skin type</span>
              <b>{d.report.person.skinType ?? "Not set yet"}</b>
              <small>{d.report.person.skinType ? "From your profile" : "Add it in your profile so tips fit you"}</small>
            </span>
          </div>
          <div className={r.mini} data-locked>
            <span className={r.miniIcon}>
              <Icon name="lock" size={16} />
            </span>
            <span>
              <span className="label">Under eyes</span>
              <b>Coming soon</b>
              <small>Needs the new under-eye scan</small>
            </span>
          </div>
        </div>
      </section>

      <section className={r.card}>
        <header className={r.cardHead}>
          <span className="label">What we saw</span>
        </header>
        <p className={r.sawHead}>{latest.summary.headline}</p>
        <ul className={r.saw}>
          {latest.summary.observations.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
        <div className={r.tip}>
          <Icon name="spark" size={16} />
          <span>
            <span className="label">One thing to try</span>
            <p>{latest.summary.tip}</p>
          </span>
        </div>
        <button className={r.textBtn} onClick={() => actions.openScan(latest)}>
          See everything from this scan
          <Icon name="chevronR" size={12} />
        </button>
      </section>
    </>
  );
}

/** A tiny face with the oilier zones shaded: profile context, drawn not diagnosed. */
function FaceMap({ type }: { type: string | null }) {
  const t = (type ?? "").toLowerCase();
  const tZone = t === "combination" || t === "oily";
  const cheeks = t === "oily";
  const dry = t === "dry";
  return (
    <svg className={r.face} viewBox="0 0 40 48" aria-hidden>
      <ellipse cx="20" cy="24" rx="15" ry="20" fill={dry ? "var(--bronze-soft)" : "var(--bone)"} stroke="var(--sand-deep)" />
      {tZone && <path d="M10 13h20v6h-7v17h-6V19h-7z" fill="var(--bronze)" opacity=".55" />}
      {cheeks && (
        <>
          <circle cx="11" cy="28" r="4.5" fill="var(--bronze)" opacity=".4" />
          <circle cx="29" cy="28" r="4.5" fill="var(--bronze)" opacity=".4" />
        </>
      )}
      {!type && <text x="20" y="28" textAnchor="middle" fontSize="11" fill="var(--bark-3)">?</text>}
    </svg>
  );
}
