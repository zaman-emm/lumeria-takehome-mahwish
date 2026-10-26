"use client";

import { motion, useReducedMotion } from "motion/react";
import { Icon, type IconName } from "./Icon";
import b from "./tabbar.module.css";

// The app's floating tab bar, iOS 26-style Liquid Glass: a glass capsule of
// icon-over-label tabs with the selected one in a lighter pill, and Scan as its
// own glass circle beside it, the way Music keeps Search apart. The pill
// springs between tabs (critically damped: a tap carries no momentum).

export type Dest = "home" | "trends" | "scan";

const TABS: { id: Exclude<Dest, "scan">; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "trends", label: "Trends", icon: "trends" },
];

export function TabBar({ active, onChange, hidden }: { active: Dest; onChange: (d: Dest) => void; hidden?: boolean }) {
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, duration: 0.4, bounce: 0 };
  return (
    <nav className={b.bar} data-hidden={hidden} data-tone={active === "scan" ? "dark" : "light"} aria-label="Lumeria" inert={hidden}>
      <div className={b.capsule}>
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button key={t.id} aria-current={on ? "page" : undefined} className={b.item} onClick={() => onChange(t.id)}>
              {on && <motion.i layoutId="tabbar-pill" className={b.pill} transition={spring} aria-hidden />}
              <Icon name={t.icon} size={22} stroke={1.6} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      <button className={b.scan} data-on={active === "scan"} aria-current={active === "scan" ? "page" : undefined} onClick={() => onChange("scan")} aria-label="Scan">
        <Icon name="scan" size={24} stroke={1.6} />
      </button>
    </nav>
  );
}
