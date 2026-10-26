"use client";

import { motion, useReducedMotion } from "motion/react";
import { Icon, type IconName } from "./Icon";
import { SunOrb } from "./SunOrb";
import b from "./tabbar.module.css";

// The app's tab bar, the iOS 26 way (Music is the reference): a floating Liquid
// Glass capsule of icon-over-label tabs, the selected one in a lighter pill
// with the tint colour, and one round glass button beside it. Where Music keeps
// Search, Lumeria keeps Lumi. The pill springs between tabs (critically
// damped: a tap carries no momentum).

export type Dest = "home" | "trends" | "scan";

const TABS: { id: Dest; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "trends", label: "Trends", icon: "trends" },
  { id: "scan", label: "Scan", icon: "scan" },
];

export function TabBar({
  active,
  onChange,
  hidden,
  onLumi,
  lumiCount,
  lumiPaused,
}: {
  active: Dest;
  onChange: (d: Dest) => void;
  hidden?: boolean;
  onLumi: () => void;
  /** How many things Lumi has to talk about, for its label. */
  lumiCount: number;
  /** Stops the orb turning while something covers it. */
  lumiPaused?: boolean;
}) {
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, duration: 0.4, bounce: 0 };
  const things = lumiCount === 1 ? "one thing" : `${lumiCount} things`;
  return (
    <nav className={b.bar} data-hidden={hidden} data-tone={active === "scan" ? "dark" : "light"} aria-label="Lumeria" inert={hidden}>
      <div className={b.capsule}>
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button key={t.id} aria-current={on ? "page" : undefined} className={b.item} onClick={() => onChange(t.id)}>
              {on && <motion.i layoutId="tabbar-pill" className={b.pill} transition={spring} aria-hidden />}
              <Icon name={t.icon} size={24} stroke={on ? 1.9 : 1.6} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      <button className={b.lumi} onClick={onLumi} aria-label={lumiCount ? `Ask Lumi, ${things} to talk about` : "Ask Lumi"}>
        <span className={b.orb} aria-hidden>
          <SunOrb paused={hidden || lumiPaused} />
        </span>
      </button>
    </nav>
  );
}
