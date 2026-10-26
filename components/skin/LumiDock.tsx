"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import l from "./lumi.module.css";

// Lumi lives on the right edge of the screen, like a tab pulled out of the
// page. The orb breathes while it waits. It tucks away while you scroll down
// and slides back when you stop, and you can drag it up or down the edge so
// it never sits on what you're reading. The count is how many questions are
// still open.

const KEY = "lumeria:lumi-y";
/** Space kept clear above (the sticky header) and below (the home bar). */
const TOP = 96;
const BOTTOM = 40;
const SIZE = 60;
/** A press that moves further than this is a drag, not a tap. */
const SLOP = 6;

const clampY = (y: number) => Math.min(Math.max(y, TOP), window.innerHeight - BOTTOM - SIZE);

export function LumiDock({ hidden, open, onOpen }: { hidden: boolean; open: number; onOpen: () => void }) {
  const dock = useRef<HTMLDivElement>(null);
  const y = useRef(0);
  /** Where it sits as a share of the screen height; what a resize keeps. */
  const frac = useRef(1);
  const press = useRef<{ id: number; dy: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [tucked, setTucked] = useState(false);

  // Where it sits is a fraction of the screen height, so it survives a
  // rotation or a resize. Stored per viewer; it's only a convenience.
  const place = (next: number) => {
    y.current = clampY(next);
    if (dock.current) dock.current.style.transform = `translate3d(0, ${y.current}px, 0)`;
  };
  useLayoutEffect(() => {
    // It starts at the bottom of the edge, where a floating button lives,
    // clear of the hero and the tabs.
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (saved > 0 && saved < 1) frac.current = saved;
    } catch {
      /* storage blocked */
    }
    place(frac.current * window.innerHeight);
    // Re-place from the share, not the last position, so a brief resize (the
    // address bar, the keyboard) can't leave it pinned to an edge.
    const onResize = () => place(frac.current * window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let last = window.scrollY;
    let timer = 0;
    const onScroll = () => {
      const now = window.scrollY;
      if (now > last + 4 && now > 80) setTucked(true);
      else if (now < last - 4) setTucked(false);
      last = now;
      clearTimeout(timer);
      timer = window.setTimeout(() => setTucked(false), 700);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={dock} className={l.dock} data-hidden={hidden}>
      <button
        className={l.tab}
        data-tucked={tucked && !dragging}
        data-dragging={dragging}
        aria-label={open ? `Ask Lumi, ${open} ${open === 1 ? "question" : "questions"} waiting` : "Ask Lumi"}
        tabIndex={hidden ? -1 : 0}
        onPointerDown={(e) => {
          if (press.current) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          press.current = { id: e.pointerId, dy: e.clientY - y.current, moved: false };
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          const next = e.clientY - p.dy;
          if (!p.moved && Math.abs(next - y.current) < SLOP) return;
          if (!p.moved) {
            p.moved = true;
            setDragging(true);
          }
          place(next);
        }}
        onPointerUp={(e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          press.current = null;
          if (!p.moved) return;
          swallowClick.current = true;
          setDragging(false);
          frac.current = y.current / window.innerHeight;
          try {
            localStorage.setItem(KEY, String(frac.current));
          } catch {
            /* storage blocked */
          }
        }}
        onPointerCancel={() => {
          press.current = null;
          setDragging(false);
        }}
        onClick={() => {
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          onOpen();
        }}
      >
        <span className={l.face}>
          <ThinkingOrb
            state={dragging ? "connecting" : "breathing"}
            size={32}
            theme="dark"
            color="#d7b46f"
            speed={dragging ? 1.4 : 0.8}
            dotSize={1.5}
            paused={hidden}
            aria-hidden="true"
          />
        </span>
        {open > 0 && (
          <span key={open} className={l.count} aria-hidden>
            {open}
          </span>
        )}
      </button>
    </div>
  );
}
