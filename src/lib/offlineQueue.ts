import { supabase } from '@/integrations/supabase/client';

export interface QueueItem {
  id: string;
  table: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'failed';
}

const STORAGE_KEY = 'outlier_offline_queue';
const MAX_RETRIES = 3;

function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(items: QueueItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    console.error('[OfflineQueue] Failed to persist queue');
  }
}

let flushInProgress = false;
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function onQueueChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function enqueue(table: string, payload: Record<string, unknown>) {
  const queue = loadQueue();
  queue.push({
    id: crypto.randomUUID(),
    table,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  });
  saveQueue(queue);
  notifyListeners();
  console.log(`[OfflineQueue] Enqueued item for ${table}. Queue size: ${queue.length}`);
}

export async function flush(): Promise<number> {
  if (flushInProgress) return 0;
  flushInProgress = true;

  const queue = loadQueue();
  const pending = queue.filter(i => i.status === 'pending');
  if (pending.length === 0) {
    flushInProgress = false;
    return 0;
  }

  console.log(`[OfflineQueue] Flushing ${pending.length} items...`);
  let synced = 0;

  for (const item of pending) {
    try {
      const { error } = await (supabase.from(item.table as any) as any).insert(item.payload);
      if (error) throw error;

      // Remove from queue on success
      const current = loadQueue();
      saveQueue(current.filter(i => i.id !== item.id));
      synced++;
      console.log(`[OfflineQueue] Synced item ${item.id}`);
    } catch (err) {
      console.warn(`[OfflineQueue] Retry failed for ${item.id}:`, err);
      const current = loadQueue();
      const idx = current.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        current[idx].retryCount++;
        if (current[idx].retryCount >= MAX_RETRIES) {
          current[idx].status = 'failed';
          console.error(`[OfflineQueue] Item ${item.id} permanently failed after ${MAX_RETRIES} retries`);
        }
        saveQueue(current);
      }
    }
  }

  flushInProgress = false;
  notifyListeners();
  return synced;
}

export function getPendingCount(): number {
  return loadQueue().filter(i => i.status === 'pending').length;
}

export function getFailedCount(): number {
  return loadQueue().filter(i => i.status === 'failed').length;
}

export function clearFailed() {
  const queue = loadQueue();
  saveQueue(queue.filter(i => i.status !== 'failed'));
  notifyListeners();
}

/** Call once at app root to set up auto-flush listeners */
export function initAutoFlush() {
  const tryFlush = () => {
    if (navigator.onLine) flush();
  };

  window.addEventListener('online', tryFlush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tryFlush();
  });

  // Initial flush on load
  tryFlush();

  return () => {
    window.removeEventListener('online', tryFlush);
  };
}
