"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { dayOf, fmtDay, fmtTime, previousSameArea, scanTz, type Derived } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { useReportApi } from "./context";
import { Icon } from "./Icon";
import { NoteCard } from "./notes";
import { ChangeSince, Delta, LIGHTS, LightTag, Photo, hasLights, photoFor, type Light } from "./ui";
import { monthStory } from "@/lib/voice";
import ph from "./photos.module.css";

// Photos: first against latest under a drag-to-compare slider, then about a
// dozen scans (first, latest and evenly spaced between) as a polaroid wall, or as details (what each scan saw, your note, and
// how it moved since the last scan of that spot), filtered by spot.

const ALL = "All";

export function PhotosTab() {
  const { d } = useReportApi();
  const [light, setLight] = useState<Light>("ambient");
  const [area, setArea] = useState(ALL);
  const [view, setView] = useState<"grid" | "rows">("grid");
  const reduce = useReducedMotion();
  const anyLights = d.gallery.some(hasLights);
  // The wall lists the gallery's dozen (lib/insights pickGallery), not every scan.
  const shown = [...d.gallery].reverse().filter((s) => area === ALL || s.area === area);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, duration: 0.35, bounce: 0 };

  if (d.gallery.length === 0) {
    return (
      <div className={ph.empty}>
        <span className={ph.emptyIcon}>
          <Icon name="target" size={22} />
        </span>
        <h2>No photos yet</h2>
        <p>Your scans’ photos will show up here.</p>
      </div>
    );
  }

  return (
    <div className={ph.tab}>
      <Compare d={d} light={light} area={area === ALL ? d.area : area} />

      {anyLights && (
        <div className={ph.lights} role="radiogroup" aria-label="Light">
          {LIGHTS.map((l) => (
            <button key={l.key} role="radio" aria-checked={l.key === light} onClick={() => setLight(l.key)}>
              {l.label}
              {l.key === light && <motion.i layoutId="photos-light" className={ph.underline} transition={spring} />}
            </button>
          ))}
        </div>
      )}

      <div className={ph.filters}>
        {d.areas.length > 1 ? (
          <div className={ph.areas} role="radiogroup" aria-label="Spot">
            {[ALL, ...d.areas.map((a) => a.area)].map((a) => (
              <button key={a} role="radio" aria-checked={a === area} onClick={() => setArea(a)}>
                {a}
                {a === area && <motion.i layoutId="photos-area" className={ph.underline} transition={spring} />}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className={ph.view} role="radiogroup" aria-label="Layout" data-view={view}>
          <i className={ph.viewKnob} aria-hidden />
          <button role="radio" aria-checked={view === "grid"} onClick={() => setView("grid")} aria-label="Grid">
            <Icon name="grid" size={16} />
          </button>
          <button role="radio" aria-checked={view === "rows"} onClick={() => setView("rows")} aria-label="Details">
            <Icon name="rows" size={16} />
          </button>
        </div>
      </div>

      <ul className={ph.wall} data-view={view} aria-label={`${shown.length} scans`}>
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((s) => (
            <motion.li
              key={s.id}
              layout={reduce ? false : "position"}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            >
              {view === "grid" ? <Polaroid d={d} scan={s} light={light} /> : <PhotoRow d={d} scan={s} light={light} />}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

const lightFor = (s: Scan, light: Light): Light => (photoFor(s, light) ? light : "ambient");

const tone = (v: number) => (v >= 70 ? "good" : v < 60 ? "low" : "fair");

function Polaroid({ d, scan, light }: { d: Derived; scan: Scan; light: Light }) {
  const { openScan } = useReportApi();
  const tz = scanTz(scan) ?? d.tz;
  return (
    <button className={ph.polaroid} onClick={() => openScan(scan)} aria-label={`${scan.area}, ${fmtDay(scan.takenAt, tz)}, ${scan.scores.overall}`}>
      <i className={ph.tape} aria-hidden />
      <Photo scan={scan} light={lightFor(scan, light)} alt="" className={ph.thumb} say />
      {photoFor(scan, "ambient") && <LightTag light={lightFor(scan, light)} className={ph.thumbTag} />}
      <span className={ph.pMeta}>
        <span>{fmtDay(scan.takenAt, tz)}</span>
        <b data-tone={tone(scan.scores.overall)}>{scan.scores.overall}</b>
      </span>
      <span className={ph.pArea}>{scan.area}</span>
    </button>
  );
}

function PhotoRow({ d, scan, light }: { d: Derived; scan: Scan; light: Light }) {
  const { openScan } = useReportApi();
  const tz = scanTz(scan) ?? d.tz;
  const prev = previousSameArea(d, scan);
  const delta = prev ? scan.scores.overall - prev.scores.overall : null;
  // The whole row opens the scan through one button stretched over it; the
  // note sits above that button so its pencil can be pressed on its own.
  return (
    <div className={ph.row}>
      <button className={ph.rowHit} onClick={() => openScan(scan)} aria-label={`${scan.area}, ${fmtDay(scan.takenAt, tz)}, ${scan.scores.overall}. Open scan`} />
      <span className={ph.rowPhotoBox}>
        <Photo scan={scan} light={lightFor(scan, light)} alt="" className={ph.rowPhoto} />
        {photoFor(scan, "ambient") && <LightTag light={lightFor(scan, light)} className={ph.rowTag} />}
      </span>
      <span className={ph.rowText}>
        <span className={ph.rowWhen} aria-hidden>
          {fmtDay(scan.takenAt, tz)} · {fmtTime(scan.takenAt, tz)}
        </span>
        <span className={ph.rowArea} aria-hidden>
          {scan.area}
        </span>
        <span className={ph.rowSaw}>{scan.summary.headline}</span>
        <NoteCard scan={scan} compact className={ph.rowNote} />
      </span>
      <span className={ph.rowScore} aria-hidden>
        <b data-tone={tone(scan.scores.overall)}>{scan.scores.overall}</b>
        {delta != null &&
          delta !== 0 &&
          prev &&
          (monthStory(d) ? <Delta n={delta} className={ph.rowDelta} /> : <ChangeSince n={delta} since={fmtDay(prev.takenAt, scanTz(prev) ?? d.tz)} />)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- compare

/**
 * First and latest of a spot, under the same light. Dragging moves the
 * divider 1:1 with the finger (pointer capture, no easing); arrow keys step it.
 */
function Compare({ d, light, area }: { d: Derived; light: Light; area: string }) {
  const lit = d.scans.filter((s) => s.area === area && photoFor(s, light));
  const real = lit.filter((s) => s.photos);
  const pool = real.length >= 2 ? real : lit;
  const before = pool[0];
  const after = pool[pool.length - 1];
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);

  if (!before || !after || before === after) {
    return (
      <div className={ph.compareEmpty}>
        {after ? <Photo scan={after} light={light} alt={`${area} close-up`} className={ph.single} /> : null}
      </div>
    );
  }

  const tz = (s: Scan) => scanTz(s) ?? d.tz;
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
    if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
  };
  const lightLabel = LIGHTS.find((l) => l.key === light)!.label;

  return (
    <div
      ref={box}
      className={ph.compare}
      style={{ "--pos": `${pos}%` } as CSSProperties}
      data-base-ui-swipe-ignore="x"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e);
      }}
    >
      <Photo key={`b-${before.id}-${light}`} scan={before} light={light} alt={`${area}, ${fmtDay(before.takenAt, tz(before))}`} className={ph.cmpImg} />
      <div className={ph.after}>
        <Photo key={`a-${after.id}-${light}`} scan={after} light={light} alt={`${area}, ${fmtDay(after.takenAt, tz(after))}`} className={ph.cmpImg} />
      </div>
      <div className={ph.divider} aria-hidden>
        <i />
      </div>
      <div
        className={ph.knobHit}
        role="slider"
        tabIndex={0}
        aria-label={`Compare ${fmtDay(dayOf(d, before))} with ${fmtDay(dayOf(d, after))}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(100 - pos)}% ${fmtDay(dayOf(d, after))}`}
        onKeyDown={key}
      />
      <span className={ph.tag} data-at="top">
        {area} · {lightLabel}
      </span>
      <span className={ph.tag} data-at="left">
        {fmtDay(before.takenAt, tz(before))} · {before.scores.overall}
      </span>
      <span className={ph.tag} data-at="right">
        {fmtDay(after.takenAt, tz(after))} · {after.scores.overall}
      </span>
    </div>
  );
}
