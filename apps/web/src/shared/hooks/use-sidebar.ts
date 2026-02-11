import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

let collapsed = loadInitial();

const listeners = new Set<() => void>();

function loadInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return collapsed;
}

export function useSidebar() {
  const isCollapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = useCallback(() => {
    collapsed = !collapsed;
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // storage full or unavailable
    }
    emitChange();
  }, []);

  return { isCollapsed, toggle } as const;
}
