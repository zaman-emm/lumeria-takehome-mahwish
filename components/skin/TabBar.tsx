"use client";

import { Icon, type IconName } from "./Icon";
import { SunOrb } from "./SunOrb";
import b from "./tabbar.module.css";

// The app's tab bar, the iOS 26 way (Music is the reference): a floating Liquid
// Glass capsule of icon-over-label tabs, the selected one in a lighter pill
// with the tint colour, and one round glass button beside it. Where Music keeps
// Search, Lumeria keeps Lumi.
//
// The report is the Trends destination; Home and Scan belong to the rest of
// the app, which this prototype doesn't build, so they show but do nothing.

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "trends", label: "Report", icon: "report" },
  { id: "scan", label: "Scan", icon: "scan" },
];
const ACTIVE = "trends";

export function TabBar({
  hidden,
  onLumi,
  lumiCount,
  lumiPaused,
}: {
  hidden?: boolean;
  onLumi: () => void;
  /** How many things Lumi has to talk about, for its label. */
  lumiCount: number;
  /** Stops the orb turning while something covers it. */
  lumiPaused?: boolean;
}) {
  const things = lumiCount === 1 ? "one thing" : `${lumiCount} things`;
  return (
    <nav className={b.bar} data-hidden={hidden} aria-label="Lumeria" inert={hidden}>
      <div className={b.capsule}>
        {TABS.map((t) => {
          const on = t.id === ACTIVE;
          return (
            <button key={t.id} type="button" className={b.item} aria-current={on ? "page" : undefined} aria-disabled={on ? undefined : true}>
              {on && <i className={b.pill} aria-hidden />}
              <Icon name={t.icon} size={24} stroke={on ? 1.9 : 1.6} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      <button className={b.lumi} onClick={onLumi} aria-label={lumiCount ? `Ask Lumi AI, ${things} to talk about` : "Ask Lumi AI"}>
        <span className={b.orb} aria-hidden>
          <SunOrb paused={hidden || lumiPaused} />
        </span>
      </button>
    </nav>
  );
}
