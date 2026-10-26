"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { lumiScript, type LumiTab, type LumiTopic } from "@/lib/lumi";
import { useReportApi } from "./context";
import { Icon } from "./Icon";
import { ScrollEdge } from "./ScrollEdge";
import { SunOrb } from "./SunOrb";
import l from "./lumi.module.css";

// Lumi opens on a quiet start screen: the orb, one line asking what you'd like
// to know, and four questions that fit the tab you came from. Tap one (or type
// your own) and the orb moves up into the header, thinks, and the answer
// writes itself in with two more to follow. Everything is written ahead from
// the report's data: no live model, and it never diagnoses.

/** Thinking time grows a little with the answer, so long ones feel considered. */
const thinkMs = (text: string) => Math.min(1500, 700 + text.length * 4);
const EASE = [0.23, 1, 0.32, 1] as const;

type Line = { key: string; from: "lumi" | "you"; text: string };

export function LumiSheet({ tab }: { tab: LumiTab }) {
  const { d } = useReportApi();
  const script = useMemo(() => lumiScript(d, tab), [d, tab]);
  const reduce = useReducedMotion();

  const [lines, setLines] = useState<Line[]>([]);
  const [thinking, setThinking] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const [offer, setOffer] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const timer = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const talking = lines.length > 0;

  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Keep the newest line in view, just above the composer, as the conversation
  // grows. Once at the next frame, and again after the new line's entrance and
  // the "thinking" row's exit have settled, since both change the height the
  // first pass measured.
  useEffect(() => {
    const el = end.current;
    if (!talking || !el) return;
    const go = () => el.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
    const raf = requestAnimationFrame(go);
    const settle = window.setTimeout(go, 480);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [lines.length, thinking, offer.length, talking, reduce]);

  const ask = (t: LumiTopic) => {
    if (thinking) return;
    const done = [...asked, t.id];
    setAsked(done);
    setOffer([]);
    setLines((ls) => [...ls, { key: `you-${ls.length}`, from: "you", text: t.ask }]);
    setThinking(true);
    timer.current = window.setTimeout(
      () => {
        setThinking(false);
        setLines((ls) => [...ls, { key: `lumi-${ls.length}`, from: "lumi", text: t.answer }]);
        const fresh = (ids: string[]) => ids.filter((x) => !done.includes(x) && script.topics[x]);
        const next = fresh(t.next);
        setOffer((next.length ? next : fresh([...script.start, ...Object.keys(script.topics)])).slice(0, 2));
      },
      reduce ? 300 : thinkMs(t.answer),
    );
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft("");
    ask(script.reply(text));
  };

  const rise = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, filter: "blur(2px)", transform: "translateY(8px)" },
        animate: { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" },
        exit: { opacity: 0, filter: "blur(2px)" },
      };
  const move = { layout: { duration: 0.45, ease: EASE } };

  return (
    <div className={l.lumi} data-talking={talking}>
      <motion.header layout={!reduce} className={l.head} transition={move}>
        {talking && <ScrollEdge side="top" tint={0.9} className={l.headEdge} />}
        <motion.span layout={!reduce} className={l.orb} data-busy={thinking} transition={move}>
          <SunOrb speed={thinking ? 3 : 1} />
        </motion.span>
        <AnimatePresence mode="popLayout" initial={false}>
          {talking ? (
            <motion.h2 key="name" className={l.name} {...rise} transition={{ duration: 0.3, ease: EASE, delay: 0.1 }}>
              Lumi
            </motion.h2>
          ) : (
            <motion.h2 key="hello" className={l.hello} {...rise} transition={{ duration: 0.3, ease: EASE }}>
              Hi {d.firstName}, what would you like to know?
            </motion.h2>
          )}
        </AnimatePresence>
      </motion.header>

      {!talking ? (
        <ul className={l.starters} aria-label="Questions to ask Lumi">
          {script.start.map((id, i) => (
            <li key={id} style={{ "--i": i } as CSSProperties}>
              <button onClick={() => ask(script.topics[id])}>
                {script.topics[id].ask}
                <Icon name="arrowUR" size={16} stroke={1.6} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={l.thread} aria-live="polite">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.div key={line.key} className={l.line} data-from={line.from} {...rise} transition={{ duration: 0.3, ease: EASE }}>
                {line.from === "lumi" ? (
                  <>
                    <Written text={line.text} />
                    <small className={l.ai}>AI-generated · not medical advice</small>
                  </>
                ) : (
                  <p>{line.text}</p>
                )}
              </motion.div>
            ))}
            {thinking && (
              <motion.p key="thinking" className={l.status} role="status" {...rise} transition={{ duration: 0.2, ease: EASE }}>
                <span className={l.shimmer}>Looking at your scans…</span>
              </motion.p>
            )}
          </AnimatePresence>
          {offer.length > 0 && (
            <div key={offer.join()} className={l.chips}>
              {offer.map((id, i) => (
                <button key={id} onClick={() => ask(script.topics[id])} style={{ "--i": i } as CSSProperties}>
                  {script.topics[id].ask}
                </button>
              ))}
            </div>
          )}
          <div ref={end} className={l.end} />
        </div>
      )}

      <form className={l.composer} onSubmit={send}>
        <ScrollEdge side="bottom" tint={0.9} className={l.composerEdge} />
        <label className="sr-only" htmlFor="lumi-ask">
          Ask Lumi
        </label>
        <input
          id="lumi-ask"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Lumi"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" aria-label="Send" disabled={!draft.trim() || thinking}>
          <Icon name="up" size={16} stroke={2} />
        </button>
      </form>
    </div>
  );
}

/** Lumi's words arrive a few at a time, the way a reply is written. */
function Written({ text }: { text: string }) {
  return (
    <p className={l.written}>
      <span className="sr-only">{text}</span>
      {text.split(" ").map((w, i) => (
        <span key={i} style={{ "--w": i } as CSSProperties} aria-hidden>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}
