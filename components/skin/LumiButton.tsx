"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { SunOrb } from "./SunOrb";
import l from "./lumi.module.css";

// Lumi lives on the right edge, near the bottom where a thumb rests: the
// sun orb, pearl and gold silk turning slowly inside a frosted sphere. It
// never announces itself. While the page scrolls it tucks halfway into the
// edge and slides back when you stop.

export function LumiButton({ hidden, count, onOpen }: { hidden: boolean; count: number; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const [tucked, setTucked] = useState(false);
  const [pressed, setPressed] = useState(false);
  const idle = useRef<number>(0);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) > 4) {
        setTucked(true);
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
    setPressed(true);
    // Let the orb's press-and-glow land before the sheet covers it.
    window.setTimeout(() => {
      setPressed(false);
      onOpen();
    }, reduce ? 0 : 180);
  };

  const things = count === 1 ? "one thing" : `${count} things`;

  return (
    <div className={l.dock} data-hidden={hidden} data-tucked={tucked}>
      <button
        className={l.tab}
        data-pressed={pressed}
        onClick={open}
        aria-label={count ? `Ask Lumi, ${things} to talk about` : "Ask Lumi"}
        tabIndex={hidden ? -1 : 0}
      >
        <span className={l.face}>
          <SunOrb paused={hidden} />
        </span>
      </button>
    </div>
  );
}
