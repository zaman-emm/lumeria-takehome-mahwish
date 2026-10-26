// Lumi's side of a conversation, written ahead from the report's own data.
// There's no live model: each tab offers four questions that fit it, each
// answer offers two more, and anything typed is matched to the closest one.
// Never diagnoses.

import { band, fmtDay, metricMeta, rhythm, scanTz, signed, type Derived } from "./insights";
import type { MetricKey, Scan } from "./types";

export type LumiTab = "glance" | "products" | "trends" | "calendar" | "photos";

export interface LumiTopic {
  id: string;
  /** What the person taps. */
  ask: string;
  /** What Lumi says back, one to three short sentences. */
  answer: string;
  /** Topics to offer next. */
  next: string[];
}

export interface LumiScript {
  /** Up to four topic ids to start with. */
  start: string[];
  topics: Record<string, LumiTopic>;
  /** Picks the topic closest to what someone typed, or a gentle "can't". */
  reply: (text: string) => LumiTopic;
}

const OPENERS: Record<LumiTab, string[]> = {
  glance: ["score", "biggest", "helped", "next"],
  products: ["helped", "held", "trip", "biggest"],
  trends: ["biggest", "dip", "best", "helped"],
  calendar: ["rhythm", "best", "next", "dip"],
  photos: ["photo", "biggest", "next", "best"],
};
/** Fills a tab's chips when one of its own topics has no data behind it. */
const FALLBACK = ["score", "biggest", "rhythm", "next", "photo"];

const nameOf = (title: string) => title.replace(/\s[\d.]+%.*$/, "");

/** Words that point at each topic when someone types instead of tapping. */
const KEYS: Record<string, RegExp> = {
  score: /score|mean|number|overall|good|\d{2}/,
  biggest: /chang|most|moved|improv|differen|progress/,
  helped: /help|work|best product|routine|using/,
  held: /hold|worse|sting|irritat|break ?out|bad/,
  trip: /trip|travel|away|flight|holiday|vacation|weather|humid/,
  dip: /dip|drop|fell|low|down/,
  best: /best|highest|peak|top/,
  rhythm: /often|streak|regular|consisten|habit|how am i doing/,
  next: /next|when|again|schedule/,
  photo: /photo|picture|camera|light|selfie|compar/,
};
/** Questions only a person should answer. */
const MEDICAL = /cancer|melanoma|mole|diagnos|disease|infect|prescri|medic|doctor|derm|rash|allerg|pain|bleed/;

