"use client";

import { useRef, useState, type CSSProperties } from "react";
import { dayOf, fmtDay, type Derived } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import type { ReportActions } from "./Report";
import { LIGHTS, ScanPhoto, type Light } from "./ScanPhoto";
import r from "./report.module.css";

// The photos are the proof. Then and now under the same light, then every
// scan as a grid you can filter by area and open in the explorer.

export function PhotosTab({ d, actions }: { d: Derived; actions: ReportActions }) {
  const [area, setArea] = useState<string | null>(null);
  const shown = [...d.scans].reverse().filter((s) => !area || s.area === area);
  const then = d.areaScans[0];
  const now = d.areaScans[d.areaScans.length - 1];

  return (
    <>
      <section className={r.card}>
        <header className={r.cardHead}>
          <span className="label">Then and now</span>
          <span className={r.cardMeta}>{d.area}</span>
        </header>
        {then !== now ? (
          <Compare d={d} a={then} b={now} />
        ) : (
          <>
            <div className={r.single}>
              <ScanPhoto scan={now} alt={`${now.area} on ${fmtDay(dayOf(d, now))}`} />
            </div>
            <p className={r.hint}>This is your “then”. Scan the same spot again and you’ll be able to slide between the two.</p>
          </>
        )}
      </section>

      <section className={r.card}>
        <header className={r.cardHead}>
          <span className="label">Every scan</span>
          <span className={r.cardMeta}>{shown.length}</span>
        </header>
        {d.areas.length > 1 && (
          <div className={r.filters} role="radiogroup" aria-label="Body area">
            <button role="radio" aria-checked={!area} onClick={() => setArea(null)}>
              All
            </button>
            {d.areas.map((a) => (
              <button key={a.area} role="radio" aria-checked={area === a.area} onClick={() => setArea(a.area)}>
                {a.area}
                <small>{a.count}</small>
              </button>
            ))}
          </div>
        )}
        <ul className={r.grid} key={area ?? "all"}>
          {shown.map((s, i) => (
            <li key={s.id} style={{ "--i": Math.min(i, 12) } as CSSProperties}>
              <button onClick={() => actions.explore(s.id)} aria-label={`${s.area}, ${fmtDay(dayOf(d, s))}, overall ${s.scores.overall}`}>
                <ScanPhoto scan={s} alt="" />
                <b>{s.scores.overall}</b>
                <small>{fmtDay(dayOf(d, s))}</small>
              </button>
            </li>
          ))}
        </ul>
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
        <ScanPhoto scan={b} light={light} alt={`Now: ${fmtDay(dayOf(d, b))}`} />
        <div className={r.compareTop}>
          <ScanPhoto scan={a} light={light} alt={`Then: ${fmtDay(dayOf(d, a))}`} />
        </div>
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
        <div className={r.lights} role="radiogroup" aria-label="Light">
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
