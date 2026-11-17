"use client";

import { useSyncExternalStore } from "react";

const manila = { timeZone: "Asia/Manila" } as const;
const day = new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric", ...manila });
const time = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit", ...manila });

const everySecond = (tick: () => void) => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
};

/** "Wed, Nov 18, 2026 · 4:26:08 AM" in shop time, ticking each second. The server renders "Today" (no clock there). */
export function LiveClock() {
  const now = useSyncExternalStore(
    everySecond,
    () => {
      const d = new Date();
      return `${day.format(d)} · ${time.format(d)}`;
    },
    () => null,
  );
  return <span className="tabular-nums">{now ?? "Today"}</span>;
}
