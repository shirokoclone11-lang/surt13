import { outer } from '@/core/outer.js';

const STORAGE_KEY = 'surplus_settings';

export let initialized = false;

export function initStore() {
  initialized = true;
  return true;
}

const encodeToHex = (value) => {
  let hex = '';
  for (let i = 0; i < value.length; i++) {
    hex += value.charCodeAt(i).toString(16).padStart(4, '0');
  }
  return hex;
};

const decodeFromHex = (value) => {
  if (typeof value !== 'string' || value.length % 4 !== 0) {
    return null;
  }

  let decoded = '';
  for (let i = 0; i < value.length; i += 4) {
    const chunk = value.slice(i, i + 4);
    const code = Number.parseInt(chunk, 16);
    if (Number.isNaN(code)) {
      return null;
    }
    decoded += String.fromCharCode(code);
  }

  return decoded;
};

export function write(value) {
  initStore();

  try {
    const source = typeof value === 'string' ? value : String(value ?? '');
    const storedValue = encodeToHex(source);
    outer.localStorage.setItem(STORAGE_KEY, storedValue);
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
}

export function read() {
  initStore();

  try {
    const encoded = outer.localStorage.getItem(STORAGE_KEY);
    return encoded ? decodeFromHex(encoded) : null;
  } catch (e) {
    console.error('Failed to read settings:', e);
    return null;
  }
}
