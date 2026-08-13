import { useSyncExternalStore } from "react";

import { DEFAULT_SETTINGS, type AppSettings } from "./defaults";

const STORAGE_KEY = "befdss.settings.v1";

/**
 * System parameters, held in a small external store.
 *
 * These belong to the installation rather than to a page, and the pipeline
 * reads them at the moment a step runs — so a module store subscribed to via
 * `useSyncExternalStore` keeps them available everywhere without threading a
 * provider through the tree.
 *
 * Persistence is local for now: the server has no settings model (the
 * `parameters` app was removed), so these live in the browser until an
 * endpoint exists to hold them.
 */

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    // Merge over the defaults so a stored blob from an older shape can't drop
    // a field and leave the pipeline reading undefined.
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let current: AppSettings = load();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = (): AppSettings => current;

function persist(next: AppSettings) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — settings still apply for this session */
  }
  emit();
}

export function updateSettings(patch: Partial<AppSettings>): void {
  persist({ ...current, ...patch });
}

export function resetSettings(): void {
  persist({ ...DEFAULT_SETTINGS });
}

/** Read the settings outside React — used by the pipeline call sites. */
export const getSettings = (): AppSettings => current;

/** Whether anything differs from the shipped defaults. */
export function isModified(settings: AppSettings = current): boolean {
  return (Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]).some(
    (key) => settings[key] !== DEFAULT_SETTINGS[key],
  );
}

export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
