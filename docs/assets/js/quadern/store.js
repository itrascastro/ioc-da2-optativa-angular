;(function(){
  const { STORE_KEY, SCHEMA_VERSION } = window.Quadern.Constants || {};
  const U = window.Quadern.Utils;

  function initialState(){
    return {
      schemaVersion: SCHEMA_VERSION || 1,
      meta: { createdAt: U.nowISO(), updatedAt: U.nowISO(), appVersion: '0.1.0' },
      course: { id: '', title: '' },
      user: { theme: 'light', language: 'ca', lastView: 'study', mode: 'study' },
      ui: { explorer: { openUnits: [], openBlocs: {} }, notesPanel: { open: false, sectionId: '', noteId: '' } },
      progress: { lastVisited: null, readPositions: {}, sections: {} },
      filters: { q: '', tags: [] },
      notes: { byId: {}, bySection: {}, counters: { total: 0 } }
    };
  }
  function load(){
    try { const raw = localStorage.getItem(STORE_KEY); if (!raw) return initialState(); const data = JSON.parse(raw); return data && typeof data==='object' ? data : initialState(); }
    catch { return initialState(); }
  }
  function save(state){ try { state.meta.updatedAt = U.nowISO(); localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }

  function sectionKey(pageUrl, sectionId){ return `${pageUrl}#${sectionId}`; }

  function upsertNote(state, note){
    const n = Object.assign({}, note);
    if (!n.id) n.id = U.uid('note');
    state.notes.byId[n.id] = n;
    const sKey = sectionKey(n.pageUrl, n.sectionId);
    const arr = state.notes.bySection[sKey] || (state.notes.bySection[sKey] = []);
    if (!arr.includes(n.id)) arr.push(n.id);
    state.notes.counters.total = Object.keys(state.notes.byId).length;
    return n;
  }
  function deleteNote(state, id){
    const note = state.notes.byId[id]; if (!note) return;
    delete state.notes.byId[id];
    const sKey = sectionKey(note.pageUrl, note.sectionId);
    const arr = state.notes.bySection[sKey] || [];
    state.notes.bySection[sKey] = arr.filter(x => x !== id);
    state.notes.counters.total = Object.keys(state.notes.byId).length;
  }
  function notesForSection(state, pageUrl, sectionId){
    const sKey = sectionKey(pageUrl, sectionId);
    const ids = state.notes.bySection[sKey] || [];
    return ids.map(id => state.notes.byId[id]).filter(Boolean);
  }

  window.Quadern = window.Quadern || {};
  window.Quadern.Store = { load, save, upsertNote, deleteNote, notesForSection };
})();

