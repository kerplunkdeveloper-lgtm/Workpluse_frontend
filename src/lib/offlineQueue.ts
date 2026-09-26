/**
 * offlineQueue.ts
 *
 * IndexedDB wrapper for storing attendance punch events when offline.
 * When the device goes offline, punches are saved here with their exact timestamp.
 * When connectivity is restored, they are synced to the server in chronological order.
 *
 * Storage: IndexedDB → database "workpulse_offline" → objectStore "pending_punches"
 */

const DB_NAME = "workpulse_offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_punches";

export interface OfflinePunch {
  id: string;          // UUID generated on device (used to clear after sync)
  ownerId: string;     // Authenticated user that created the event
  type: "CHECK_IN" | "CHECK_OUT" | "BREAK_START" | "BREAK_END" | "WFH_CHECK_IN";
  timestamp: string;   // ISO 8601 — EXACT time the user tapped the button
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  wfhNote?: string;
  workMode?: string;
  note?: string;
  deviceId?: string;
  locationLabel?: string;
  enqueuedAt: string;  // ISO — when it was saved to IndexedDB (for display)
}

// ─── Open / initialise DB ────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available in this environment"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    req.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─── Save a new punch to the offline queue ────────────────────────────────────

export async function enqueuePunch(
  punch: Omit<OfflinePunch, "id" | "enqueuedAt">
): Promise<OfflinePunch> {
  const db = await openDB();
  const entry: OfflinePunch = {
    ...punch,
    id: crypto.randomUUID(),
    enqueuedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).add(entry);
    req.onsuccess = () => resolve(entry);
    req.onerror = () => reject(req.error);
  });
}

// ─── Retrieve all pending (unsynced) punches ──────────────────────────────────

export async function getAllPendingPunches(ownerId: string): Promise<OfflinePunch[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).index("timestamp").getAll();
    req.onsuccess = () => resolve((req.result as OfflinePunch[]).filter((entry) => entry.ownerId === ownerId));
    req.onerror = () => reject(req.error);
  });
}

// ─── Remove successfully synced punches by their IDs ─────────────────────────

export async function removePunches(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    ids.forEach((id) => {
      store.delete(id);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Count how many punches are waiting to be synced ─────────────────────────

export async function getPendingCount(ownerId?: string): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const entries = req.result as OfflinePunch[];
        resolve(ownerId ? entries.filter((entry) => entry.ownerId === ownerId).length : entries.length);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

// ─── Clear all pending punches (use after full sync) ─────────────────────────

export async function clearAllPunches(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore in SSR
  }
}
