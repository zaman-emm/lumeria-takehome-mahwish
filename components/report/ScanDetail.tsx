"use client";

import { useState } from "react";
import {
  METRICS,
  dayOf,
  faceMarks,
  fmtDay,
  fmtTime,
  obsLabel,
  previousSameArea,
  scanTz,
  shortTip,
  signed,
  spansOn,
  type Derived,
} from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { LIGHTS, ScanPhoto, type Light } from "./ScanPhoto";
import { FaceMap, Icon, TickAxis, TickBar, onFace } from "./Visuals";
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
  const marks = faceMarks(scan.summary.observations);

  const context = [
    sleep != null && { k: "Sleep", v: `${sleep} h` },
    water != null && { k: "Water", v: `${water} glasses` },
    stress != null && {
      k: "Stress",
      v: ["", "Relaxed", "Low", "Some", "High", "Very high"][stress] ?? `${stress}/5`,
    },
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

      <div className={s.detailScore}>
        <strong>{scan.scores.overall}</strong>
        <span>
          Overall
          {prev && (
            <>
              <br />
              <b>{signed(scan.scores.overall - prev.scores.overall)}</b> since {fmtDay(prev.takenAt, scanTz(prev) ?? d.tz)}
            </>
          )}
        </span>
      </div>

      <div>
        <ul className={s.detailMetrics}>
          {METRICS.map((m) => {
            const v = scan.scores[m.key as keyof Scan["scores"]];
            const pv = prev?.scores[m.key as keyof Scan["scores"]];
            return (
              <li key={m.key} aria-label={`${m.label} ${v ?? "not read"}${v != null && pv != null ? `, ${signed(v - pv)}` : ""}`}>
                <span className={s.mName}>{m.label}</span>
                <TickBar value={v} prev={pv} />
                <span className={s.mVal}>{v ?? "–"}</span>
                <span className={s.mDelta}>{v != null && pv != null ? signed(v - pv) : ""}</span>
              </li>
            );
          })}
        </ul>
        <div className={s.axisRow}>
          <TickAxis />
        </div>
        {prev && (
          <p className={s.fine}>
            <i className={s.wasKey} aria-hidden />
            Last scan of this spot, {fmtDay(prev.takenAt, scanTz(prev) ?? d.tz)}
          </p>
        )}
      </div>
      {scan.scores.oiliness == null && <p className={s.fine}>Oil balance couldn’t be read on this scan.</p>}

      <section className={s.detailBlock}>
        {onFace(scan.area) && marks.length > 0 ? (
          <FaceMap marks={marks} area={scan.area} />
        ) : (
          <ul className={s.obs}>
            {scan.summary.observations.map(obsLabel).map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        )}
        <p className={s.tip}>
          <Icon name="spark" size={16} />
          {shortTip(scan.summary.tip)}
        </p>
        <p className={s.fine}>Read from your photo. Not a diagnosis.</p>
      </section>

      {a && (a.note || a.tags.length > 0) && (
        <section className={s.detailBlock}>
          {a.note && <blockquote className={s.quote}>“{a.note}”</blockquote>}
          {a.tags.length > 0 && <p className={s.tags}>{a.tags.join(" · ")}</p>}
        </section>
      )}

      {context.length > 0 && (
        <section className={s.detailBlock}>
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
          <ul className={s.routine}>
            {routine.map((r) => (
              <li key={r.id}>
                <Icon name="product" size={16} />
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
