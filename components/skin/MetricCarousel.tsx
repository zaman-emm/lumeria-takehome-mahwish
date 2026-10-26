"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { METRICS, band, fmtDay, scanTz, score, type ScoreKey } from "@/lib/insights";
import { useReportApi } from "./context";
import { Delta, Ticks } from "./ui";
import c from "./carousel.module.css";

// The five scores as a swipeable row of cards on an inverted arc: the card in
// the middle sits level and full size, and its neighbours tip away and drop as
// they slide out to the sides. Each card is one score: its name, the number,
// how far it moved since the first scan, and its ticks. Tapping any card opens
// that score's trend, as the rings did.

/** A soft wash per score, so each card has its own colour while the set stays one family. */
const TINT: Record<string, string> = {
  hydration: "var(--tint-hydration)",
  evenness: "var(--tint-tone)",
  redness: "var(--tint-calm)",
  pigmentation: "var(--tint-clarity)",
  oiliness: "var(--tint-oil)",
};

export function MetricCarousel({ onOpen }: { onOpen: (key: ScoreKey) => void }) {
  const { d } = useReportApi();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const since = d.trend ? fmtDay(d.trend.from.takenAt, scanTz(d.trend.from) ?? d.tz) : null;

  // Each card learns how far it sits from the middle (-1 left … 0 centred … 1
  // right) on every scroll frame; the arc itself is all CSS.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      Array.from(el.children).forEach((child, i) => {
        const card = child as HTMLElement;
        const at = card.offsetLeft + card.offsetWidth / 2;
        const p = Math.max(-1.5, Math.min(1.5, (at - mid) / card.offsetWidth));
        card.style.setProperty("--p", p.toFixed(3));
        card.style.setProperty("--ap", Math.abs(p).toFixed(3));
        if (Math.abs(p) < bestDist) {
          bestDist = Math.abs(p);
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const goTo = (i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: "smooth" });
  };

  return (
    <section className={c.carousel} aria-label="Your scores" aria-roledescription="carousel">
      <div ref={track} className={c.track} data-base-ui-swipe-ignore="x">
        {METRICS.map((m, i) => {
          const v = score(d.latest, m.key);
          const ch = d.changes.find((x) => x.key === m.key);
          return (
            <button
              key={m.key}
              className={c.card}
              data-on={i === active}
              style={{ "--tint": TINT[m.key] ?? "var(--sand)" } as CSSProperties}
              onClick={() => onOpen(m.key)}
              aria-label={`${m.label} ${v ?? "not measured"}${ch ? `, ${ch.delta >= 0 ? "up" : "down"} ${Math.abs(ch.delta)}` : ""}. Open trend`}
            >
              <span className={c.label}>{m.label}</span>
              <b className={c.value}>{v ?? "–"}</b>
              <span className={c.change}>
                {ch ? (
                  <>
                    <Delta n={ch.delta} className={c.delta} />
                    {since ? ` since ${since}` : " changed"}
                  </>
                ) : (
                  band(v).word
                )}
              </span>
              <span className={c.ticks}>
                <Ticks value={v} />
              </span>
            </button>
          );
        })}
      </div>
      <div className={c.dots} role="tablist" aria-label="Score">
        {METRICS.map((m, i) => (
          <button key={m.key} role="tab" aria-selected={i === active} aria-label={m.label} onClick={() => goTo(i)}>
            <i />
          </button>
        ))}
      </div>
    </section>
  );
}
