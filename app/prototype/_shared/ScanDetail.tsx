"use client";

import { useState } from "react";
import {
  METRICS,
  band,
  dayOf,
  fmtDay,
  fmtTime,
  previousSameArea,
  scanTz,
  signed,
  spansOn,
  type Derived,
} from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { LIGHTS, ScanPhoto, type Light } from "./ScanPhoto";
import s from "./shared.module.css";

/** Everything behind one scan. Shared by the sheets in Story and Journal. */
export function ScanDetail({ d, scan }: { d: Derived; scan: Scan }) {
  const [light, setLight] = useState<Light>("ambient");
  const tz = scanTz(scan) ?? d.tz;
  const prev = previousSameArea(d, scan);
  const routine = spansOn(d, dayOf(d, scan)).filter((sp) => sp.kind === "product");
  const a = scan.annotation;
  const sleep = scan.health?.sleepHours ?? scan.checkin?.sleepHours;
  const water = scan.health?.waterGlasses ?? scan.checkin?.waterGlasses;
  const stress = a?.stress ?? scan.checkin?.stress;
  const env = scan.location?.environment;

  const context = [
    sleep != null && { k: "Sleep", v: `${sleep} h` },
    water != null && { k: "Water", v: `${water} glasses` },
    stress != null && { k: "Stress", v: ["", "Relaxed", "Low", "Some", "High", "Very high"][stress] ?? `${stress}/5` },
    scan.health && { k: "Cycle", v: `Day ${scan.health.cycleDay}` },
    env && { k: "Humidity", v: `${env.humidityPct}%` },
    env && { k: "UV", v: `${env.uvIndexMax}` },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <article className={s.detail}>
      <header className={s.detailHead}>
        <p className="label">
          {scan.area}
          {scan.location && ` · ${scan.location.city}`}
        </p>
        <h2>
          {fmtDay(scan.takenAt, tz)}
          <span>{fmtTime(scan.takenAt, tz)}</span>
        </h2>
      </header>

      <div className={s.detailPhoto}>
        <ScanPhoto scan={scan} light={light} alt={`${scan.area} on ${fmtDay(scan.takenAt, tz)}`} />
      </div>
      {scan.photos && (
        <div className={s.lightSwitch} role="radiogroup" aria-label="Light">
          {LIGHTS.map((l) => (
            <button key={l.key} role="radio" aria-checked={light === l.key} onClick={() => setLight(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
      )}
      {scan.photos && <p className={s.lightNote}>{LIGHTS.find((l) => l.key === light)!.body}</p>}

      <div className={s.detailScore}>
        <strong>{scan.scores.overall}</strong>
        <div>
          <p>{scan.summary.headline}</p>
          {prev && (
            <span>
              {signed(scan.scores.overall - prev.scores.overall)} vs {fmtDay(prev.takenAt, scanTz(prev) ?? d.tz)}
            </span>
          )}
        </div>
      </div>

      <ul className={s.detailMetrics}>
        {METRICS.map((m) => {
          const v = scan.scores[m.key as keyof Scan["scores"]];
          const pv = prev?.scores[m.key as keyof Scan["scores"]];
          return (
            <li key={m.key}>
              <span className={s.mName}>{m.label}</span>
              <span className={s.mBar} aria-hidden>
                <i style={{ transform: `scaleX(${(v ?? 0) / 100})` }} data-tone={band(v).tone} />
              </span>
              <span className={s.mVal}>{v ?? "–"}</span>
              <span className={s.mDelta}>{v != null && pv != null ? signed(v - pv) : ""}</span>
            </li>
          );
        })}
      </ul>
      {scan.scores.oiliness == null && <p className={s.fine}>We couldn’t read oil balance on this scan.</p>}

      <section className={s.detailBlock}>
        <p className="label">What we saw</p>
        <ul className={s.obs}>
          {scan.summary.observations.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </section>

      <section className={s.tip}>
        <p className="label">Try this</p>
        <p>{scan.summary.tip}</p>
      </section>

      {a && (a.note || a.tags.length > 0) && (
        <section className={s.detailBlock}>
          <p className="label">You wrote</p>
          {a.note && <blockquote className={s.quote}>“{a.note}”</blockquote>}
          {a.tags.length > 0 && (
            <div className={s.tags}>
              {a.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          )}
        </section>
      )}

      {context.length > 0 && (
        <section className={s.detailBlock}>
          <p className="label">That day</p>
          <dl className={s.context}>
            {context.map((c) => (
              <div key={c.k}>
                <dt>{c.k}</dt>
                <dd>{c.v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {routine.length > 0 && (
        <section className={s.detailBlock}>
          <p className="label">In your routine</p>
          <ul className={s.routine}>
            {routine.map((r) => (
              <li key={r.id}>
                {r.label}
                <span>{r.product?.usage}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
