/*
  Notes (skeleton) – Fase 0
  - No functionality yet. This file sets up the structure and names.
  - All logic for notes will live here in later phases to keep content clean.
*/

(function () {
  // Namespace to avoid globals
  const Notes = {
    // Storage keys and types
    STORAGE_KEY: 'notes-v1',
    CONTENT_TYPES: { PLAIN: 'plain', MD: 'md', DELTA: 'delta', HTML: 'html' },

    // Placeholders (implemented in later phases)
    init() {
      // Intentionally empty in Fase 0
    },

    // Utilities
    _nowISO() { return new Date().toISOString(); },
  };

  // Expose for future debugging/hooks
  window.CodexNotes = Notes;
})();

