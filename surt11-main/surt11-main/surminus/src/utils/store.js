import { outer } from '@/core/outer.js';

const STORAGE_KEY = 'surminus_config';

export let initialized = false;

export function initStore() {
  initialized = true;
  return true;
}

export function write(value) {
  initStore();

  const source = typeof value === 'string' ? value : String(value ?? '');
  try {
    outer.localStorage.setItem(STORAGE_KEY, source);
    return true;
  } catch (e) {
    console.error('[SurMinus] Failed to write config to localStorage:', e);
    return false;
  }
}

export function read() {
  initStore();
  try {
    const stored = outer.localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored : null;
  } catch (e) {
    console.error('[SurMinus] Failed to read config from localStorage:', e);
    return null;
  }
}
