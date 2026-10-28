"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useInView, useReducedMotion } from "motion/react";

// Motion helpers shared by the report. Set pieces (the hero gauge, rings
// drawing, bars growing) play once per page load, never on every tab visit.

const played = new Set<string>();

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Counts a number up from zero into the element's text, alongside whatever
 * draws it (a ring, a reveal). Writes the DOM directly so React doesn't
 * re-render sixty times a second; the real value is always what React rendered.
 */
export function useCountUp<T extends HTMLElement>(
  value: number | null,
  play: boolean,
  {
    delay = 0,
    duration = 1000,
    ease = "out",
    from = 0,
  }: { delay?: number; duration?: number; ease?: "out" | "inOut"; /** Where the count starts. */ from?: number } = {},
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!play || !el || value == null) return;
    const curve = ease === "out" ? easeOutCubic : easeInOutCubic;
    const start = performance.now() + delay;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      el.textContent = String(Math.round(from + curve(t) * (value - from)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = String(from);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = String(value);
    };
  }, [play, value, delay, duration, ease, from]);
  return ref;
}

/** True the first time `key` mounts in this page load. */
export function useFirstTime(key: string) {
  const [first] = useState(() => !played.has(key));
  useEffect(() => {
    played.add(key);
  }, [key]);
  return first;
}

export type RevealState = "out" | "in" | "done";

/**
 * For a set piece that plays when it scrolls into view: "out" before, "in"
 * once seen, "done" when it already played this load or motion is reduced.
 * CSS reads it from a data-reveal attribute.
 */
export function useReveal<T extends Element>(key: string) {
  const ref = useRef<T>(null);
  const first = useFirstTime(key);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const state: RevealState = !first || reduce ? "done" : inView ? "in" : "out";
  return [ref, state] as const;
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

/**
 * Runs a state change inside a view transition when the browser has them, so
 * shared elements (the score, the photo) morph between layouts. `dir` lands on
 * <html> for the duration, which the CSS reads to slide panels the right way.
 */
export function withViewTransition(update: () => void, dir: "forward" | "back" | "none" = "none") {
  const doc = document as ViewTransitionDoc;
  if (!doc.startViewTransition) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.vt = dir;
  const vt = doc.startViewTransition(() => flushSync(update));
  vt.finished.finally(() => {
    delete root.dataset.vt;
  });
}

/** An element's width, kept current. For charts drawn in real pixels. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
