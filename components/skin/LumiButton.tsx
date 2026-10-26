"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ThinkingOrb } from "thinking-orbs";
import { Icon } from "./Icon";
import l from "./lumi.module.css";

// Lumi lives on the right edge, near the bottom where a thumb rests: a
// half-pill docked to the column edge with a slowly breathing dotted orb.
// Once per load it peeks out with a line about what it noticed. While the
// page scrolls it tucks halfway into the edge and slides back when you stop.

const PEEK_AFTER = 2600;
const PEEK_FOR = 7000;
let peeked = false;

export function LumiButton({ hidden, count, onOpen, month = true }: { hidden: boolean; count: number; onOpen: () => void; month?: boolean }) {
  const reduce = useReducedMotion();
  const [peek, setPeek] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [pressed, setPressed] = useState(false);
  const idle = useRef<number>(0);

  useEffect(() => {
    if (peeked || count === 0) return;
    const show = window.setTimeout(() => {
      peeked = true;
      setPeek(true);
    }, PEEK_AFTER);
    const hide = window.setTimeout(() => setPeek(false), PEEK_AFTER + PEEK_FOR);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [count]);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) > 4) {
        setTucked(true);
        setPeek(false);
      }
      last = y;
      window.clearTimeout(idle.current);
      idle.current = window.setTimeout(() => setTucked(false), 700);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle.current);
    };
  }, []);

  const open = () => {
    setPeek(false);
    setPressed(true);
    // Let the orb's press-and-glow land before the sheet covers it.
    window.setTimeout(() => {
      setPressed(false);
      onOpen();
    }, reduce ? 0 : 180);
  };

  const things = count === 1 ? "one thing" : `${count} things`;

  return (
    <div className={l.dock} data-hidden={hidden} data-tucked={tucked && !peek}>
      <AnimatePresence>
        {peek && !hidden && (
          <motion.div
            className={l.peek}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16, scale: 0.92 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 12, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
          >
            <button className={l.peekBody} onClick={open} tabIndex={hidden ? -1 : 0}>
              <span className={l.peekKicker}>Lumi</span>
              I noticed {things} in your {month ? "month" : "scans"}. Want to look?
            </button>
            <button className={l.peekClose} onClick={() => setPeek(false)} aria-label="Dismiss" tabIndex={hidden ? -1 : 0}>
              <Icon name="close" size={10} stroke={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        className={l.tab}
        data-pressed={pressed}
        onClick={open}
        aria-label={count ? `Ask Lumi, ${things} to talk about` : "Ask Lumi"}
        tabIndex={hidden ? -1 : 0}
      >
        <span className={l.halo} aria-hidden />
        <ThinkingOrb state="breathing" size={64} theme="dark" aria-hidden="true" className={l.orb} paused={hidden} />
        {count > 0 && (
          <span key={count} className={l.badge} aria-hidden>
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
