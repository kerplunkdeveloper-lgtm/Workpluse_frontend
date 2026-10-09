"use client";

import { useEffect, useState } from "react";
import type { SubscriptionPlanOption } from "@/types";
import { authApi } from "@/lib/api";
import { Pricing } from "./LandingSections";

export function PricingClient({ initialPlans, initialUnavailable }: { initialPlans: SubscriptionPlanOption[]; initialUnavailable: boolean }) {
  const [plans, setPlans] = useState(initialPlans);
  const [unavailable, setUnavailable] = useState(initialUnavailable);
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  useEffect(() => {
    if (initialPlans.length || !initialUnavailable) return;
    let active = true;
    authApi.getPlans().then((res) => {
      if (active) {
        setPlans(Array.isArray(res?.plans) ? res.plans : []);
        setUnavailable(false);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [initialPlans.length, initialUnavailable]);

  return <Pricing plans={plans} unavailable={unavailable} cycle={cycle} onCycle={setCycle} />;
}
