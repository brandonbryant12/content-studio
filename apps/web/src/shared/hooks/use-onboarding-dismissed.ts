import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'onboarding-dismissed';

let dismissed = loadInitial();

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
  return dismissed;
}

export function useOnboardingDismissed() {
  const isDismissed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const dismiss = useCallback(() => {
    dismissed = true;
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // storage full or unavailable
    }
    emitChange();
  }, []);

  return { isDismissed, dismiss } as const;
}
