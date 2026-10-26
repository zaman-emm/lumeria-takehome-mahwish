"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { Icon } from "./Icon";
import s from "./sheet.module.css";

// One bottom sheet for every detail view. Base UI's drawer gives swipe to
// dismiss with velocity, focus trapping and scroll lock; the page behind
// scales back like an iOS sheet. Content swaps (a trend opening a scan)
// crossfade inside the open sheet rather than stacking a second one.

/**
 * The scroll edge is a progressive blur: one thin layer per radius, strongest at
 * the top (behind the grabber and close button) and easing to almost nothing
 * lower down, each masked to its own band (sheet.module.css .edge). One uniform
 * blur faded with an alpha mask shows as a band with a lower edge.
 */
const EDGE_BLURS = [16, 8, 4, 2, 1, 0.5];

export function Sheet({
  open,
  onClose,
  label,
  contentKey,
  container,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  contentKey?: string;
  container: HTMLElement | null;
  children: ReactNode;
}) {
  // Keep the last content on screen while the sheet slides away.
  const last = useRef({ key: contentKey, label, node: children });
  if (open) last.current = { key: contentKey, label, node: children };
  const shown = last.current;

  const popup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    popup.current?.scrollTo({ top: 0 });
  }, [shown.key]);

  // Content only passes under the grabber and the close button once it has
  // scrolled, so the scroll-edge blur (sheet.module.css .edge) shows only then.
  // React skips the render when the value hasn't changed, so this costs nothing per scroll event.
  const [scrolled, setScrolled] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal container={container}>
        <Drawer.Backdrop className={s.backdrop} />
        <Drawer.Viewport className={s.viewport}>
          <Drawer.Popup className={s.popup} ref={popup} aria-label={shown.label} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)}>
            <div className={s.chrome}>
              <div className={s.edge} data-on={scrolled} aria-hidden>
                {EDGE_BLURS.map((blur, k) => (
                  <i key={blur} style={{ "--blur": `${blur}px`, "--at": `${((k + 1) / (EDGE_BLURS.length + 1)) * 100}%` } as CSSProperties} />
                ))}
                <b />
              </div>
              <div className={s.grabber} aria-hidden />
              <Drawer.Close className={s.close} aria-label="Close">
                <Icon name="close" size={14} stroke={1.8} />
              </Drawer.Close>
            </div>
            <Drawer.Title className="sr-only">{shown.label}</Drawer.Title>
            <Drawer.Content key={shown.key} className={s.content}>
              {shown.node}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
