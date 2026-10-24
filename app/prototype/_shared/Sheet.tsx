"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import s from "./shared.module.css";

/**
 * Bottom sheet. Enters on the iOS drawer curve, exits faster than it enters,
 * and can be flicked away: velocity counts as much as distance.
 */
export function Sheet({
  open,
  onClose,
  label,
  tone = "light",
  scrollKey,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  tone?: "light" | "dark";
  /** Change it to start the sheet's content from the top again. */
  scrollKey?: string;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [scrollKey]);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement;
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 260);
    returnFocus.current?.focus?.();
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, onClose]);

  useEffect(() => {
    if (shown) panel.current?.focus({ preventScroll: true });
  }, [shown]);

  if (!mounted) return null;

  const onDown = (e: React.PointerEvent) => {
    if (drag.current) return; // ignore a second finger
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panel.current!.style.transition = "none";
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const raw = e.clientY - drag.current.y;
    // Friction past the top instead of a hard stop.
    const dy = raw < 0 ? -Math.sqrt(-raw) * 2 : raw;
    drag.current.dy = dy;
    panel.current!.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    if (!drag.current) return;
    const { dy, t } = drag.current;
    const velocity = Math.abs(dy) / (performance.now() - t);
    drag.current = null;
    const el = panel.current!;
    el.style.transition = "";
    el.style.transform = "";
    if (dy > 120 || (dy > 10 && velocity > 0.11)) onClose();
  };

  return (
    <div className={s.sheetRoot} data-shown={shown} data-tone={tone}>
      <div className={s.sheetScrim} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        <div className={s.sheetGrip} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span />
          <button className={s.sheetClose} onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={s.sheetBody} ref={body}>
          {children}
        </div>
      </div>
    </div>
  );
}
