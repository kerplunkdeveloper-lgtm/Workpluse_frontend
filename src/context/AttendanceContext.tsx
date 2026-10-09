"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { AttendanceTodayStatus } from "@/types";
import { attendanceApi, getWebDeviceId } from "@/lib/api";
import {
  enqueuePunch,
  getAllPendingPunches,
  removePunches,
  getPendingCount,
  OfflinePunch,
} from "@/lib/offlineQueue";
import { useAuth } from "./AuthContext";
import { calculateDistanceMeters } from "@/lib/utils";
import { reverseGeocodeLabel } from "@/lib/reverseGeocode";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface PunchOptions {
  workMode?: "OFFICE" | "SHOOT" | "WORK_FROM_HOME" | "CLIENT_VISIT" | "TRAVEL";
  note?: string;
  locationLabel?: string;
}

interface AttendanceContextType {
  todayStatus: AttendanceTodayStatus | null;
  isLoading: boolean;
  isActionLoading: boolean;
  currentLocation: GeoCoordinates | null;
  locationLabel: string | null;
  locationError: string | null;
  distanceToBranch: number | null;
  isWithinGeofence: boolean;
  // Offline-aware state
  isOnline: boolean;
  pendingPunchCount: number;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  // Actions
  checkIn: (options?: PunchOptions) => Promise<boolean>;
  checkOut: (options?: PunchOptions) => Promise<boolean>;
  startBreak: () => Promise<boolean>;
  endBreak: () => Promise<boolean>;
  wfhCheckIn: (note?: string) => Promise<boolean>;
  triggerSync: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const [todayStatus, setTodayStatus] = useState<AttendanceTodayStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<GeoCoordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distanceToBranch, setDistanceToBranch] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(true);

  // ── Offline tracking ────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingPunchCount, setPendingPunchCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const isSyncingRef = useRef(false);
  const fetchTodayStatusRef = useRef<(() => Promise<void>) | null>(null);

  // ── Refresh pending count from IndexedDB ────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount(user?.id);
    setPendingPunchCount(count);
  }, [user?.id]);

  // ── Sync offline queue to server ────────────────────────────────────────────
  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current || !token || !user?.id) return;
    isSyncingRef.current = true;
    setSyncStatus("syncing");

    try {
      const pending = await getAllPendingPunches(user.id);
      if (pending.length === 0) {
        setSyncStatus("idle");
        isSyncingRef.current = false;
        return;
      }

      toast.loading(`Syncing ${pending.length} offline punch${pending.length > 1 ? "es" : ""}...`, {
        id: "offline-sync",
      });

      const result = await attendanceApi.syncOffline(pending);

      // Remove punches that were synced or were already-processed duplicates (SKIPPED)
      const clearedIds = (result.results || [])
        .filter((r: any) => r.status === "SYNCED" || r.status === "SKIPPED")
        .map((r: any) => r.localId);

      if (clearedIds.length > 0) {
        await removePunches(clearedIds);
      }

      await refreshPendingCount();
      await fetchTodayStatusRef.current?.();

      setSyncStatus("synced");
      setLastSyncedAt(new Date());
      toast.dismiss("offline-sync");

      if (result.synced > 0) {
        toast.success(
          `✅ ${result.synced} punch${result.synced > 1 ? "es" : ""} synced to server.${result.failed > 0 ? ` (${result.failed} failed)` : ""}`
        );
      } else if (result.skipped > 0 && result.synced === 0) {
        toast.info("All offline punches were already recorded.");
      }
    } catch (err: any) {
      setSyncStatus("error");
      toast.dismiss("offline-sync");
      toast.error("Sync failed. Will retry when connection is stable.");
      console.error("Offline sync error:", err);
    } finally {
      isSyncingRef.current = false;
      // Reset to idle after 5 seconds so badge clears
      setTimeout(() => setSyncStatus((prev) => (prev === "synced" ? "idle" : prev)), 5000);
    }
  }, [token, user?.id, refreshPendingCount]);

  // ── Online / offline event listeners ────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      toast.info("Connection restored. Syncing offline punches...", { duration: 2500 });
      // Small delay to ensure network is stable before syncing
      setTimeout(() => triggerSync(), 1500);
    };

    const onOffline = () => {
      setIsOnline(false);
      toast.warning("📴 You are offline. Punches will be saved locally and synced automatically.", {
        duration: 4000,
      });
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [triggerSync]);

  // ── Track browser GPS location ───────────────────────────────────────────────
  const applyCoords = useCallback(
    async (coords: GeoCoordinates) => {
      setCurrentLocation(coords);
      setLocationError(null);
      setIsWithinGeofence(true);
      const branch = user?.employee?.branch;
      if (branch && branch.latitude && branch.longitude) {
        const branchLat = typeof branch.latitude === "string" ? parseFloat(branch.latitude) : branch.latitude;
        const branchLng = typeof branch.longitude === "string" ? parseFloat(branch.longitude) : branch.longitude;
        setDistanceToBranch(calculateDistanceMeters(coords.latitude, coords.longitude, branchLat, branchLng));
      }
      const label = await reverseGeocodeLabel(coords.latitude, coords.longitude);
      if (label) setLocationLabel(label);
      return label;
    },
    [user]
  );

  const requestBrowserLocation = useCallback((): Promise<GeoCoordinates | null> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        setIsWithinGeofence(true);
        setLocationError("Geolocation is not supported by this browser.");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          await applyCoords(coords);
          resolve(coords);
        },
        (error) => {
          setDistanceToBranch(null);
          setIsWithinGeofence(true);
          // Browser messages ("User denied Geolocation") aren't written for employees.
          setLocationError(
            error.code === error.PERMISSION_DENIED
              ? "Location is turned off for this site. Allow location in your browser settings so your check-in can be verified."
              : error.code === error.TIMEOUT
                ? "Finding your location is taking too long. Move near a window or turn on GPS, then try again."
                : "We couldn't find your location right now. Check that location services are on."
          );
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
      );
    });
  }, [applyCoords]);

  const updateLocation = useCallback(() => {
    void requestBrowserLocation();
  }, [requestBrowserLocation]);

  const fetchTodayStatus = useCallback(async () => {
    if (!token || !isOnline) return;
    setIsLoading(true);
    try {
      const res = await attendanceApi.getTodayStatus();
      const raw = res?.data || res;
      if (raw) {
        const hasCheckedIn = Boolean(
          raw.hasCheckedIn ||
          raw.clockedIn ||
          raw.attendance?.checkIn
        );
        const hasCheckedOut = Boolean(
          raw.hasCheckedOut ||
          raw.attendance?.checkOut
        );
        const isOnBreak = Boolean(raw.isOnBreak);
        const isWorkFromHome = Boolean(
          raw.isWorkFromHome ||
          raw.attendance?.status === "WORK_FROM_HOME" ||
          raw.attendance?.wfhNote?.toLowerCase().includes("home")
        );

        setTodayStatus({
          hasCheckedIn,
          hasCheckedOut,
          isOnBreak,
          isWorkFromHome,
          attendance: raw.attendance,
          totalBreakMinutes: raw.totalBreakMinutes || raw.attendance?.breakMinutes || 0,
          workedMinutesToday: raw.attendance?.workingMinutes || 0,
          shift: raw.employee?.shift || raw.shift,
          locationPolicy: raw.locationPolicy,
        });
        if (raw.attendance?.checkInLocation) {
          setLocationLabel(raw.attendance.checkInLocation);
        }
      }
    } catch (err: any) {
      console.warn("Could not fetch today status:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, isOnline]);

  useEffect(() => {
    fetchTodayStatusRef.current = fetchTodayStatus;
  }, [fetchTodayStatus]);

  useEffect(() => {
    if (token) {
      fetchTodayStatus();
      refreshPendingCount();
      updateLocation();
      const interval = setInterval(updateLocation, 30000);
      return () => clearInterval(interval);
    }
  }, [token, fetchTodayStatus, updateLocation, refreshPendingCount]);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#4f46e5", "#38bdf8", "#10b981", "#f59e0b"],
      });
    } catch {
      // ignore
    }
  };

  // ── Generic punch handler — online: call API / offline: save to IndexedDB ───
  const handlePunch = useCallback(
    async (
      type: OfflinePunch["type"],
      apiCall: () => Promise<any>,
      successMessage: string,
      coords?: GeoCoordinates,
      metadata?: Pick<OfflinePunch, "workMode" | "note" | "wfhNote" | "deviceId" | "locationLabel">
    ): Promise<boolean> => {
      setIsActionLoading(true);
      const punchTimestamp = new Date().toISOString();

      try {
        if (!isOnline) {
          // OFFLINE — save to IndexedDB
          await enqueuePunch({
            ownerId: user?.id || "",
            type,
            timestamp: punchTimestamp,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            accuracy: coords?.accuracy,
            ...metadata,
          });
          await refreshPendingCount();
          toast.success(`📴 ${successMessage} (saved offline — will sync when online)`, {
            duration: 4000,
          });
          // Optimistically update local UI state
          if (type === "CHECK_IN") {
            setTodayStatus((prev: any) => ({
              ...(prev || {}),
              hasCheckedIn: true,
              hasCheckedOut: false,
              checkInTime: punchTimestamp,
              isOfflinePunch: true,
            }));
          } else if (type === "CHECK_OUT") {
            setTodayStatus((prev: any) => ({
              ...(prev || {}),
              hasCheckedOut: true,
              checkOutTime: punchTimestamp,
              isOfflinePunch: true,
            }));
          } else if (type === "BREAK_START") {
            setTodayStatus((prev: any) => ({ ...(prev || {}), isOnBreak: true }));
          } else if (type === "BREAK_END") {
            setTodayStatus((prev: any) => ({ ...(prev || {}), isOnBreak: false }));
          }
          return true;
        }

        // ONLINE — call API normally
        const res = await apiCall();
        if (res?.success) {
          const confirmMsg = res.message ? `✅ ${res.message}` : successMessage;
          toast.success(confirmMsg, {
            duration: 5000,
            description:
              type === "CHECK_IN"
                ? "Attendance recorded. Your shift is now active."
                : "Shift completed. Working hours safely logged to timesheet.",
          });
          triggerCelebration();
          await fetchTodayStatus();
          return true;
        }
        toast.error(res?.message || `${type} failed`);
        return false;
      } catch (err: any) {
        // Network error while "online" — save offline as fallback
        if (!navigator.onLine || err.code === "ERR_NETWORK" || err.message?.includes("Network")) {
          await enqueuePunch({
            ownerId: user?.id || "",
            type,
            timestamp: punchTimestamp,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            accuracy: coords?.accuracy,
            ...metadata,
          });
          await refreshPendingCount();
          toast.warning(`📴 Network offline — ${successMessage} saved locally.`, { duration: 5000 });
          return true;
        }
        const data = err.response?.data;
        const locationTitle: Record<string, string> = {
          LOCATION_REQUIRED: "Turn on location to check in",
          LOCATION_IMPRECISE: "Your location isn't precise enough",
          OUTSIDE_OFFICE: "You're outside the office area",
        };
        if (data?.code && locationTitle[data.code]) {
          toast.error(locationTitle[data.code], { description: data.message, duration: 9000 });
        } else {
          toast.error(data?.message || err.message || `${type} failed`);
        }
        return false;
      } finally {
        setIsActionLoading(false);
      }
    },
    [isOnline, fetchTodayStatus, refreshPendingCount, user?.id]
  );

  // ── Individual punch actions ─────────────────────────────────────────────────

  const checkIn = useCallback(
    async (options?: PunchOptions): Promise<boolean> => {
      const coords = currentLocation || (await requestBrowserLocation()) || undefined;
      const resolvedLabel =
        options?.locationLabel ||
        locationLabel ||
        (coords ? await reverseGeocodeLabel(coords.latitude, coords.longitude) : null) ||
        undefined;
      const modeLabel =
        options?.workMode === "SHOOT"
          ? "On-Site Shoot"
          : options?.workMode === "WORK_FROM_HOME"
          ? "Work From Home"
          : options?.workMode === "CLIENT_VISIT"
          ? "Client Visit"
          : options?.workMode === "TRAVEL"
          ? "Travel / Field"
          : "Office HQ";

      return handlePunch(
        "CHECK_IN",
        () => attendanceApi.checkIn({ ...(coords || {}), ...options, locationLabel: resolvedLabel }),
        resolvedLabel
          ? `Check-in confirmed from ${resolvedLabel}.`
          : `Check-in Confirmed! Started shift in ${modeLabel} mode.`,
        coords,
        {
          workMode: options?.workMode,
          note: options?.note,
          deviceId: getWebDeviceId() || undefined,
          locationLabel: resolvedLabel,
        }
      );
    },
    [currentLocation, handlePunch, locationLabel, requestBrowserLocation]
  );

  const checkOut = useCallback(
    async (options?: PunchOptions): Promise<boolean> => {
      const coords = currentLocation || (await requestBrowserLocation()) || undefined;
      const resolvedLabel =
        options?.locationLabel ||
        locationLabel ||
        (coords ? await reverseGeocodeLabel(coords.latitude, coords.longitude) : null) ||
        undefined;
      return handlePunch(
        "CHECK_OUT",
        () => attendanceApi.checkOut({ ...(coords || {}), ...options, locationLabel: resolvedLabel }),
        resolvedLabel ? `Check-out confirmed from ${resolvedLabel}.` : "Check-out Confirmed! Shift concluded successfully.",
        coords,
        {
          workMode: options?.workMode,
          note: options?.note,
          deviceId: getWebDeviceId() || undefined,
          locationLabel: resolvedLabel,
        }
      );
    },
    [currentLocation, handlePunch, locationLabel, requestBrowserLocation]
  );

  const startBreak = useCallback(async (): Promise<boolean> => {
    const coords = currentLocation
      ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
      : undefined;
    return handlePunch(
      "BREAK_START",
      () => attendanceApi.startBreak(coords),
      "Break started!",
      coords
        ? { latitude: coords.latitude, longitude: coords.longitude }
        : undefined
    );
  }, [currentLocation, handlePunch]);

  const endBreak = useCallback(async (): Promise<boolean> => {
    const coords = currentLocation
      ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
      : undefined;
    return handlePunch(
      "BREAK_END",
      () => attendanceApi.endBreak(coords),
      "Break ended!",
      coords
        ? { latitude: coords.latitude, longitude: coords.longitude }
        : undefined
    );
  }, [currentLocation, handlePunch]);

  const wfhCheckIn = useCallback(async (note?: string): Promise<boolean> => {
    setIsActionLoading(true);
    const punchTimestamp = new Date().toISOString();
    try {
      if (!isOnline) {
        await enqueuePunch({ ownerId: user?.id || "", type: "WFH_CHECK_IN", timestamp: punchTimestamp, wfhNote: note, deviceId: getWebDeviceId() || undefined });
        await refreshPendingCount();
        setTodayStatus((prev: any) => ({
          ...(prev || {}),
          hasCheckedIn: true,
          isWorkFromHome: true,
          isOfflinePunch: true,
        }));
        toast.success("📴 WFH Clock-in saved offline — will sync automatically.", { duration: 4000 });
        return true;
      }
      const res = await attendanceApi.wfhCheckIn(note);
      if (res?.success) {
        toast.success("Remote WFH Clock-in successful!");
        triggerCelebration();
        await fetchTodayStatus();
        return true;
      }
      toast.error(res?.message || "WFH check-in failed");
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "WFH check-in failed");
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, [isOnline, fetchTodayStatus, refreshPendingCount, user?.id]);

  return (
    <AttendanceContext.Provider
      value={{
        todayStatus,
        isLoading,
        isActionLoading,
        currentLocation,
        locationLabel,
        locationError,
        distanceToBranch,
        isWithinGeofence,
        isOnline,
        pendingPunchCount,
        syncStatus,
        lastSyncedAt,
        checkIn,
        checkOut,
        startBreak,
        endBreak,
        wfhCheckIn,
        triggerSync,
        refreshStatus: fetchTodayStatus,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
};
