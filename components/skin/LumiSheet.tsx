"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import { metricMeta } from "@/lib/insights";
import { useReportApi } from "./context";
import { Icon } from "./Icon";
import m from "./sheets.module.css";

// Lumi asks rather than explains: one question per clue, each with the
// evidence that prompted it. An answer folds the card down to a quiet
// "Noted", so the next question moves up. The orb shows what Lumi is doing:
// it scans while the questions come in, and weaves your answer in.

export function LumiSheet() {
  const { lumi } = useReportApi();
  const { questions: qs, answers } = lumi;
  const reduce = useReducedMotion();
  const [orb, setOrb] = useState<OrbState>("searching");
  const settle = useRef(0);
  const think = (state: OrbState, ms: number) => {
    setOrb(state);
    clearTimeout(settle.current);
    settle.current = window.setTimeout(() => setOrb("breathing"), ms);
  };
  useEffect(() => {
    think("searching", 400 + qs.length * 160);
    return () => clearTimeout(settle.current);
    // Once per opening.
  }, []);
  const answer = (id: string, a: string) => {
    lumi.answer(id, a);
    think("weaving", 900);
  };
  const swap = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, filter: "blur(2px)", transform: "translateY(4px)" },
        animate: { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" },
        exit: { opacity: 0, filter: "blur(2px)" },
      };

  return (
    <div>
      <header className={m.lumiHead}>
        <span className={m.lumiMark}>
          <ThinkingOrb state={orb} size={32} theme="dark" color="#d7b46f" dotSize={1.5} aria-hidden="true" />
        </span>
        <h2>Lumi</h2>
      </header>
      {qs.length === 0 ? (
        <p className={m.lumiEmpty}>A few more scans and Lumi will have something to ask you.</p>
      ) : (
        <ul className={m.questions}>
          {qs.map((q, i) => {
            const given = answers[q.id];
            return (
              <motion.li
                key={q.id}
                layout={!reduce}
                className={m.question}
                initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px)" }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
                transition={{
                  default: { duration: 0.32, ease: [0.23, 1, 0.32, 1], delay: 0.14 + i * 0.07 },
                  layout: { duration: 0.28, ease: [0.23, 1, 0.32, 1] },
                }}
              >
                <p className={m.seen}>
                  <span>
                    <Icon name={q.seen.key === "overall" ? "overall" : q.seen.key} size={13} />
                    {metricMeta(q.seen.key).label} {q.seen.from}
                    <Icon name="chevronR" size={9} />
                    <b>{q.seen.to}</b>
                  </span>
                  <span>{q.seen.when}</span>
                </p>
                <AnimatePresence mode="popLayout" initial={false}>
                  {given ? (
                    <motion.p key="noted" className={m.noted} {...swap} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }} aria-live="polite">
                      <Icon name="check" size={14} stroke={2} />
                      Noted: {given}
                    </motion.p>
                  ) : (
                    <motion.div key="ask" {...swap} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}>
                      <p className={m.ask}>{q.ask}</p>
                      <div className={m.answers}>
                        {q.answers.map((a, i) => (
                          <button key={a} data-primary={i === 0} onClick={() => answer(q.id, a)}>
                            {a}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      )}
      <p className={m.lumiFoot}>Lumi is an AI. It spots patterns in your scans; it can’t diagnose.</p>
    </div>
  );
}
