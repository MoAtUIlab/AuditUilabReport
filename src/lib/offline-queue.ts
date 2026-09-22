import type { Audit, EvidencePhoto } from "./audit-types";

/**
 * Remote-site support: audits captured with no signal are kept on the device and
 * pushed as soon as the connection returns. Photos are held as blobs in IndexedDB.
 */

const AUDIT_QUEUE = "uilab-pending-audits";
const AUDIT_CACHE = "uilab-audit-cache";
const DB_NAME = "uilab-offline";
const STORE = "photos";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ------------------------------ audit queue ------------------------------ */

export function pendingAudits(): Audit[] {
  if (typeof window === "undefined") return [];
  return safeParse<Audit[]>(localStorage.getItem(AUDIT_QUEUE), []);
}

export function queueAudit(audit: Audit) {
  if (typeof window === "undefined") return;
  const rest = pendingAudits().filter((a) => a.id !== audit.id);
  localStorage.setItem(AUDIT_QUEUE, JSON.stringify([...rest, audit]));
}

export function unqueueAudit(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUDIT_QUEUE, JSON.stringify(pendingAudits().filter((a) => a.id !== id)));
}

export function cacheAudits(audits: Audit[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIT_CACHE, JSON.stringify(audits));
  } catch {
    /* storage full — cache is best-effort */
  }
}

export function cachedAudits(): Audit[] {
  if (typeof window === "undefined") return [];
  return safeParse<Audit[]>(localStorage.getItem(AUDIT_CACHE), []);
}

/**
 * Cached list plus anything still waiting to sync, newest first.
 *
 * `allowLocal` must be false until the caller is certain it's past the first
 * client render (e.g. a post-mount effect has run) — reading localStorage on
 * that first render makes it diverge from the server-rendered HTML, which
 * has no localStorage to read, and triggers a hydration mismatch.
 */
export function mergedAudits(remote: Audit[] | undefined, allowLocal = true): Audit[] {
  const base = remote ?? (allowLocal ? cachedAudits() : []);
  const map = new Map(base.map((a) => [a.id, a]));
  if (allowLocal) {
    for (const q of pendingAudits()) {
      const existing = map.get(q.id);
      if (!existing || q.updatedAt >= existing.updatedAt) map.set(q.id, q);
    }
  }
  return [...map.values()].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
}

/* ------------------------------ photo queue ------------------------------ */

type QueuedPhoto = { id: string; auditId: string; blob: Blob; type: string };

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function queuePhoto(auditId: string, id: string, file: Blob) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id, auditId, blob: file, type: file.type } satisfies QueuedPhoto);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function allQueuedPhotos(): Promise<QueuedPhoto[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result ?? []) as QueuedPhoto[]);
    req.onerror = () => resolve([]);
  });
}

async function removeQueuedPhoto(id: string) {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
}

export function pendingCount(): number {
  return pendingAudits().length;
}

/**
 * Push everything held on the device. Photos first (so their storage paths land
 * in the audit before it is saved), then the audits themselves.
 */
export async function flushQueue(opts: {
  uploadPhoto: (file: File) => Promise<{ path: string; url: string }>;
  saveAudit: (audit: Audit) => Promise<unknown>;
}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { synced: 0 };
  const queued = await allQueuedPhotos();
  const audits = pendingAudits();
  const uploaded = new Map<string, { path: string; url: string }>();

  for (const p of queued) {
    try {
      const file = new File([p.blob], `${p.id}.jpg`, { type: p.type || "image/jpeg" });
      uploaded.set(p.id, await opts.uploadPhoto(file));
      await removeQueuedPhoto(p.id);
    } catch {
      return { synced: 0 };
    }
  }

  let synced = 0;
  for (const audit of audits) {
    const photos: EvidencePhoto[] = audit.photos.map((photo) => {
      const up = uploaded.get(photo.id);
      return up ? { ...photo, path: up.path, url: up.url } : photo;
    });
    try {
      await opts.saveAudit({ ...audit, photos });
      unqueueAudit(audit.id);
      synced += 1;
    } catch {
      break;
    }
  }
  return { synced };
}
