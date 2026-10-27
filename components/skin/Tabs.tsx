"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import t from "./tabs.module.css";

// Chip tabs. The active chip is a second, forest-coloured copy of the row,
// clipped to the active chip; moving the clip slides the colour across, so
// text and fill change together with no colour tween. The row scrolls
// sideways at 375px and keeps the active chip in view. Once it reaches the
// top it becomes a frosted glass bar the page scrolls under.

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  fitnessLayout = false,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  fitnessLayout?: boolean;
}) {
  const row = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState<CSSProperties>({ clipPath: "inset(0 100% 0 0)" });
  const [ready, setReady] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    // Stuck means it sits at its sticky offset (under the header, or at the top).
    const check = () => {
      const el = bar.current;
      if (!el) return;
      const at = parseFloat(getComputedStyle(el).top) || 0;
      setStuck(window.scrollY > 0 && el.getBoundingClientRect().top <= at + 0.5);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  useLayoutEffect(() => {
    const list = row.current;
    const el = list?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!list || !el || !copy.current) return;
    const left = el.offsetLeft;
    const right = copy.current.offsetWidth - (left + el.offsetWidth);
    setClip({ clipPath: `inset(0 ${right}px 0 ${left}px round ${fitnessLayout ? 22 : 12}px)` });
    // The first placement is instant; only later moves slide.
    if (!ready) requestAnimationFrame(() => setReady(true));
    const { scrollLeft, clientWidth } = list;
    if (left < scrollLeft + 16 || left + el.offsetWidth > scrollLeft + clientWidth - 16) {
      list.scrollTo({ left: left - (clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <>
      {!fitnessLayout && <div className={t.cap} data-on={stuck} aria-hidden />}
      <div className={t.bar} ref={bar} data-stuck={stuck} data-iteration={fitnessLayout || undefined} data-page-chrome>
        <div className={t.row} ref={row} role="tablist" aria-label="Report sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              data-id={tab.id}
              aria-selected={tab.id === active}
              aria-controls="skin-panel"
              className={t.chip}
              onClick={() => onChange(tab.id)}
              data-label={tab.label}
            >
              <span>{tab.label}</span>
            </button>
          ))}
          <div className={t.active} ref={copy} style={clip} data-ready={ready} aria-hidden>
            {tabs.map((tab) => (
              <span key={tab.id} className={t.chip} data-label={tab.label}>
                <span>{tab.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
