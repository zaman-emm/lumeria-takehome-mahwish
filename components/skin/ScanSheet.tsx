"use client";

import { useState, type CSSProperties } from "react";
import { METRICS, dayOf, faceMarks, fmtDay, fmtTime, previousSameArea, scanTz, score, shortTip, signed, spansOn } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { useReportApi } from "./context";
import { Icon } from "./Icon";
import { NoteCard } from "./notes";
import { FaceMap, LIGHTS, Photo, ScheduleChip, TickAxis, Ticks, type Light } from "./ui";
import m from "./sheets.module.css";

// Everything about one scan: the photo under each light, every score against
// the last scan of the same spot, what it saw, what was noted, and the day's
// context.

export function ScanSheet({ scan }: { scan: Scan }) {
  const { d } = useReportApi();
  const [light, setLight] = useState<Light>("ambient");
  const tz = scanTz(scan) ?? d.tz;
  const prev = previousSameArea(d, scan);
  const delta = prev ? scan.scores.overall - prev.scores.overall : null;
  const ann = scan.annotation;
  const h = scan.health;
  const env = scan.location?.environment;
  const products = spansOn(d, dayOf(d, scan)).filter((s) => s.kind === "product" && s.product);
  const li = LIGHTS.findIndex((l) => l.key === light);

  const context: [string, string][] = h
    ? [
        ["Sleep", `${h.sleepHours} h`],
        ["Water", `${h.waterGlasses} glasses`],
        ["Cycle", `Day ${h.cycleDay}`],
        ["Steps", h.steps.toLocaleString("en-US")],
        ["Resting HR", `${h.restingHeartRate} bpm`],
        ["HRV", `${h.hrvMs} ms`],
      ]
    : scan.checkin
      ? [
          ["Sleep", `${scan.checkin.sleepHours} h`],
          ["Water", `${scan.checkin.waterGlasses} glasses`],
          ["Stress", `${scan.checkin.stress} of 5`],
        ]
      : [];
  const stress = ann?.stress ?? scan.checkin?.stress;

  return (
    <article className={m.scan}>
      <header className={m.scanHead}>
        <h2>
          {fmtDay(scan.takenAt, tz)}
          <span>{fmtTime(scan.takenAt, tz)}</span>
        </h2>
        <div className={m.scanSub}>
          <p>{scan.summary.headline}</p>
          {scan.location && (
            <span className={m.place}>
              <Icon name="pin" size={13} />
              {scan.location.city}
            </span>
          )}
        </div>
      </header>

      <div className={m.photo}>
        {scan.photos ? (
          LIGHTS.map((l) => (
            <Photo key={l.key} scan={scan} light={l.key} className={m.photoImg} on={l.key === light} alt={`${scan.area}, ${l.label.toLowerCase()} light`} />
          ))
        ) : (
          <Photo scan={scan} className={m.photoImg} />
        )}
      </div>
      {scan.photos && (
        <div className={m.lights} role="radiogroup" aria-label="Light" style={{ "--i": li } as CSSProperties}>
          <i className={m.lightKnob} aria-hidden />
          {LIGHTS.map((l) => (
            <button key={l.key} role="radio" aria-checked={l.key === light} onClick={() => setLight(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
      )}

      <i className={m.band} aria-hidden />
      <p className={m.eyebrow}>{scan.area}</p>
      <div className={m.overall}>
        <b>{scan.scores.overall}</b>
        <span>
          Overall
          {prev && delta != null && (
            <span className={m.since}>
              <strong>{signed(delta)}</strong> since {fmtDay(prev.takenAt, scanTz(prev) ?? d.tz)}
            </span>
          )}
        </span>
      </div>

      <div className={m.tickTable}>
        {METRICS.map((mm, i) => {
          const v = score(scan, mm.key);
          const pv = prev ? score(prev, mm.key) : null;
          return (
            <div key={mm.key} className={m.tickRow}>
              <span className={m.tickLabel}>{mm.label}</span>
              <Ticks value={v} prev={pv} order={i} />
              <b className={m.tickValue}>{v ?? "–"}</b>
              <span className={m.tickDelta}>{v != null && pv != null ? signed(v - pv) : ""}</span>
              <span className="sr-only">{v != null && pv != null ? `, ${signed(v - pv)} since last time` : ""}</span>
            </div>
          );
        })}
        <div className={m.tickRow} aria-hidden>
          <span />
          <TickAxis />
        </div>
      </div>
      <i className={m.band} aria-hidden />

      <div className={m.face}>
        <FaceMap marks={faceMarks(scan.summary.observations)} area={scan.area} />
      </div>
      <p className={m.tip}>
        <Icon name="spark" size={14} />
        {shortTip(scan.summary.tip)}
      </p>

      {ann && <NoteCard scan={scan} addable className={m.note} />}
      {(ann?.tags.length || (stress ?? 0) >= 4) && (
        <p className={m.tags}>
          {ann?.tags.join(" · ")}
          {(stress ?? 0) >= 4 && <span className={m.stress}>High stress</span>}
        </p>
      )}

      {context.length > 0 && (
        <dl className={m.tiles}>
          {context.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {env && (
        <dl className={m.weather}>
          {(
            [
              ["High temp", `${env.tempHighC}°C`],
              ["Humidity", `${env.humidityPct}%`],
              ["UV", String(env.uvIndexMax)],
              ["Air quality", String(env.aqi)],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {products.length > 0 && (
        <ul className={m.inUse} aria-label="Products in use">
          {products.map((s) => (
            <li key={s.id}>
              <Icon name="bottle" size={15} />
              <span>
                {s.label}
                <ScheduleChip product={s.product!} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
