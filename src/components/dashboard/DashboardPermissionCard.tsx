"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import { permissionsApi } from "@/lib/api";
import { PermissionSessionCard } from "@/components/attendance/PunchClockCard";

export default function DashboardPermissionCard() {
  const { user } = useAuth();
  const ctx = useAttendance();
  const [requests, setRequests] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = async () => {
    if (user?.role !== "EMPLOYEE") return;
    try {
      const response = await permissionsApi.my();
      setRequests(response?.data?.requests || []);
    } catch {
      // The dashboard should remain usable if the permissions endpoint is unavailable.
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [user?.role]);

  if (user?.role !== "EMPLOYEE") return null;

  const run = async (requestId: string, action: "start" | "end") => {
    if (!ctx.currentLocation) {
      await ctx.retryLocation();
      return;
    }
    setBusy(true);
    try {
      const response = await permissionsApi[action](requestId, {
        ...ctx.currentLocation,
        locationLabel: ctx.currentPlace || undefined,
      });
      if (response?.success) {
        toast.success(action === "start" ? "Permission timer started" : "Permission timer stopped");
        await load();
      } else toast.error(response?.message || "Permission update failed");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Permission update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full min-w-0">
      <PermissionSessionCard
        requests={requests}
        now={now}
        currentLocation={ctx.currentLocation}
        currentPlace={ctx.currentPlace}
        locationStatus={ctx.locationStatus}
        isWithinGeofence={ctx.isWithinGeofence}
        distanceToBranch={ctx.distanceToBranch}
        busy={busy}
        onRefreshLocation={ctx.retryLocation}
        onStart={(id) => run(id, "start")}
        onEnd={(id) => run(id, "end")}
      />
    </div>
  );
}
