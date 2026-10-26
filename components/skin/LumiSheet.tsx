"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { metricMeta } from "@/lib/insights";
import { lumiScript, type LumiTab } from "@/lib/lumi";
import { useReportApi } from "./context";
import { Icon } from "./Icon";
import { SunOrb } from "./SunOrb";
import l from "./lumi.module.css";
import m from "./sheets.module.css";

// Lumi as a short conversation about the tab you opened it from. The first
// time, Lumi visibly reads your scans before it says anything. It greets
// you with what's on that tab and offers three questions; tap one and the orb
// thinks, then the answer writes itself in with two more to follow. Below,
// Lumi's own questions for you. Everything is written ahead from the data:
// no live model, and it never diagnoses.

const READ_MS = 1300;
/** Thinking time grows a little with the answer, so long ones feel considered. */
const thinkMs = (text: string) => Math.min(1500, 700 + text.length * 4);
let read = false;

type Line = { id: string; from: "lumi" | "you"; text: string; ai?: boolean };

export function LumiSheet({ tab }: { tab: LumiTab }) {
  const { d, lumi } = useReportApi();
  const { questions: qs, answers } = lumi;
  const script = useMemo(() => lumiScript(d, tab), [d, tab]);
  const reduce = useReducedMotion();

  const [reading, setReading] = useState(!read);
  const [lines, setLines] = useState<Line[]>(() => (read ? [{ id: "hi", from: "lumi", text: script.greeting }] : []));
  const [thinking, setThinking] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const [offer, setOffer] = useState(script.start);
  const timer = useRef(0);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reading) return;
    timer.current = window.setTimeout(() => {
      read = true;
      setReading(false);
      setLines([{ id: "hi", from: "lumi", text: script.greeting }]);
    }, reduce ? 0 : READ_MS);
    return () => window.clearTimeout(timer.current);
    // Once per opening.
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Keep the newest line in view as the conversation grows.
  useEffect(() => {
    if (lines.length > 1 || thinking) end.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [lines.length, thinking, reduce]);

  const ask = (id: string) => {
    const t = script.topics[id];
    if (!t || thinking) return;
    const done = [...asked, id];
    setAsked(done);
    setOffer([]);
    setLines((ls) => [...ls, { id: `q-${id}`, from: "you", text: t.ask }]);
    setThinking(true);
    timer.current = window.setTimeout(
      () => {
        setThinking(false);
        setLines((ls) => [...ls, { id: `a-${id}`, from: "lumi", text: t.answer, ai: true }]);
        const fresh = (ids: string[]) => ids.filter((x) => !done.includes(x));
        const next = fresh(t.next);
        setOffer((next.length ? next : fresh([...script.start, ...Object.keys(script.topics)])).slice(0, 2));
      },
      reduce ? 300 : thinkMs(t.answer),
    );
  };

  const answer = (id: string, a: string) => lumi.answer(id, a);

  const rise = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, filter: "blur(2px)", transform: "translateY(6px)" },
        animate: { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" },
        exit: { opacity: 0, filter: "blur(2px)" },
      };
  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <div className={l.chat}>
      <header className={l.chatHead}>
        <span className={l.chatOrb} data-busy={reading || thinking}>
          <SunOrb />
        </span>
        <h2>Lumi</h2>
      </header>

      <div className={l.thread} aria-live="polite">
        {reading && (
          <p className={l.status} role="status">
            <span className={l.shimmer}>Reading your {d.scans.length} scans…</span>
          </p>
        )}
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              className={l.line}
              data-from={line.from}
              {...rise}
              transition={{ duration: 0.3, ease }}
            >
              {line.from === "lumi" ? <Written text={line.text} /> : <p>{line.text}</p>}
              {line.ai && <small className={l.ai}>AI-generated · not medical advice</small>}
            </motion.div>
          ))}
          {thinking && (
            <motion.p key="thinking" className={l.status} role="status" {...rise} transition={{ duration: 0.2, ease }}>
              <span className={l.shimmer}>Looking at your scans…</span>
            </motion.p>
          )}
        </AnimatePresence>

        {!reading && offer.length > 0 && (
          <div key={offer.join()} className={l.chips}>
            {offer.map((id, i) => (
              <button key={id} onClick={() => ask(id)} style={{ "--i": i } as CSSProperties}>
                {script.topics[id].ask}
                <Icon name="chevronR" size={10} stroke={2} />
              </button>
            ))}
          </div>
        )}
        <div ref={end} />
      </div>

      {!reading && qs.length > 0 && (
        <section className={l.asks} aria-label="Lumi's questions for you">
          <h3>Lumi’s questions</h3>
          <ul className={m.questions}>
            {qs.map((q) => {
              const given = answers[q.id];
              return (
                <motion.li key={q.id} layout={!reduce} className={m.question} transition={{ layout: { duration: 0.28, ease } }}>
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
                      <motion.p key="noted" className={m.noted} {...rise} transition={{ duration: 0.22, ease }} aria-live="polite">
                        <Icon name="check" size={14} stroke={2} />
                        Noted: {given}
                      </motion.p>
                    ) : (
                      <motion.div key="ask" {...rise} transition={{ duration: 0.18, ease }}>
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
        </section>
      )}

      <p className={m.lumiFoot}>Lumi is an AI. It spots patterns in your scans; it can’t diagnose.</p>
    </div>
  );
}

/** Lumi's words arrive a few at a time, the way a reply is written. */
function Written({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <p className={l.written}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <span key={i} style={{ "--w": i } as CSSProperties} aria-hidden>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}
