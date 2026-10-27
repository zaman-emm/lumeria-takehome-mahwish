"use client";

import { useState, type CSSProperties } from "react";
import { METRICS, dayOf, fmtDay, fmtTime, previousSameArea, scanTz, score, shortTip, signed, spansOn } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { useReportApi } from "./context";
import { Icon } from "./Icon";
import { NoteCard } from "./notes";
import { LIGHTS, LightTag, Photo, ScheduleChip, TickAxis, Ticks, hasLights, photoFor, type Light } from "./ui";
import m from "./sheets.module.css";

// Everything about one scan: the photo under each light, every score against
// the last scan of the same spot, what it saw, what was noted, and the day's
// context.

/** Self-reported stress, 1 to 5, in a word. */
const stressWord = (n: number) => (n >= 4 ? "High" : n === 3 ? "Medium" : "Low");

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
        ]
      : [];
  // Stress lives in the note card, whether it came with a note or a check-in.
  const stress = ann?.stress ?? scan.checkin?.stress ?? null;
  const tags = ann?.tags ?? [];

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
        {photoFor(scan, "ambient") && <LightTag light={hasLights(scan) ? light : "ambient"} className={m.photoTag} />}
        {hasLights(scan) ? (
          LIGHTS.map((l) => (
            <Photo key={l.key} scan={scan} light={l.key} className={m.photoImg} on={l.key === light} alt={`${scan.area}, ${l.label.toLowerCase()} light`} />
          ))
        ) : photoFor(scan, "ambient") ? (
          <Photo scan={scan} className={m.photoImg} />
        ) : (
          // The upload failed (photoUrl is null); the scan's reading is fine. Offer
          // another go. Shows the action only; not wired up in this prototype.
          <div className={m.noPhoto} role="group" aria-label="Photo didn’t upload">
            <Icon name="target" size={18} />
            <p>Photo didn’t upload</p>
            <button type="button" className={m.retry}>
              Try again
            </button>
          </div>
        )}
      </div>
      {hasLights(scan) && (
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
              {v == null ? <span className={m.tickNone}>Couldn’t read this time</span> : <Ticks value={v} order={i} />}
              <b className={m.tickValue}>{v ?? "–"}</b>
              <span className={m.tickDelta} data-dir={v != null && pv != null ? Math.sign(v - pv) : undefined}>
                {v != null && pv != null ? signed(v - pv) : ""}
              </span>
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

      {/* The note, what was tagged and how stressed that day. Always shown, so
          there's somewhere to add them even when nothing was logged. */}
      <NoteCard scan={scan} addable className={m.note}>
        <div className={m.taggedWrap}>
          {/* Shows that tags and stress can be changed; not wired up in this prototype. */}
          <button type="button" className={m.tagEdit} aria-label="Edit tags and stress">
            <Icon name="pencil" size={13} stroke={1.6} />
          </button>
          <dl className={m.tagged}>
            <div>
              <dt>You tagged</dt>
              <dd>
                {tags.length > 0 ? (
                  tags.map((t) => (
                    <span key={t} className={m.tag}>
                      {t}
                    </span>
                  ))
                ) : (
                  <span className={m.none}>None yet</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Stress</dt>
              <dd>
                {/* What was entered, as it was entered. */}
                {stress != null ? <span className={m.stress}>{stress} of 5</span> : <span className={m.none}>Not logged</span>}
              </dd>
              {/* The app's reading of it, kept apart on the right. */}
              {stress != null && (
                <span className={m.stressRead} data-high={stress >= 4}>
                  {stressWord(stress)}
                </span>
              )}
            </div>
          </dl>
        </div>
      </NoteCard>

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

      {/* A grouped list, like Settings: one row per product, its schedule on the right. */}
      {products.length > 0 && (
        <section className={m.routine} aria-labelledby={`${scan.id}-routine`}>
          <h3 id={`${scan.id}-routine`}>In your routine that day</h3>
          <ul>
            {products.map((s) => (
              <li key={s.id}>
                <span>{s.label}</span>
                <ScheduleChip product={s.product!} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The scan's suggestion closes the sheet, under everything it's based on. */}
      <p className={m.tip}>
        <Icon name="spark" size={14} />
        <span>
          {shortTip(scan.summary.tip)}
          <small>AI suggestion · not medical advice</small>
        </span>
      </p>
    </article>
  );
}