export function lumiScript(d: Derived, tab: LumiTab): LumiScript {
  const at = (s: Scan) => fmtDay(s.takenAt, scanTz(s) ?? d.tz);
  const latest = d.latest.scores.overall;
  const changes = [...d.changes].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = changes[0];
  const helped = d.factors.find((f) => f.direction === "helped" && f.kind === "product");
  const held = d.factors.find((f) => f.direction === "held" && f.kind === "product");
  const trip = d.factors.find((f) => f.kind === "travel");
  const r = rhythm(d);
  const topics: Record<string, LumiTopic> = {};
  const add = (t: LumiTopic) => (topics[t.id] = t);

  const strongest = (Object.entries(d.latest.scores) as [MetricKey | "overall", number | null][])
    .filter((e): e is [MetricKey, number] => e[0] !== "overall" && e[1] != null)
    .sort((a, b) => b[1] - a[1]);
  const [hi, lo] = [strongest[0], strongest[strongest.length - 1]];
  const bands = { good: "the good band, 75 and up", fair: "the steady band, 60 to 74", low: "the band that needs care, under 60", none: "" };
  add({
    id: "score",
    ask: `What does ${latest} mean?`,
    answer:
      `Scores run from 0 to 100, and higher is healthier. ${latest} sits in ${bands[band(latest).tone]}. ` +
      (strongest.length > 1
        ? `${metricMeta(hi[0]).label} is your strongest today at ${hi[1]}, and ${metricMeta(lo[0]).label.toLowerCase()} has the most room at ${lo[1]}.`
        : ""),
    next: ["biggest", "next"],
  });

  if (top && Math.abs(top.delta) >= 2)
    add({
      id: "biggest",
      ask: "What changed the most?",
      answer: `${metricMeta(top.key).label} moved the most, from ${top.from} to ${top.to} (${signed(top.delta)}). ${
        helped && helped.change.key === top.key
          ? `That lines up with when you started ${nameOf(helped.title)}.`
          : changes[1] && Math.abs(changes[1].delta) >= 2
            ? `${metricMeta(changes[1].key).label} came next, ${signed(changes[1].delta)}.`
            : ""
      }`.trim(),
      next: [helped ? "helped" : "score", "next"],
    });

  if (helped)
    add({
      id: "helped",
      ask: "What’s helping my skin?",
      answer: `${nameOf(helped.title)}, most likely. ${helped.body}`,
      next: [held ? "held" : "biggest", "next"],
    });

  if (held)
    add({
      id: "held",
      ask: "Is anything holding it back?",
      answer: `${nameOf(held.title)} lines up with a dip. ${held.body} It’s a pattern, not proof, so it’s worth watching rather than worrying about.`,
      next: [helped ? "helped" : "biggest", trip ? "trip" : "next"],
    });

  if (trip)
    add({
      id: "trip",
      ask: "Did my trip change anything?",
      answer: `On your ${trip.title} (${trip.when}), ${metricMeta(trip.change.key).label.toLowerCase()} went from ${trip.change.from} to ${trip.change.to}. ${trip.body}`,
      next: ["held", "next"].filter((id) => id !== "held" || held),
    });

  if (d.dip)
    add({
      id: "dip",
      ask: "Why did it dip?",
      answer: `${metricMeta(d.dip.change.key).label} dropped to ${d.dip.change.to} on ${at(d.dip.scan)}${
        d.dip.during ? (d.dip.during.kind === "travel" ? `, during your ${d.dip.during.label}` : `, while you were using ${d.dip.during.short}`) : ""
      }. ${
        d.dip.recovered ? `It was back by ${at(d.dip.recovered)}.` : "It hasn’t fully bounced back yet, so your next few scans will tell."
      }`,
      next: ["best", trip ? "trip" : "next"],
    });

  if (d.trend && d.trend.high.id !== d.trend.low.id)
    add({
      id: "best",
      ask: "When was my skin at its best?",
      answer: `${at(d.trend.high)}, at ${d.trend.high.scores.overall}. Your lowest was ${d.trend.low.scores.overall} on ${at(d.trend.low)}.`,
      next: [d.dip ? "dip" : "biggest", "rhythm"],
    });

  add({ id: "rhythm", ask: "How am I doing with scanning?", answer: `${r.title}. ${r.body}`, next: ["next", "photo"] });

  add({
    id: "next",
    ask: "When should I scan next?",
    answer:
      r.tone === "devoted" || r.tone === "steady"
        ? `Keep doing what you’re doing: every few days, your ${d.area.toLowerCase()}, around the same time of day.`
        : `In the next two or three days. Scan your ${d.area.toLowerCase()} again around the same time of day, so the two are easy to compare.`,
    next: ["photo", "rhythm"],
  });

  add({
    id: "photo",
    ask: "How do I get comparable photos?",
    answer: `Same spot, same time, same light. Your ${d.area.toLowerCase()} is the spot you scan most, so stick with it, and face a window rather than a lamp.`,
    next: ["next", "rhythm"],
  });
  const start = [...OPENERS[tab], ...FALLBACK].filter((id, i, all) => topics[id] && all.indexOf(id) === i).slice(0, 4);
  Object.values(topics).forEach((t) => (t.next = t.next.filter((id) => topics[id] && id !== t.id)));

  // Product and trip names count as keywords too.
  const named: [string, string | undefined][] = [
    ["helped", helped && nameOf(helped.title)],
    ["held", held && nameOf(held.title)],
    ["trip", trip?.title.replace(/ trip$/i, "")],
  ];
  const reply = (text: string): LumiTopic => {
    const q = text.toLowerCase();
    if (MEDICAL.test(q))
      return {
        id: "doctor",
        ask: text,
        answer: "That’s one for a dermatologist. I can read how your skin looks in your scans, not what’s going on underneath.",
        next: start.slice(0, 2),
      };
    const byName = named.find(([id, name]) => topics[id] && name && q.includes(name.toLowerCase().split(" ")[0]));
    const id = byName?.[0] ?? Object.keys(KEYS).find((k) => topics[k] && KEYS[k].test(q));
    if (id) return { ...topics[id], ask: text };
    return {
      id: "unknown",
      ask: text,
      answer: "I can only speak to what your scans show, so I’m not sure about that one. These I can answer:",
      next: start.slice(0, 2),
    };
  };
  return { start, topics, reply };
}
