"use client";

import { motion, useReducedMotion, type PanInfo } from "motion/react";
import { Icon } from "./Icon";
import t from "./toast.module.css";

// The AI's suggestion, as a card that rises from the bottom of the screen: in
// the app it floats just above the tab bar, in a scan sheet it rides the
// sheet's bottom edge. It springs up (a little give, like a sheet), and goes
// back down the way it came: the close button, or a flick or drag downward.
// Mount it inside <AnimatePresence> so it can leave.

export function TipToast({
  tip,
  from,
  placement,
  delay = 0,
  onDismiss,
}: {
  /** How long to wait before rising, in ms (in a sheet: until the sheet has landed). */
  delay?: number;
  tip: string;
  /** Where it came from, e.g. "Your Oct 22 scan". */
  from: string;
  placement: "app" | "sheet";
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y: 96 };
  const spring = reduce ? { duration: 0.2 } : { type: "spring" as const, duration: 0.5, bounce: 0.2 };

  // Projected past ~40px down, or flicked, it goes; otherwise it springs home.
  const release = (_: unknown, info: PanInfo) => {
    if (info.offset.y + info.velocity.y * 0.2 > 40) onDismiss();
  };

  return (
    <motion.aside
      className={t.toast}
      data-placement={placement}
      role="status"
      aria-label="Suggestion"
      initial={hidden}
      animate={{ opacity: 1, y: 0, transition: { ...spring, delay: delay / 1000 } }}
      exit={hidden}
      transition={spring}
      drag={reduce ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.08, bottom: 0.9 }}
      onDragEnd={release}
    >
      <span className={t.icon} aria-hidden>
        <Icon name="spark" size={14} />
      </span>
      <span className={t.body}>
        <span className={t.text}>{tip}</span>
        <span className={t.from}>{from} · AI suggestion, not medical advice</span>
      </span>
      <button type="button" className={t.close} onClick={onDismiss} aria-label="Dismiss suggestion">
        <Icon name="close" size={12} stroke={1.8} />
      </button>
    </motion.aside>
  );
}
