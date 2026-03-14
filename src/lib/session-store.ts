import { openDB, type IDBPDatabase } from 'idb';
import type { Session } from './types';

const DB_NAME = 'ipsumm';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-mode', 'mode');
      }
    },
  });
}

export async function createSession(
  session: Omit<Session, 'id'>,
): Promise<Session> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const full: Session = { ...session, id };
  await db.put(STORE_NAME, full);
  return full;
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function listSessions(): Promise<Session[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
  return all.reverse(); // newest first
}

export async function updateSession(
  id: string,
  data: Partial<Omit<Session, 'id'>>,
): Promise<Session | undefined> {
  const db = await getDB();
  const existing = await db.get(STORE_NAME, id);
  if (!existing) return undefined;
  const updated = { ...existing, ...data };
  await db.put(STORE_NAME, updated);
  return updated;
}

export async function deleteSession(id: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get(STORE_NAME, id);
  if (!existing) return false;
  await db.delete(STORE_NAME, id);
  return true;
}

export async function checkStorageQuota(): Promise<{
  used: number;
  available: number;
  percentUsed: number;
} | null> {
  if (!navigator?.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  const used = estimate.usage ?? 0;
  const available = estimate.quota ?? 0;
  return {
    used,
    available,
    percentUsed: available > 0 ? (used / available) * 100 : 0,
  };
}
