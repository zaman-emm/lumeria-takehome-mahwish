"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import t from "./tabs.module.css";

// Chip tabs. The active chip is a second, forest-coloured copy of the row,
// clipped to the active chip; moving the clip slides the colour across, so
// text and fill change together with no colour tween. The row scrolls
// sideways at 375px and keeps the active chip in view.

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState<CSSProperties>({ clipPath: "inset(0 100% 0 0)" });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const list = row.current;
    const el = list?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!list || !el || !copy.current) return;
    const left = el.offsetLeft;
    const right = copy.current.offsetWidth - (left + el.offsetWidth);
    setClip({ clipPath: `inset(0 ${right}px 0 ${left}px round 12px)` });
    // The first placement is instant; only later moves slide.
    if (!ready) requestAnimationFrame(() => setReady(true));
    const { scrollLeft, clientWidth } = list;
    if (left < scrollLeft + 16 || left + el.offsetWidth > scrollLeft + clientWidth - 16) {
      list.scrollTo({ left: left - (clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className={t.bar}>
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
  );
}
