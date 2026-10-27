"use client";

import React, { useEffect, useState } from "react";















// Only this small component re-renders every second; the dashboard itself
// ticks once a minute so its derived lists are not rebuilt 60 times a minute.
export function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      {now.toLocaleTimeString("en-IN", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </>
  );
}
