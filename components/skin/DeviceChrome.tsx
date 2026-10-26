"use client";

import { useEffect, useState } from "react";
import c from "./chrome.module.css";

// The phone around the report when it's opened on a laptop: the status bar
// (clock, the island, signal, wifi and battery) and the home indicator. Purely
// for show; on a real phone the system draws its own, so this stays hidden.

function clock() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[AP]M$/, "");
}

export function DeviceChrome() {
  const [time, setTime] = useState("");
  useEffect(() => {
    setTime(clock());
    const id = setInterval(() => setTime(clock()), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={c.chrome} aria-hidden>
      <div className={c.status}>
        <span className={c.time}>{time}</span>
        <span className={c.island} />
        <span className={c.icons}>
          <svg width="18" height="12" viewBox="0 0 18 12">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="10" y="3" width="3" height="9" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12">
            <path d="M8 11.6l2.6-2.7a3.7 3.7 0 00-5.2 0z" />
            <path d="M3.6 7.1a6.2 6.2 0 018.8 0l1.4-1.4a8.2 8.2 0 00-11.6 0z" />
            <path d="M.8 4.3a10.2 10.2 0 0114.4 0L16 3.5l-.6-.6a12.2 12.2 0 00-14.8 0L0 3.5z" />
          </svg>
          <span className={c.battery}>
            <i />
          </span>
        </span>
      </div>
      <span className={c.home} />
    </div>
  );
}
