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
      const noteTitle = document.getElementById('note-title');
      const noteTags = document.getElementById('note-tags');

      [noteContent, noteTitle, noteTags].forEach(element => {
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
          this._updateActiveNoteInList(noteId);
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
      const titleField = document.getElementById('note-title');
      const tagsField = document.getElementById('note-tags');
      const contentField = document.getElementById('note-content');

      if (titleField) titleField.value = note.noteTitle || '';
      if (tagsField) tagsField.value = (note.tags || []).join(', ');
      if (contentField) contentField.value = note.content || '';

      // Actualitzar UI (sense header obsolet)
      this._updateEditorStatus('Carregat');
      
      this.isEditing = true;
    },

    _updateActiveNoteInList(noteId) {
      // Actualitzar llista de notes per mostrar l'activa
      const items = document.querySelectorAll('.note-list-item');
      items.forEach(item => {
        item.classList.toggle('active', item.dataset.noteId === noteId);
      });
    },

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
      this._clearActiveNoteInList();
      
      // Focus al títol
      const titleField = document.getElementById('note-title');
      if (titleField) {
        titleField.focus();
        titleField.select();
      }
    },

    _clearActiveNoteInList() {
      const items = document.querySelectorAll('.note-list-item');
      items.forEach(item => item.classList.remove('active'));
    },

    saveCurrentNote() {
      if (!this.currentNote) return;

      console.log('✏️ Editor: Guardant nota...');
      
      // Obtenir dades dels camps
      const titleField = document.getElementById('note-title');
      const tagsField = document.getElementById('note-tags');
      const contentField = document.getElementById('note-content');

      if (titleField) this.currentNote.noteTitle = titleField.value.trim();
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
        
        this._updateEditorStatus('Desat');
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
      this._updateEditorStatus('Auto-desat');
      
      setTimeout(() => {
        this._updateEditorStatus('');
      }, 2000);
    },

    _cancelEdit() {
      if (this.currentNote) {
        this._loadNoteInEditor(this.currentNote); // Recarregar dades originals
      } else {
        // Netejar editor
        this._clearEditor();
      }
      this._updateEditorStatus('Cancel·lat');
    },

    _clearEditor() {
      const titleField = document.getElementById('note-title');
      const tagsField = document.getElementById('note-tags');
      const contentField = document.getElementById('note-content');

      if (titleField) titleField.value = '';
      if (tagsField) tagsField.value = '';
      if (contentField) contentField.value = '';

      this.currentNote = null;
      this.isEditing = false;
      this.app.currentNote = null;
    },

    _updateEditorStatus(message) {
      const status = document.getElementById('editor-status');
      if (status) {
        status.textContent = message;
        status.className = `editor-status ${message.toLowerCase().replace(/[^a-z]/g, '-')}`;
      }
    },

    // Eliminada la toolbar manual (Quill assumeix la formatació)

    // =============================
    // UTILITATS
    // =============================

    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    },

    _getContentPreview(content, maxLength = 100) {
      if (!content) return 'Sense contingut';
      
      const clean = content
        .replace(/#+\s*/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .trim();
      
      return clean.length > maxLength 
        ? clean.substring(0, maxLength) + '...'
        : clean;
    },

    _formatLocation(note) {
      if (note.unitat && note.bloc) {
        return `U${note.unitat} - B${note.bloc}`;
      } else if (note.unitat) {
        return `Unitat ${note.unitat}`;
      }
      return 'Ubicació';
    },

    _formatDate(dateStr) {
      if (!dateStr) return 'Data desconeguda';
      
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return 'ara mateix';
      if (diffMins < 60) return `fa ${diffMins} min`;
      if (diffHours < 24) return `fa ${diffHours}h`;
      
      return date.toLocaleDateString('ca-ES');
    },

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

    _clearEditor() {
      const titleField = document.getElementById('note-title');
      const tagsField = document.getElementById('note-tags');
      const contentField = document.getElementById('note-content');

      if (titleField) titleField.value = '';
      if (tagsField) tagsField.value = '';
      if (contentField) contentField.value = '';
      
      this.isEditing = false;
    },

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
