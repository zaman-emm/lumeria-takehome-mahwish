"use client";

import { useState } from "react";
import { lumiQuestions, metricMeta, type Derived } from "@/lib/insights";
import { Icon } from "./Visuals";
import r from "./report.module.css";

// Lumi, the report's AI. It asks about the patterns it noticed instead of
// explaining them, one clue at a time, and says plainly that it doesn't diagnose.

export function Lumi({ d }: { d: Derived }) {
  const qs = lumiQuestions(d);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <div className={r.lumi}>
      <header className={r.lumiHead}>
        <span className={r.lumiMark}>
          <Icon name="spark" size={20} />
        </span>
        <h2>Lumi</h2>
      </header>
      {qs.length === 0 ? (
        <p className={r.hint}>Nothing to ask yet. A few more scans of the same spot and I’ll have questions.</p>
      ) : (
        <ol className={r.lumiList}>
          {qs.map((q) => {
            const picked = answers[q.id];
            return (
              <li key={q.id}>
                <p className={r.lumiSeen}>
                  <Icon name={q.seen.key} size={14} />
                  {metricMeta(q.seen.key).label} {q.seen.from}
                  <Icon name="chevronR" size={10} />
                  <b>{q.seen.to}</b>
                  {q.seen.when && <span>{q.seen.when}</span>}
                </p>
                <p className={r.lumiAsk}>{q.ask}</p>
                {picked ? (
                  <p className={r.lumiDone}>
                    <Icon name="check" size={14} />
                    {picked}. Noted for your next read.
                  </p>
                ) : (
                  <div className={r.lumiAnswers}>
                    {q.answers.map((a) => (
                      <button key={a} onClick={() => setAnswers((m) => ({ ...m, [q.id]: a }))}>
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className={r.aiNote}>Lumi is an AI. It spots patterns in your scans; it can’t diagnose.</p>
    </div>
  );
}
