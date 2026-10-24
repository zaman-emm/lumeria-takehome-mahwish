"use client";

import { useRef, useState, type CSSProperties } from "react";
import { dayOf, fmtDay, fmtTime, scanTz, type Derived } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import type { ReportActions } from "./Report";
import { LIGHTS, ScanPhoto, type Light } from "./ScanPhoto";
import { Icon } from "./Visuals";
import r from "./report.module.css";

// The photos are the proof. Then and now of one spot under the same light,
// then every scan, as a grid or as large photos with what you wrote.

type View = "grid" | "large";

export function PhotosTab({ d, actions }: { d: Derived; actions: ReportActions }) {
  const [area, setArea] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const shown = [...d.scans].reverse().filter((s) => !area || s.area === area);
  const then = d.areaScans[0];
  const now = d.areaScans[d.areaScans.length - 1];
  // Two scans on one day need their time to tell them apart.
  const perDay = new Map<string, number>();
  d.scans.forEach((s) => perDay.set(dayOf(d, s), (perDay.get(dayOf(d, s)) ?? 0) + 1));
  const time = (s: Scan) => fmtTime(s.takenAt, scanTz(s) ?? d.tz);
  const twice = (s: Scan) => (perDay.get(dayOf(d, s)) ?? 0) > 1;
  const when = (s: Scan) => (twice(s) ? `${fmtDay(dayOf(d, s))}, ${time(s)}` : fmtDay(dayOf(d, s)));

  return (
    <>
      <section>
        {then !== now ? (
          <Compare d={d} a={then} b={now} />
        ) : (
          <div className={r.single}>
            <ScanPhoto scan={now} alt={`${now.area} on ${fmtDay(dayOf(d, now))}`} />
            <span className={r.cmpArea}>{now.area}</span>
            <span className={r.cmpLabel} data-side="b">
              {fmtDay(dayOf(d, now))} · <b>{now.scores.overall}</b>
            </span>
          </div>
        )}
      </section>

      <section>
        <div className={r.galleryBar}>
          {d.areas.length > 1 ? (
            <div className={r.seg} role="radiogroup" aria-label="Body area">
              <button role="radio" aria-checked={!area} onClick={() => setArea(null)}>
                All
              </button>
              {d.areas.map((a) => (
                <button key={a.area} role="radio" aria-checked={area === a.area} onClick={() => setArea(a.area)}>
                  {a.area}
                </button>
              ))}
            </div>
          ) : (
            <span className={r.galleryCount}>{shown.length} scans</span>
          )}
          <div className={r.viewSwitch} role="radiogroup" aria-label="View">
            <button role="radio" aria-checked={view === "grid"} onClick={() => setView("grid")} aria-label="Grid">
              <Icon name="grid" size={16} />
            </button>
            <button role="radio" aria-checked={view === "large"} onClick={() => setView("large")} aria-label="Large photos">
              <Icon name="large" size={16} />
            </button>
          </div>
        </div>
        {view === "grid" ? (
          <ul className={r.grid} key={area ?? "all"}>
            {shown.map((s, i) => (
              <li key={s.id} style={{ "--i": Math.min(i, 12) } as CSSProperties}>
                <button onClick={() => actions.openScan(s)} aria-label={`${s.area}, ${when(s)}, overall ${s.scores.overall}`}>
                  <span className={r.tile}>
                    <ScanPhoto scan={s} alt="" />
                  </span>
                  <span className={r.cap}>
                    <span>
                      {fmtDay(dayOf(d, s))}
                      {twice(s) ? <em>{time(s)}</em> : !area && d.areas.length > 1 ? <em>{s.area}</em> : null}
                    </span>
                    <b>{s.scores.overall}</b>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={r.large} key={`l${area ?? "all"}`}>
            {shown.map((s) => (
              <li key={s.id}>
                <button onClick={() => actions.openScan(s)} aria-label={`${s.area}, ${when(s)}, overall ${s.scores.overall}`}>
                  <ScanPhoto scan={s} alt="" />
                </button>
                <p className={r.largeMeta}>
                  <span>
                    <b>{when(s)}</b>
                    {s.area}
                  </span>
                  <strong>{s.scores.overall}</strong>
                </p>
                {s.annotation?.note && <p className={r.quote}>“{s.annotation.note}”</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** Drag the handle to wipe between two scans of the same spot. */
function Compare({ d, a, b }: { d: Derived; a: Scan; b: Scan }) {
  const [pos, setPos] = useState(50);
  const [light, setLight] = useState<Light>("ambient");
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lights = a.photos && b.photos ? LIGHTS : [];

  const move = (clientX: number) => {
    const rect = frame.current!.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <>
      <div
        ref={frame}
        className={r.compare}
        style={{ "--pos": `${pos}%` } as CSSProperties}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && move(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <ScanPhoto scan={b} light={light} alt={`Now: ${b.area}, ${fmtDay(dayOf(d, b))}`} />
        <div className={r.compareTop}>
          <ScanPhoto scan={a} light={light} alt={`Then: ${a.area}, ${fmtDay(dayOf(d, a))}`} />
        </div>
        <span className={r.cmpArea}>
          {a.area} · {LIGHTS.find((l) => l.key === light)!.label}
        </span>
        <span className={r.cmpLabel} data-side="a">
          {fmtDay(dayOf(d, a))} · <b>{a.scores.overall}</b>
        </span>
        <span className={r.cmpLabel} data-side="b">
          {fmtDay(dayOf(d, b))} · <b>{b.scores.overall}</b>
        </span>
        <span className={r.handle} aria-hidden>
          <i />
        </span>
        <input
          className="sr-only"
          type="range"
          min={0}
          max={100}
          value={Math.round(pos)}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Slide between then and now"
        />
      </div>
      {lights.length > 0 && (
        <div className={r.seg} data-full role="radiogroup" aria-label="Light, the same for both photos">
          {lights.map((l) => (
            <button key={l.key} role="radio" aria-checked={light === l.key} onClick={() => setLight(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
