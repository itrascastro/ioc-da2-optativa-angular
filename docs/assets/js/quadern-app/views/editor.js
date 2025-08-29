/*
  Quadern de Notes - Vista Editor
  Gestió de l'edició de notes amb navegació i eines
*/

;(function() {
  'use strict';

  const Editor = {
    app: null,
    currentNote: null,
    isEditing: false,
    autosaveTimeout: null,
    lastUpdatedAt: null,

    // =============================
    // INICIALITZACIÓ
    // =============================

    init(app) {
      this.app = app;
      console.log('✏️ Editor: Inicialitzant vista editor...');
      this._bindEvents();
      this._initializeEditor();
      console.log('✅ Editor: Vista inicialitzada');
    },

    _bindEvents() {
      // Esdeveniments específics de l'editor
      this._bindEditorEvents();
      this._bindNavigationEvents();
    },

    _bindEditorEvents() {
      // Guardar nota
      // Eliminar listeners obsolets (#editor-save / #editor-cancel)

      // Auto-guardat
      const noteContent = document.getElementById('note-content');
      const noteTags = document.getElementById('note-tags');

      [noteContent, noteTags].forEach(element => {
        if (element) {
          element.addEventListener('input', () => this._scheduleAutosave());
        }
      });

      // Canvi en el desplegable de notes: carregar nota seleccionada
      const noteSelect = document.getElementById('note-select');
      if (noteSelect) {
        noteSelect.addEventListener('change', (e) => {
          const id = e.target.value;
          if (!id) return;
          try {
            // API existent
            this.selectNote(id);
            // Seguro: aplicar també directament als camps
            const state = window.Quadern?.Store?.load ? window.Quadern.Store.load() : null;
            const note = state?.notes?.byId ? state.notes.byId[id] : null;
            if (note) {
              const tagsField = document.getElementById('note-tags');
              if (tagsField) tagsField.value = (note.tags || []).join(', ');
              const contentField = document.getElementById('note-content');
              if (contentField) {
                contentField.value = note.content || '';
                contentField.dispatchEvent(new Event('input', { bubbles: true }));
              }
              const qre = (window.Quadern?.RichEditor?.getInstance) ? window.Quadern.RichEditor.getInstance('#qre-editor') : null;
              const quill = qre?.quill || null;
              if (quill) { try { quill.setText(''); quill.clipboard.dangerouslyPasteHTML(0, note.content || '', 'api'); } catch {} }
            }
          } catch {}
        });

        // Editar títol directament des del desplegable (doble clic o F2)
        const startInline = () => this._startInlineRenameOnSelect();
        noteSelect.addEventListener('dblclick', (e)=>{ e.preventDefault(); startInline(); });
        noteSelect.addEventListener('keydown', (e)=>{ if (e.key === 'F2') { e.preventDefault(); startInline(); } });
        const editBtn = document.getElementById('note-select-edit-btn');
        if (editBtn) {
          let mousedownDidFire = false;
          // Confirmar en mousedown para evitar que el blur del input reactive edición
          editBtn.addEventListener('mousedown', (e)=>{
            if (this._inlineRenameInput) {
              mousedownDidFire = true;
              e.preventDefault();
              e.stopPropagation();
              this._finishInlineRename(true);
            }
          });
          // Iniciar edición solo en click cuando no está editando
          editBtn.addEventListener('click', (e)=>{ 
            e.preventDefault();
            if (mousedownDidFire) {
              mousedownDidFire = false;
              return;
            }
            if (!this._inlineRenameInput) {
              startInline();
            }
          });
        }
      }
    },

    _bindNavigationEvents() {
      // Navegació en arbre ja es gestiona a events.js
    },

    _initializeEditor() {
      console.log('✏️ Editor: Carregant navegació...');
      this._loadEditorNavigation();
      // Toolbar manual eliminada; Quill gestiona la barra d'eines
    },

    // =============================
    // NAVEGACIÓ DE L'EDITOR
    // =============================

    async _loadEditorNavigation() {
      try {
        const notes = await this._getAllNotes();
        const structure = this._buildCourseStructure(notes);
        
        const navTree = document.getElementById('editor-nav-tree');
        if (navTree) {
          navTree.innerHTML = this._renderNavigationTree(structure);
        }

        const notesList = document.getElementById('notes-list');
        if (notesList) {
          // Layout actual: 1 columna. La llista clàssica ja no s'usa.
          notesList.innerHTML = '';
        }
      } catch (error) {
        console.error('❌ Editor: Error carregant navegació:', error);
      }
    },

    async _getAllNotes() {
      if (window.Quadern && window.Quadern.Store) {
        const state = window.Quadern.Store.load();
        return Object.values(state.notes.byId || {});
      }
      return [];
    },

    _buildCourseStructure(notes) {
      const structure = {};
      
      notes.forEach(note => {
        const unitKey = `unit-${note.unitat}`;
        const blockKey = `block-${note.bloc}`;
        const sectionKey = note.sectionId;

        if (!structure[unitKey]) {
          structure[unitKey] = {
            id: note.unitat,
            name: `Unitat ${note.unitat}`,
            blocks: {}
          };
        }

        if (!structure[unitKey].blocks[blockKey]) {
          structure[unitKey].blocks[blockKey] = {
            id: note.bloc,
            name: `Bloc ${note.bloc}`,
            sections: {}
          };
        }

        if (!structure[unitKey].blocks[blockKey].sections[sectionKey]) {
          structure[unitKey].blocks[blockKey].sections[sectionKey] = {
            id: sectionKey,
            name: note.sectionTitle || sectionKey,
            url: note.pageUrl,
            notes: []
          };
        }

        structure[unitKey].blocks[blockKey].sections[sectionKey].notes.push(note);
      });

      return structure;
    },

    _renderNavigationTree(structure) {
      let html = '';
      
      Object.entries(structure).forEach(([unitKey, unit]) => {
        html += `
          <div class="nav-unit" data-unit="${unit.id}">
            <div class="nav-unit-header">
              <i class="bi bi-chevron-right nav-toggle"></i>
              <span class="nav-unit-name">${unit.name}</span>
              <span class="nav-count">${Object.values(unit.blocks).length} blocs</span>
            </div>
            <div class="nav-unit-content">
              ${Object.entries(unit.blocks).map(([blockKey, block]) => `
                <div class="nav-block" data-block="${block.id}">
                  <div class="nav-block-header">
                    <i class="bi bi-chevron-right nav-toggle"></i>
                    <span class="nav-block-name">${block.name}</span>
                    <span class="nav-count">${Object.values(block.sections).length} seccions</span>
                  </div>
                  <div class="nav-block-content">
                    ${Object.entries(block.sections).map(([sectionKey, section]) => `
                      <div class="nav-section" data-section="${section.id}" data-url="${section.url}">
                        <div class="nav-section-header">
                          <i class="bi bi-file-text nav-section-icon"></i>
                          <span class="nav-section-name">${section.name}</span>
                          <span class="nav-notes-count">${section.notes.length} notes</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });

      return html || '<div class="nav-empty">No hi ha notes encara</div>';
    },

    // Eliminat: _updateNotesList i _renderNoteListItem (llista clàssica)

    // =============================
    // GESTIÓ DE NOTES
    // =============================

    selectNote(noteId) {
      console.log('✏️ Editor: Seleccionant nota:', noteId);
      
      if (window.Quadern && window.Quadern.Store) {
        const state = window.Quadern.Store.load();
        const note = state.notes.byId[noteId];
        
        if (note) {
          this.currentNote = note;
          this._loadNoteInEditor(note);
          this.app.currentNote = note;

          // Forçar refresc dels camps visibles (etiquetes i editor rich)
          try {
            const tagsField = document.getElementById('note-tags');
            if (tagsField) tagsField.value = (note.tags || []).join(', ');
            const contentField = document.getElementById('note-content');
            if (contentField) {
              contentField.value = note.content || '';
              // Notificar canvis per assegurar sincronització amb el rich editor
              contentField.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Actualitzar directament Quill si està disponible
            const qre = (window.Quadern?.RichEditor?.getInstance) ? window.Quadern.RichEditor.getInstance('#qre-editor') : null;
            const quill = qre?.quill || null;
            if (quill) {
              try { quill.setText(''); quill.clipboard.dangerouslyPasteHTML(0, note.content || '', 'api'); } catch {}
            } else {
              // Fallback: manipular DOM del editor
              const qlEditor = document.querySelector('#qre-editor .ql-editor');
              if (qlEditor) { qlEditor.innerHTML = note.content || ''; }
            }
            // Tercer fallback: repetir després d'un cicle de render
            setTimeout(() => {
              try {
                const tagsField2 = document.getElementById('note-tags');
                if (tagsField2) tagsField2.value = (note.tags || []).join(', ');
                const contentField2 = document.getElementById('note-content');
                if (contentField2) {
                  contentField2.value = note.content || '';
                  contentField2.dispatchEvent(new Event('input', { bubbles: true }));
                }
                const qre2 = (window.Quadern?.RichEditor?.getInstance) ? window.Quadern.RichEditor.getInstance('#qre-editor') : null;
                const quill2 = qre2?.quill || null;
                if (quill2) { try { quill2.setText(''); quill2.clipboard.dangerouslyPasteHTML(0, note.content || '', 'api'); } catch {} }
              } catch {}
            }, 50);
          } catch(e) {}
        }
      }
    },

    _loadNoteInEditor(note) {
      // Carregar contingut als camps
      const tagsField = document.getElementById('note-tags');
      const contentField = document.getElementById('note-content');

      if (tagsField) tagsField.value = (note.tags || []).join(', ');
      if (contentField) contentField.value = note.content || '';

      // Actualitzar UI: anunciar i fixar hora de darrera modificació
      this.lastUpdatedAt = note.updatedAt || note.createdAt || new Date().toISOString();
      this._announceStatus('Carregat');
      this._renderStatusTime();
      
      this.isEditing = true;
    },

    _startInlineRenameOnSelect() {
      try {
        const sel = document.getElementById('note-select');
        if (!sel) return;
        // Asegurar currentNote
        if (!this.currentNote || !this.currentNote.id) {
          const cur = sel.value;
          if (cur) { try { this.selectNote(cur); } catch(_){} }
        }
        if (!this.currentNote) return;
        const currentId = this.currentNote.id;
        if (!currentId) return;
        const opt = sel.querySelector(`option[value="${currentId}"]`);
        const currentTitle = opt ? opt.textContent : (this.currentNote.noteTitle || '');
        // Evitar duplicats
        if (document.getElementById('note-title-inline')) return;
        // Crear input en la mateixa posició
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'note-title-inline';
        input.placeholder = 'Títol de la nota';
        input.value = currentTitle;
        // Insertar abans del select i ocultar select temporalment
        const editBtn = document.getElementById('note-select-edit-btn');
        this._inlineRenameInput = input;
        // Botó en estat d'edició
        if (editBtn) {
          editBtn.classList.add('editing');
          const icon = editBtn.querySelector('i');
          if (icon) { icon.classList.remove('bi-pencil'); icon.classList.add('bi-check'); }
          editBtn.setAttribute('aria-label', 'Confirmar títol');
          editBtn.setAttribute('title', 'Confirmar títol');
        }
        sel.parentNode.insertBefore(input, sel);
        sel.style.display = 'none';
        input.focus();
        input.select();

        const finish = (commit) => this._finishInlineRename(commit);

        input.addEventListener('keydown', (e)=>{
          if (e.key === 'Enter') { e.preventDefault(); finish(true); }
          if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        });
        input.addEventListener('blur', ()=> finish(true));
      } catch (err) { console.warn('Inline rename failed', err); }
    },

    _finishInlineRename(commit, opts) {
      try {
        const sel = document.getElementById('note-select');
        const input = this._inlineRenameInput;
        const editBtn = document.getElementById('note-select-edit-btn');
        if (!sel || !input || !this.currentNote || this._inlineFinishing) return;
        this._inlineFinishing = true;
        const opt = sel.querySelector(`option[value="${this.currentNote.id}"]`);
        if (commit) {
          const newTitle = (input.value || '').trim();
          this.currentNote.noteTitle = newTitle;
          if (opt) opt.textContent = newTitle || 'Sense títol';
          try { this.saveCurrentNote(); } catch {}
        }
        // Restaurar UI
        sel.style.display = '';
        input.remove();
        this._inlineRenameInput = null;
        if (editBtn) {
          editBtn.classList.remove('editing');
          const icon = editBtn.querySelector('i');
          if (icon) { icon.classList.remove('bi-check'); icon.classList.add('bi-pencil'); }
          editBtn.setAttribute('aria-label', 'Editar títol de la nota');
          editBtn.setAttribute('title', 'Editar títol');
        }
        if (opts && opts.focusButton && editBtn) editBtn.focus(); else sel.focus();
        this._inlineFinishing = false;
      } catch (err) { console.warn('Finish inline rename failed', err); }
    },

    // Eliminada: _updateActiveNoteInList (llista clàssica)

    // Eliminat: _updateEditorHeader (capçalera d'editor legacy)

    createNewNote() {
      console.log('✏️ Editor: Creant nova nota...');
      
      // Crear una nota buida
      const newNote = {
        id: '', // S'assignarà automàticament al Store
        noteTitle: '',
        content: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unitat: 1, // Per defecte
        bloc: 1,   // Per defecte
        pageUrl: '/nova-nota',
        sectionId: 'nova',
        sectionTitle: 'Nova Secció'
      };

      this.currentNote = newNote;
      this._loadNoteInEditor(newNote);
      
      // Focus inicial al selector de notes si existeix
      const sel = document.getElementById('note-select');
      if (sel) sel.focus();
    },

    // Eliminada: _clearActiveNoteInList (llista clàssica)

    saveCurrentNote() {
      if (!this.currentNote) return;

      console.log('✏️ Editor: Guardant nota...');
      
      // Obtenir dades dels camps
      const tagsField = document.getElementById('note-tags');
      const contentField = document.getElementById('note-content');

      if (contentField) this.currentNote.content = contentField.value;
      
      if (tagsField) {
        const tagsText = tagsField.value.trim();
        this.currentNote.tags = tagsText 
          ? tagsText.split(',').map(tag => tag.trim()).filter(Boolean)
          : [];
      }

      this.currentNote.updatedAt = new Date().toISOString();

      // Guardar al Store
      if (window.Quadern && window.Quadern.Store) {
        const state = window.Quadern.Store.load();
        const saved = window.Quadern.Store.upsertNote(state, this.currentNote);
        window.Quadern.Store.save(state);
        
        this.currentNote = saved;
        this.app.currentNote = saved;
        
        this.lastUpdatedAt = this.currentNote.updatedAt;
        this._announceStatus('Desat');
        // Mostrar missatge breu i tornar a l'hora fixa
        setTimeout(() => this._renderStatusTime(), 1500);
        this._loadEditorNavigation(); // Refrescar navegació
        
        // Notificar altres mòduls
        if (this.app.refreshData) {
          this.app.refreshData();
        }
      }
    },

    _scheduleAutosave() {
      if (this.autosaveTimeout) {
        clearTimeout(this.autosaveTimeout);
      }
      
      this.autosaveTimeout = setTimeout(() => {
        if (this.currentNote && this.isEditing) {
          this._autoSave();
        }
      }, this.app.config.autosaveDelay);
    },

    _autoSave() {
      this.saveCurrentNote();
      this.lastUpdatedAt = this.currentNote ? this.currentNote.updatedAt : this.lastUpdatedAt;
      this._announceStatus('Auto-desat');
      // Mostrar missatge breu i tornar a l'hora fixa
      setTimeout(() => this._renderStatusTime(), 1500);
    },

    _clearEditor() {
      const tagsField = document.getElementById('note-tags');
      const contentField = document.getElementById('note-content');

      if (tagsField) tagsField.value = '';
      if (contentField) contentField.value = '';

      this.currentNote = null;
      this.isEditing = false;
      this.app.currentNote = null;
    },

    _announceStatus(message) {
      // Live region (a11y) — no visual output
      try {
        const root = document.getElementById('qre-editor');
        if (root) {
          let live = root.querySelector('[data-qre-live]');
          if (!live) {
            live = document.createElement('span');
            live.setAttribute('data-qre-live', '');
            live.setAttribute('aria-live', 'polite');
            live.className = 'visually-hidden';
            root.appendChild(live);
          }
          live.textContent = message || '';
          // Also mirror message visibly in status pill (left of HTML button)
          const statusEl = root.querySelector('[data-qre-status]');
          if (statusEl) statusEl.textContent = message || '';
        }
      } catch {}
    },
    _renderStatusTime(){
      try {
        const el = document.querySelector('#qre-editor [data-qre-status]');
        const d = this.lastUpdatedAt ? new Date(this.lastUpdatedAt) : null;
        if (el && d && !isNaN(d)) {
          const time = d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
          el.textContent = `Canvis desats ${time}`;
        }
      } catch {}
    },

    // Eliminada la toolbar manual (Quill assumeix la formatació)

    // =============================
    // UTILITATS
    // =============================

    // =============================
    // INTEGRACIÓ AMB NAVIGATION TREE
    // =============================

    showNotesForSection(sectionData) {
      console.log('✏️ Editor: Mostrant notes per secció:', sectionData);
      
      const { sectionId, unitId, blocId, sectionTitle, notes } = sectionData;
      
      // Capçalera d'editor legacy eliminada
      
      // Omplir desplegable i seleccionar la més recent (si hi ha)
      this._populateNotesDropdown(notes);
      const formEl = document.querySelector('.editor-form');
      const list = document.getElementById('notes-list');
      if (notes && notes.length) {
        if (formEl) formEl.style.display = '';
        if (list) list.innerHTML = '';
        const sorted = [...notes].sort((a,b)=> new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt));
        this.selectNote(sorted[0].id);
        const sel = document.getElementById('note-select');
        if (sel) sel.value = sorted[0].id;
      } else {
        if (formEl) formEl.style.display = 'none';
        if (list) {
          list.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">
                <i class="bi bi-journal-text"></i>
              </div>
              <h3>No hi ha notes en aquesta selecció</h3>
              <p>Selecciona una altra part del curs o modifica els filtres.</p>
            </div>
          `;
        }
        this._clearEditor();
      }
      // Guardar context actual i focus al selector
      this.currentSection = sectionData;
      const selFocus = document.getElementById('note-select');
      if (selFocus) selFocus.focus();
    },

    _populateNotesDropdown(notes){
      const sel = document.getElementById('note-select');
      if (!sel) return;
      sel.innerHTML = '<option value="">Selecciona una nota…</option>';
      const sorted = [...(notes||[])].sort((a,b)=> new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt));
      sorted.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = n.noteTitle || 'Sense títol';
        sel.appendChild(opt);
      });
    },

    // Eliminat: _displaySectionNotes i createNoteForSection (llista clàssica/creació directa)

    // (duplicated _clearEditor removed; single implementation above)

    // =============================
    // API PÚBLICA
    // =============================

    refreshData() {
      this._loadEditorNavigation();
    }
  };

  // Exposar al namespace
  window.Quadern = window.Quadern || {};
  window.Quadern.Editor = Editor;

})();
