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
      this._bindToolbarEvents();
      this._bindEditorEvents();
      this._bindNavigationEvents();
    },

    _bindToolbarEvents() {
      // Toolbar de formatació
      document.addEventListener('click', (e) => {
        const toolbarBtn = e.target.closest('.toolbar-btn');
        if (toolbarBtn) {
          e.preventDefault();
          const command = toolbarBtn.dataset.command;
          this._execEditorCommand(command);
        }
      });
    },

    _bindEditorEvents() {
      // Guardar nota
      const saveBtn = document.getElementById('editor-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveCurrentNote());
      }

      // Cancel·lar edició
      const cancelBtn = document.getElementById('editor-cancel');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this._cancelEdit());
      }

      // Auto-guardat
      const noteContent = document.getElementById('note-content');
      const noteTitle = document.getElementById('note-title');
      const noteTags = document.getElementById('note-tags');

      [noteContent, noteTitle, noteTags].forEach(element => {
        if (element) {
          element.addEventListener('input', () => this._scheduleAutosave());
        }
      });
    },

    _bindNavigationEvents() {
      // Navegació en arbre ja es gestiona a events.js
    },

    _initializeEditor() {
      console.log('✏️ Editor: Carregant navegació...');
      this._loadEditorNavigation();
      this._initializeToolbar();
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
        this._updateNotesList(notes);
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

    _updateNotesList(notes) {
      const notesList = document.getElementById('notes-list');
      if (!notesList) return;

      const recentNotes = notes
        .filter(note => note.content && note.content.trim())
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

      if (recentNotes.length === 0) {
        notesList.innerHTML = `
          <div class="notes-empty">
            <div class="empty-icon">
              <i class="bi bi-journal-text"></i>
            </div>
            <p>No hi ha notes per mostrar en aquesta secció.</p>
          </div>
        `;
        return;
      }

      notesList.innerHTML = `
        <div class="notes-list-header">
          <h4>Totes les Notes (${recentNotes.length})</h4>
          <button class="btn-icon" id="refresh-notes" title="Actualitzar">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
        <div class="notes-items">
          ${recentNotes.map(note => this._renderNoteListItem(note)).join('')}
        </div>
      `;

      // Bind refresh button
      const refreshBtn = notesList.querySelector('#refresh-notes');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this._loadEditorNavigation());
      }
    },

    _renderNoteListItem(note) {
      const isActive = this.currentNote && this.currentNote.id === note.id;
      
      return `
        <div class="note-list-item ${isActive ? 'active' : ''}" data-note-id="${note.id}">
          <div class="note-item-content">
            <div class="note-item-title">${this._escapeHtml(note.noteTitle || 'Sense títol')}</div>
            <div class="note-item-preview">${this._getContentPreview(note.content, 80)}</div>
            <div class="note-item-meta">
              <span class="note-location">${this._formatLocation(note)}</span>
              <span class="note-date">${this._formatDate(note.updatedAt || note.createdAt)}</span>
            </div>
            ${note.tags && note.tags.length > 0 ? `
              <div class="note-item-tags">
                ${note.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                ${note.tags.length > 3 ? `<span class="tag-more">+${note.tags.length - 3}</span>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="note-item-actions">
            <button class="btn-icon" title="Duplicar" data-action="duplicate-note" data-note-id="${note.id}">
              <i class="bi bi-files"></i>
            </button>
            <button class="btn-icon btn-danger" title="Eliminar" data-action="delete-note" data-note-id="${note.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    },

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

      // Actualitzar UI
      this._updateEditorHeader(note);
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

    _updateEditorHeader(note) {
      const header = document.getElementById('editor-header');
      if (header) {
        header.innerHTML = `
          <div class="editor-breadcrumb">
            <span class="breadcrumb-item">${this._formatLocation(note)}</span>
            <i class="bi bi-chevron-right"></i>
            <span class="breadcrumb-item">${note.sectionTitle || 'Secció'}</span>
          </div>
          <div class="editor-meta">
            <span class="editor-status" id="editor-status">Preparat</span>
            <span class="editor-date">Modificat ${this._formatDate(note.updatedAt || note.createdAt)}</span>
          </div>
        `;
      }
    },

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

    // =============================
    // TOOLBAR I FORMATACIÓ
    // =============================

    _initializeToolbar() {
      // Inicialitzar toolbar de formatació
      console.log('✏️ Editor: Inicialitzant toolbar...');
    },

    _execEditorCommand(command) {
      console.log('✏️ Editor: Executant comanda:', command);
      
      const contentField = document.getElementById('note-content');
      if (!contentField) return;

      const start = contentField.selectionStart;
      const end = contentField.selectionEnd;
      const selectedText = contentField.value.substring(start, end);

      switch(command) {
        case 'bold':
          this._insertFormatting('**', '**', selectedText || 'text en negreta');
          break;
        case 'italic':
          this._insertFormatting('*', '*', selectedText || 'text en cursiva');
          break;
        case 'code':
          this._insertFormatting('`', '`', selectedText || 'codi');
          break;
        case 'link':
          this._insertLink();
          break;
        case 'list':
          this._insertList();
          break;
        case 'header':
          this._insertHeader();
          break;
      }
    },

    _insertFormatting(before, after, defaultText) {
      const contentField = document.getElementById('note-content');
      if (!contentField) return;

      const start = contentField.selectionStart;
      const end = contentField.selectionEnd;
      const selectedText = contentField.value.substring(start, end) || defaultText;
      
      const newText = before + selectedText + after;
      const beforeText = contentField.value.substring(0, start);
      const afterText = contentField.value.substring(end);
      
      contentField.value = beforeText + newText + afterText;
      
      // Reposicionar cursor
      const newStart = start + before.length;
      const newEnd = newStart + selectedText.length;
      contentField.setSelectionRange(newStart, newEnd);
      contentField.focus();
      
      this._scheduleAutosave();
    },

    _insertLink() {
      const url = prompt('Introdueix l\'URL:');
      if (url) {
        const text = prompt('Text del enllaç:', url);
        this._insertFormatting(`[${text || url}](`, ')', url);
      }
    },

    _insertList() {
      const contentField = document.getElementById('note-content');
      if (!contentField) return;

      const start = contentField.selectionStart;
      const lines = contentField.value.substring(0, start).split('\n');
      const isNewLine = lines[lines.length - 1] === '';
      
      const listItem = isNewLine ? '- Element de llista' : '\n- Element de llista';
      
      const beforeText = contentField.value.substring(0, start);
      const afterText = contentField.value.substring(contentField.selectionEnd);
      
      contentField.value = beforeText + listItem + afterText;
      
      const newPosition = start + listItem.length;
      contentField.setSelectionRange(newPosition, newPosition);
      contentField.focus();
      
      this._scheduleAutosave();
    },

    _insertHeader() {
      const level = prompt('Nivell de capçalera (1-3):', '2');
      if (level && /^[1-3]$/.test(level)) {
        const hashes = '#'.repeat(parseInt(level));
        this._insertFormatting(`${hashes} `, '', 'Títol de la secció');
      }
    },

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
      
      // Actualitzar header amb informació de la secció
      const header = document.getElementById('editor-header');
      if (header) {
        const crumbs = [];
        if (unitId) crumbs.push(`Unitat ${unitId}`);
        if (typeof blocId !== 'undefined' && blocId !== null && blocId !== '') crumbs.push(`Bloc ${blocId}`);
        const crumbHtml = crumbs.map(c=>`<span class="breadcrumb-item">${c}</span>`).join('<i class="bi bi-chevron-right"></i>');
        const label = sectionTitle || 'Totes les seccions';
        header.innerHTML = `
          <div class="editor-breadcrumb">
            ${crumbHtml}
            ${crumbHtml ? '<i class="bi bi-chevron-right"></i>' : ''}
            <span class="breadcrumb-item">${label}</span>
          </div>
          <div class="editor-meta">
            <span class="editor-status">${notes.length ? 'Notes de secció' : 'Sense notes'}</span>
            <span class="editor-count">${notes.length} ${notes.length === 1 ? 'nota' : 'notes'}</span>
          </div>
        `;
      }
      
      // Omplir desplegable i seleccionar la més recent (si hi ha)
      this._populateNotesDropdown(notes);
      const formEl = document.querySelector('.editor-form');
      if (notes && notes.length) {
        if (formEl) formEl.style.display = '';
        const sorted = [...notes].sort((a,b)=> new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt));
        this.selectNote(sorted[0].id);
        const sel = document.getElementById('note-select');
        if (sel) sel.value = sorted[0].id;
      } else {
        if (formEl) formEl.style.display = 'none';
        const list = document.getElementById('notes-list');
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
      // Guardar context actual
      this.currentSection = sectionData;
      this.currentNote = null;
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

    _displaySectionNotes(notes, sectionData) {
      const notesList = document.getElementById('notes-list');
      if (!notesList) return;
      
      if (notes.length === 0) {
        notesList.innerHTML = `
          <div class="no-notes">
            <i class="bi bi-journal-plus"></i>
            <h3>Encara no hi ha notes</h3>
            <p>Clica el botó + per crear la primera nota d'aquesta secció</p>
            <button class="btn btn-primary" onclick="window.Quadern.Editor.createNoteForSection()">
              <i class="bi bi-plus"></i>
              Crear primera nota
            </button>
          </div>
        `;
        return;
      }
      
      let html = '<div class="section-notes-header">';
      html += `<h3>Notes de ${sectionData.sectionTitle}</h3>`;
      html += `<button class="btn btn-outline btn-sm" onclick="window.Quadern.Editor.createNoteForSection()">`;
      html += '<i class="bi bi-plus"></i> Nova nota</button>';
      html += '</div>';
      
      html += '<div class="notes-list-container">';
      notes.forEach(note => {
        html += this._renderNoteListItem(note);
      });
      html += '</div>';
      
      notesList.innerHTML = html;
    },

    createNoteForSection() {
      if (!this.currentSection) {
        console.warn('✏️ Editor: No hi ha secció activa per crear nota');
        return;
      }
      
      console.log('✏️ Editor: Creant nova nota per secció:', this.currentSection);
      
      const { sectionId, unitId, blocId, sectionTitle } = this.currentSection;
      
      // Crear nova nota amb context de la secció
      const newNote = {
        id: '', // S'assignarà automàticament al Store
        noteTitle: '',
        content: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unitat: parseInt(unitId),
        bloc: parseInt(blocId),
        pageUrl: `#${sectionId}`,
        sectionId: sectionId,
        sectionTitle: sectionTitle
      };

      this.currentNote = newNote;
      this._loadNoteInEditor(newNote);
      this._clearActiveNoteInList();
      
      // Focus al títol
      const titleField = document.getElementById('note-title');
      if (titleField) {
        titleField.focus();
      }
    },

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
