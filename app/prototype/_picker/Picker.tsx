"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import s from "./picker.module.css";

// Picker chrome. Deliberately neutral (system font, grays) so it never
// competes with the variants. Switching is instant: no animation.

export const VARIANTS = [
  { key: "story", name: "Story", axis: "Tap-through chapters, one question per screen" },
  { key: "journal", name: "Journal", axis: "Editorial scroll with an annotated month chart" },
  { key: "lens", name: "Lens", axis: "Dark, scan-first, scrub through the month" },
] as const;
export type VariantKey = (typeof VARIANTS)[number]["key"];

const PEOPLE = ["noor", "maya", "jordan", "sam"];

export function Picker({ id, variant, fail }: { id: string; variant: VariantKey; fail: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const go = (next: { id?: string; v?: VariantKey; fail?: boolean }) => {
    const q = new URLSearchParams();
    q.set("v", next.v ?? variant);
    if (next.fail ?? fail) q.set("fail", "1");
    const base = next.id ? `/prototype/${next.id}` : path;
    router.replace(`${base}?${q}`, { scroll: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input,textarea,select")) return;
      const n = Number(e.key);
      if (n >= 1 && n <= VARIANTS.length) go({ v: VARIANTS[n - 1].key });
      if (e.key === "p") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = VARIANTS.find((x) => x.key === variant)!;

  return (
    <aside className={s.root} data-open={open} aria-label="Prototype picker">
      <button className={s.tab} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Open prototype picker">
        <span>{VARIANTS.indexOf(current) + 1}</span>
      </button>
      <div className={s.panel}>
        <div className={s.group}>
          <p className={s.heading}>Direction</p>
          {VARIANTS.map((x, i) => (
            <button key={x.key} className={s.option} aria-pressed={x.key === variant} onClick={() => go({ v: x.key })}>
              <kbd>{i + 1}</kbd>
              <span>
                <b>{x.name}</b>
                <small>{x.axis}</small>
              </span>
            </button>
          ))}
        </div>
        <div className={s.group}>
          <p className={s.heading}>Person</p>
          <div className={s.row}>
            {PEOPLE.map((p) => (
              <button key={p} className={s.chip} aria-pressed={p === id} onClick={() => go({ id: p })}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className={s.group}>
          <p className={s.heading}>State</p>
          <div className={s.row}>
            <button className={s.chip} aria-pressed={!fail} onClick={() => go({ fail: false })}>
              Live
            </button>
            <button className={s.chip} aria-pressed={fail} onClick={() => go({ fail: true })}>
              Error
            </button>
            <button className={s.chip} aria-pressed={id === "nobody"} onClick={() => go({ id: "nobody", fail: false })}>
              Not found
            </button>
          </div>
        </div>
        <p className={s.hint}>Keys 1–3 switch direction · P hides this</p>
      </div>
    </aside>
  );
}
