"use client";

import React, { useEffect, useState } from "react";
import { formatIndiaTime } from "@/lib/utils";
export function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      {formatIndiaTime(now)} IST
    </>
  );
}
