"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { lumiQuestions, metricMeta } from "@/lib/insights";
import { useReportApi } from "./context";
import { Icon } from "./Icon";
import m from "./sheets.module.css";

// Lumi asks rather than explains: one question per clue, each with the
// evidence that prompted it. An answer folds the card down to a quiet
// "Noted", so the next question moves up.

export function LumiSheet() {
  const { d } = useReportApi();
  const qs = useMemo(() => lumiQuestions(d), [d]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const reduce = useReducedMotion();
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
          <Icon name="spark" size={18} />
        </span>
        <h2>Lumi</h2>
      </header>
      {qs.length === 0 ? (
        <p className={m.lumiEmpty}>A few more scans and Lumi will have something to ask you.</p>
      ) : (
        <ul className={m.questions}>
          {qs.map((q) => {
            const answer = answers[q.id];
            return (
              <motion.li key={q.id} layout={!reduce} className={m.question} transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
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
                  {answer ? (
                    <motion.p key="noted" className={m.noted} {...swap} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }} aria-live="polite">
                      <Icon name="check" size={14} stroke={2} />
                      Noted: {answer}
                    </motion.p>
                  ) : (
                    <motion.div key="ask" {...swap} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}>
                      <p className={m.ask}>{q.ask}</p>
                      <div className={m.answers}>
                        {q.answers.map((a, i) => (
                          <button key={a} data-primary={i === 0} onClick={() => setAnswers((s) => ({ ...s, [q.id]: a }))}>
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
