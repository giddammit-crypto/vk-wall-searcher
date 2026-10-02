/**
 * THE LAST ARCHIVE — PoC-прототип
 * save.js — сейв/лоад со схемой и версией (§2.2, §3.2 п.8).
 * Хранилище: localStorage (браузер) / память (headless-тесты).
 */

export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_KEY = 'tla.save.v1';

export function createSaveSystem(storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : memoryStorage());
  return {
    has(slot = 0) {
      return !!store.getItem(`${SAVE_KEY}.${slot}`);
    },
    save(snapshot, slot = 0) {
      const payload = {
        schema: SAVE_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        state: snapshot,
      };
      store.setItem(`${SAVE_KEY}.${slot}`, JSON.stringify(payload));
      return payload;
    },
    load(slot = 0) {
      const raw = store.getItem(`${SAVE_KEY}.${slot}`);
      if (!raw) return null;
      try {
        const payload = JSON.parse(raw);
        if (!payload || payload.schema !== SAVE_SCHEMA_VERSION) return null;
        return payload;
      } catch (e) {
        return null;
      }
    },
    clear(slot = 0) {
      store.removeItem(`${SAVE_KEY}.${slot}`);
    },
  };
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
