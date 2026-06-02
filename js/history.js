/**
 * history.js
 * Manages translation history using localStorage.
 * Stores up to MAX_ITEMS recent translations.
 */

const History = (() => {
  const STORAGE_KEY = "linguaflow_history";
  const MAX_ITEMS   = 30;

  /** @returns {Array} Array of history entry objects */
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  /** Persist array to localStorage */
  function save(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage may be full — silently ignore
    }
  }

  /**
   * Adds a new translation entry.
   * Duplicates (same src text + target lang) update the existing entry timestamp.
   * @param {{ srcText, tgtText, srcLang, tgtLang, srcLangName, tgtLangName }} entry
   */
  function add(entry) {
    let entries = load();

    // Remove duplicate if it exists
    entries = entries.filter(
      e => !(e.srcText === entry.srcText && e.tgtLang === entry.tgtLang)
    );

    entries.unshift({ ...entry, timestamp: Date.now() });

    if (entries.length > MAX_ITEMS) entries = entries.slice(0, MAX_ITEMS);
    save(entries);
  }

  /** Clears all history */
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { load, add, clear };
})();