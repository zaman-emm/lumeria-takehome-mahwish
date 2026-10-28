"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { Icon } from "./Icon";
import { ScrollEdge } from "./ScrollEdge";
import s from "./sheet.module.css";

// One bottom sheet for every detail view. Base UI's drawer gives swipe to
// dismiss with velocity, focus trapping and scroll lock; the page behind
// scales back like an iOS sheet. Content swaps (a trend opening a scan)
// crossfade inside the open sheet rather than stacking a second one.

export function Sheet({
  open,
  onClose,
  label,
  contentKey,
  container,
  edge = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  contentKey?: string;
  container: HTMLElement | null;
  /** The blur where content scrolls under the grabber and close button. Off for a sheet that has its own (Lumi's). */
  edge?: boolean;
  children: ReactNode;
}) {
  // Keep the last content on screen while the sheet slides away.
  const last = useRef({ key: contentKey, label, node: children });
  if (open) last.current = { key: contentKey, label, node: children };
  const shown = last.current;

  // Content only passes under the grabber and the close button once it has
  // scrolled, so the scroll-edge blur (ScrollEdge) shows only then. React skips
  // the render when the value hasn't changed, so this costs nothing per scroll event.
  const [scrolled, setScrolled] = useState(false);

  const popup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    popup.current?.scrollTo({ top: 0 });
    // Every sheet, and every swap of content within one, starts at the top. A sheet that closed
    // while scrolled sends no scroll event as it goes, so the flag has to be put back here.
    setScrolled(false);
  }, [open, shown.key]);

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal container={container}>
        <Drawer.Backdrop className={s.backdrop} />
        <Drawer.Viewport className={s.viewport}>
          <Drawer.Popup className={s.popup} ref={popup} aria-label={shown.label} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)}>
            <div className={s.chrome}>
              {edge && <ScrollEdge side="top" on={scrolled} className={s.edgeBox} />}
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
