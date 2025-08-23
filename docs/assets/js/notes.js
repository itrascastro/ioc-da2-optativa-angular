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
      // Fase 1: wire basic UI
      try {
        this._scanSections();
        this._injectNoteButtons();
        this._ensurePanel();
        this._bindFooterButton();
      } catch (e) {
        // Fail silently to avoid breaking site
        // console.warn('Notes init error', e);
      }
    },

    // Utilities
    _nowISO() { return new Date().toISOString(); },

    // Sections
    sections: [],
    _scanSections() {
      const headers = Array.from(document.querySelectorAll('.content-body h2'));
      this.sections = headers.map(h2 => ({ id: h2.id || '', title: h2.textContent?.trim() || '' }));
    },

    _injectNoteButtons() {
      document.querySelectorAll('.content-body h2').forEach(h2 => {
        if (!h2.id) return;
        if (h2.querySelector('.add-note-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'add-note-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Afegir nota a aquesta secció');
        btn.innerHTML = '<i class="bi bi-journal-text" aria-hidden="true"></i>';
        // Ensure h2 relatively positioned to anchor absolute button
        const style = window.getComputedStyle(h2);
        if (style.position === 'static') h2.style.position = 'relative';
        h2.appendChild(btn);
        btn.addEventListener('click', () => {
          this._openPanel(h2.id);
        });
      });
      // Set initial state of icons depending on existing notes
      this._updateButtonsState();
    },

    // Panel creation/toggle
    panelEl: null,
    _ensurePanel() {
      if (this.panelEl) return;
      const panel = document.createElement('div');
      panel.className = 'notes-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Notes d\'aquesta pàgina');
      panel.innerHTML = `
        <div class="panel-inner">
          <div class="panel-header">
            <div class="panel-title">Notes d\'aquesta pàgina</div>
            <div class="panel-controls">
              <span class="status" id="notes-status" aria-live="polite"></span>
              <button class="panel-close" type="button" id="notes-close" title="Tancar" aria-label="Tancar">✕</button>
            </div>
          </div>
          <div class="panel-body">
            <div class="row">
              <label for="notes-section" class="sr-only">Secció</label>
              <select id="notes-section" aria-label="Secció"></select>
            </div>
            <div class="row">
              <label for="notes-text" class="sr-only">Nota</label>
              <textarea id="notes-text" placeholder="Escriu la teva nota…"></textarea>
            </div>
            <div class="row actions">
              <button class="icon-btn" id="notes-delete" type="button" title="Eliminar nota" aria-label="Eliminar nota">
                <i class="bi bi-trash" aria-hidden="true"></i>
              </button>
              <div class="spacer"></div>
              <button class="btn btn-small" id="notes-export-json" type="button" title="Exporta JSON">Exporta JSON</button>
              <button class="btn btn-small" id="notes-export-md" type="button" title="Exporta Markdown">Exporta MD</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      this.panelEl = panel;
      // Bind events
      panel.querySelector('#notes-close')?.addEventListener('click', () => this._togglePanel(false));
      const select = panel.querySelector('#notes-section');
      if (select) select.addEventListener('change', () => this._loadCurrentNote());
      const ta = panel.querySelector('#notes-text');
      if (ta) ta.addEventListener('input', () => this._autosave());
      panel.querySelector('#notes-export-json')?.addEventListener('click', () => this._exportJSON());
      panel.querySelector('#notes-export-md')?.addEventListener('click', () => this._exportMD());
      panel.querySelector('#notes-delete')?.addEventListener('click', () => {
        const sel = this.panelEl?.querySelector('#notes-section');
        if (!sel) return;
        const id = sel.value;
        if (!id) return;
        this._removeNote(id);
        const ta = this.panelEl?.querySelector('#notes-text');
        if (ta) ta.value = '';
        this._setStatus('Eliminada');
        setTimeout(()=> this._setStatus(''), 1200);
        this._updateButtonsState();
      });
      // Populate sections
      this._populateSections();
      // _renderList is optional now; panel simplificat
      this._updateButtonsState();
    },

    _bindFooterButton() {
      const btn = document.getElementById('footer-btn-notes');
      if (btn) btn.addEventListener('click', () => this._togglePanel());
    },

    _togglePanel(show) {
      if (!this.panelEl) return;
      const visible = this.panelEl.style.display !== 'none' && this.panelEl.style.display !== '' ? true : this.panelEl.classList.contains('open');
      const next = typeof show === 'boolean' ? show : !visible;
      this.panelEl.style.display = next ? 'block' : 'none';
      if (next) {
        this._populateSections();
        this._loadCurrentNote();
        this._adjustPanelOffset();
        this._adjustContentPadding();
        this._bindResize();
        this._updateButtonsState();
      }
      else {
        this._restoreContentPadding();
        this._unbindResize();
      }
    },

    _openPanel(sectionId) {
      this._togglePanel(true);
      const sel = this.panelEl?.querySelector('#notes-section');
      if (sel && sectionId) {
        sel.value = sectionId;
        this._loadCurrentNote();
      }
      const ta = this.panelEl?.querySelector('#notes-text');
      ta && ta.focus();
    },

    _populateSections() {
      const sel = this.panelEl?.querySelector('#notes-section');
      if (!sel) return;
      sel.innerHTML = '';
      // refresh sections
      this._scanSections();
      this.sections.forEach(s => {
        if (!s.id) return;
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.title || s.id;
        sel.appendChild(opt);
      });
    },

    // Storage (MVP: localStorage, 1 note per section)
    _loadAll() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw) return { version: 1, updatedAt: this._nowISO(), notes: [] };
        return JSON.parse(raw);
      } catch { return { version: 1, updatedAt: this._nowISO(), notes: [] }; }
    },
    _saveAll(data) { try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data)); } catch {} },
    _pageUrl() { return (document.body.getAttribute('data-baseurl') || '') + (location.pathname || ''); },
    _context() {
      const unitat = Number(document.querySelector('meta[name="page-unitat"]')?.getAttribute('content')) || (window.page && window.page.unitat) || undefined;
      const bloc = Number(document.querySelector('meta[name="page-bloc"]')?.getAttribute('content')) || (window.page && window.page.bloc) || undefined;
      return { unitat, bloc };
    },
    _getNote(sectionId) {
      const all = this._loadAll();
      const pageUrl = this._pageUrl();
      return all.notes.find(n => n.pageUrl === pageUrl && n.sectionId === sectionId);
    },
    _upsertNote(sectionId, title, content) {
      const all = this._loadAll();
      const pageUrl = this._pageUrl();
      const { unitat, bloc } = this._context();
      let n = all.notes.find(n => n.pageUrl === pageUrl && n.sectionId === sectionId);
      if (!n) {
        n = { id: 'n_' + Date.now(), unitat, bloc, pageUrl, sectionId, sectionTitle: title || sectionId, content: '', createdAt: this._nowISO(), updatedAt: this._nowISO() };
        all.notes.push(n);
      }
      n.content = content;
      n.updatedAt = this._nowISO();
      all.updatedAt = this._nowISO();
      this._saveAll(all);
      this._renderList();
      this._updateButtonsState();
    },
    _removeNote(sectionId) {
      const all = this._loadAll();
      const pageUrl = this._pageUrl();
      const before = all.notes.length;
      all.notes = all.notes.filter(n => !(n.pageUrl === pageUrl && n.sectionId === sectionId));
      if (all.notes.length !== before) {
        all.updatedAt = this._nowISO();
        this._saveAll(all);
        this._renderList();
        this._updateButtonsState();
      }
    },

    _loadCurrentNote() {
      const sel = this.panelEl?.querySelector('#notes-section');
      const ta = this.panelEl?.querySelector('#notes-text');
      if (!sel || !ta) return;
      const id = sel.value;
      const s = this.sections.find(x => x.id === id);
      const n = this._getNote(id);
      ta.value = n?.content || '';
      this._setStatus('');
    },
    _autosave: (function(){ let t; return function(){
      clearTimeout(t);
      t = setTimeout(() => {
        const sel = this.panelEl?.querySelector('#notes-section');
        const ta = this.panelEl?.querySelector('#notes-text');
        if (!sel || !ta) return;
        const id = sel.value;
        const s = this.sections.find(x => x.id === id);
        this._upsertNote(id, s?.title || id, ta.value || '');
        this._setStatus('Desat');
        setTimeout(() => this._setStatus(''), 1500);
      }, 400);
    }; })(),
    _setStatus(msg){ const el = this.panelEl?.querySelector('#notes-status'); if (el) el.textContent = msg || ''; },

    _renderList() {
      const ul = this.panelEl?.querySelector('#notes-list');
      if (!ul) return;
      const all = this._loadAll();
      const pageUrl = this._pageUrl();
      const notes = all.notes.filter(n => n.pageUrl === pageUrl).sort((a,b)=> (a.sectionTitle||'').localeCompare(b.sectionTitle||''));
      ul.innerHTML = '';
      if (notes.length === 0) {
        const li = document.createElement('li'); li.textContent = 'Cap nota encara'; ul.appendChild(li); return;
      }
      notes.forEach(n => {
        const li = document.createElement('li');
        const a = document.createElement('a'); a.href = '#' + n.sectionId; a.textContent = n.sectionTitle || n.sectionId; a.addEventListener('click', (e)=>{ 
          e.preventDefault(); 
          const el = document.getElementById(n.sectionId); 
          if (!el) return; 
          const header = document.querySelector('.header');
          const offset = (header ? header.offsetHeight : 0) + 20; 
          const y = el.getBoundingClientRect().top + window.scrollY - offset; 
          window.scrollTo({ top: y, behavior: 'smooth' });
        });
        const del = document.createElement('button'); del.type='button'; del.className='btn'; del.textContent='Eliminar'; del.style.marginLeft='8px'; del.addEventListener('click', ()=>{ this._removeNote(n.sectionId); this._loadCurrentNote(); });
        li.appendChild(a); li.appendChild(del); ul.appendChild(li);
      });
    },

    // Ensure last section remains readable: add bottom padding equal to panel height
    _prevContentPadding: null,
    _adjustContentPadding() {
      const main = document.querySelector('.main-content');
      if (!main || !this.panelEl) return;
      if (this._prevContentPadding == null) {
        this._prevContentPadding = main.style.paddingBottom || '';
      }
      const panelH = this.panelEl.offsetHeight || 0;
      const extra = Math.max(0, panelH + 20); // add a little gap
      main.style.paddingBottom = `calc(${extra}px)`;
    },
    _restoreContentPadding() {
      const main = document.querySelector('.main-content');
      if (!main) return;
      if (this._prevContentPadding != null) {
        main.style.paddingBottom = this._prevContentPadding;
        this._prevContentPadding = null;
      }
    },
    _resizeHandler: null,
    _bindResize() {
      if (this._resizeHandler) return;
      this._resizeHandler = () => { this._adjustPanelOffset(); this._adjustContentPadding(); };
      window.addEventListener('resize', this._resizeHandler);
    },
    _unbindResize() {
      if (!this._resizeHandler) return;
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    },

    // Exporters (MVP)
    _exportJSON() {
      const data = this._loadAll();
      this._download('notes-v1.json', JSON.stringify(data, null, 2));
    },
    _exportMD() {
      const all = this._loadAll();
      const pageUrl = this._pageUrl();
      const notes = all.notes.filter(n => n.pageUrl === pageUrl);
      let md = `# Notes de ${pageUrl}\n\n`;
      const bySection = {};
      notes.forEach(n => { (bySection[n.sectionTitle||n.sectionId] ||= []).push(n); });
      Object.keys(bySection).sort().forEach(title => {
        md += `## ${title}\n`;
        bySection[title].forEach(n => { md += `- ${n.content}\n`; });
        md += `\n`;
      });
      this._download('notes-pagina.md', md);
    },
    _download(name, content) {
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    },

    // Panel bottom offset equals footer height (no gap)
    _adjustPanelOffset() {
      if (!this.panelEl) return;
      const footer = document.querySelector('.footer');
      const h = footer ? footer.offsetHeight : 0;
      this.panelEl.style.bottom = `${h}px`;
    },

    // Icon state for H2 buttons: journal-text (no note) vs journal-check (has note)
    _hasNote(sectionId) {
      const n = this._getNote(sectionId);
      return !!(n && n.content && n.content.trim().length > 0);
    },
    _updateButtonsState() {
      document.querySelectorAll('.content-body h2').forEach(h2 => {
        const btn = h2.querySelector('.add-note-btn');
        if (!btn || !h2.id) return;
        const has = this._hasNote(h2.id);
        const icon = has ? 'bi-journal-check' : 'bi-journal-text';
        btn.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i>`;
        btn.setAttribute('title', has ? 'Editar nota' : 'Afegir nota');
        btn.setAttribute('aria-label', has ? 'Editar nota d\'aquesta secció' : 'Afegir nota a aquesta secció');
      });
    }
  };

  // Expose for future debugging/hooks
  window.CodexNotes = Notes;
  // Auto init when DOM ready
  document.addEventListener('DOMContentLoaded', () => Notes.init());
})();
