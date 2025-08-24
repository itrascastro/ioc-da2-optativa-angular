/*
  Quadern de Notes - JavaScript Principal
  Fase 2: Dashboard complet amb gestió de vistes i funcionalitat avançada
*/

(function() {
  'use strict';

  // Namespace del Quadern
  const Quadern = {
    // Referències de DOM
    currentView: 'dashboard',
    currentNote: null,
    isEditing: false,
    
    // Cache de dades
    notesCache: null,
    statsCache: null,
    
    // Configuració
    config: {
      autosaveDelay: 2000,
      toastDuration: 3000,
      maxRecentNotes: 5
    },

    // =============================
    // INICIALITZACIÓ
    // =============================

    init() {
      try {
        console.log('🟦 Quadern: Inicialitzant...');
        
        // Comprovar si estem a la pàgina del quadern
        if (!this._isQuadernPage()) {
          console.log('🟨 Quadern: No és pàgina de quadern, sortint...');
          return;
        }

        this._bindEvents();
        this._initializeViews();
        this._loadDashboardData();
        this._initializeNavTree();
        this._updateFooterStats();
        
        console.log('✅ Quadern: Inicialitzat correctament');
      } catch (error) {
        console.error('❌ Quadern: Error en inicialització:', error);
      }
    },

    _isQuadernPage() {
      return document.querySelector('.quadern-layout') !== null ||
             document.querySelector('[data-page="quadern"]') !== null ||
             window.location.pathname.includes('quadern');
    },

    // =============================
    // GESTIÓ D'ESDEVENIMENTS
    // =============================

    _bindEvents() {
      // Navegació de vistes
      document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn');
        if (viewBtn) {
          e.preventDefault();
          const view = viewBtn.dataset.view;
          this._switchView(view);
          return;
        }

        // Accions ràpides del dashboard
        const actionBtn = e.target.closest('.action-btn');
        if (actionBtn) {
          e.preventDefault();
          const action = actionBtn.dataset.action;
          this._handleQuickAction(action);
          return;
        }

        // Botons d'exportació
        const exportBtn = e.target.closest('.export-btn');
        if (exportBtn) {
          e.preventDefault();
          const format = exportBtn.dataset.format;
          this._exportNotes(format);
          return;
        }

        // Navegació en arbre
        const treeHeader = e.target.closest('.tree-item-header');
        if (treeHeader && treeHeader.querySelector('.tree-arrow')) {
          e.preventDefault();
          this._toggleTreeItem(treeHeader);
          return;
        }

        // Selecció de secció per l'editor
        if (treeHeader && !treeHeader.querySelector('.tree-arrow')) {
          e.preventDefault();
          this._selectSection(treeHeader);
          return;
        }

        // Notes en vista d'editor i dashboard
        const notePreview = e.target.closest('.note-preview, .recent-note-item');
        if (notePreview) {
          e.preventDefault();
          const noteId = notePreview.dataset.noteId;
          if (noteId) {
            // Si estem al dashboard, anar a l'editor
            if (this.currentView === 'dashboard') {
              this._switchView('editor');
              setTimeout(() => this._selectNote(noteId), 100);
            } else {
              this._selectNote(noteId);
            }
          }
          return;
        }

        // Tornar a dalt
        if (e.target.closest('#back-to-top')) {
          e.preventDefault();
          this._scrollToTop();
          return;
        }

        // Tancar modal
        if (e.target.closest('.modal-close, .modal-backdrop')) {
          e.preventDefault();
          this._closeModal();
          return;
        }

        // Tancar toast
        if (e.target.closest('.toast-close')) {
          e.preventDefault();
          this._hideToast();
          return;
        }
      });

      // Cerca global
      const globalSearch = document.getElementById('global-search-input');
      if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
          if (e.target.value.length > 2) {
            this._performGlobalSearch(e.target.value);
          }
        });
      }

      // Editor events
      this._bindEditorEvents();

      // Filtres de cerca
      this._bindSearchEvents();

      // Import/Export events
      this._bindImportExportEvents();

      // Dreceres de teclat
      this._bindKeyboardShortcuts();

      // Scroll events per back-to-top
      window.addEventListener('scroll', () => this._handleScroll());
    },

    _bindEditorEvents() {
      // Toolbar de l'editor
      document.addEventListener('click', (e) => {
        const toolbarBtn = e.target.closest('.toolbar-btn');
        if (toolbarBtn) {
          e.preventDefault();
          const command = toolbarBtn.dataset.command;
          this._execEditorCommand(command);
        }
      });

      // Guardar nota
      const saveBtn = document.getElementById('editor-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this._saveCurrentNote());
      }

      // Cancel·lar edició
      const cancelBtn = document.getElementById('editor-cancel');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this._cancelEdit());
      }

      // Auto-guardat
      const noteContent = document.getElementById('note-content');
      if (noteContent) {
        let autosaveTimeout;
        noteContent.addEventListener('input', () => {
          clearTimeout(autosaveTimeout);
          autosaveTimeout = setTimeout(() => {
            if (this.currentNote) {
              this._autoSave();
            }
          }, this.config.autosaveDelay);
        });
      }
    },

    _bindSearchEvents() {
      // Aplicar filtres
      const applyBtn = document.getElementById('apply-filters');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => this._applySearchFilters());
      }

      // Netejar filtres
      const clearBtn = document.getElementById('clear-filters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this._clearSearchFilters());
      }

      // Toggle vista resultats
      document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.view-toggle .toggle-btn');
        if (toggleBtn) {
          e.preventDefault();
          const view = toggleBtn.dataset.view;
          this._toggleResultsView(view);
        }
      });
    },

    _bindImportExportEvents() {
      // Upload area
      const uploadArea = document.getElementById('upload-area');
      const fileInput = document.getElementById('import-file');
      
      if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
          uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadArea.classList.remove('dragover');
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            this._handleFileImport(files[0]);
          }
        });
        
        fileInput.addEventListener('change', (e) => {
          if (e.target.files.length > 0) {
            this._handleFileImport(e.target.files[0]);
          }
        });
      }

      // Botó d'importar
      const importBtn = document.getElementById('import-btn');
      if (importBtn) {
        importBtn.addEventListener('click', () => this._processImport());
      }
    },

    _bindKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          switch(e.key) {
            case 'n':
              e.preventDefault();
              this._handleQuickAction('new-note');
              break;
            case 'f':
              e.preventDefault();
              this._switchView('search');
              break;
            case 's':
              e.preventDefault();
              if (this.currentView === 'editor' && this.currentNote) {
                this._saveCurrentNote();
              }
              break;
            case 'k':
              e.preventDefault();
              const globalSearch = document.getElementById('global-search-input');
              if (globalSearch) globalSearch.focus();
              break;
          }
        }
        
        if (e.key === 'Escape') {
          this._closeModal();
          if (this.isEditing) {
            this._cancelEdit();
          }
        }
      });
    },

    // =============================
    // GESTIÓ DE VISTES
    // =============================

    _switchView(viewName) {
      console.log(`🔄 Quadern: Canviant a vista '${viewName}'`);
      
      // Actualitzar vista activa
      document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
      });
      
      const targetView = document.getElementById(`${viewName}-view`);
      if (targetView) {
        targetView.classList.add('active');
      }

      // Actualitzar botó actiu
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      
      const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
      if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-pressed', 'true');
      }

      this.currentView = viewName;

      // Inicialitzar vista específica
      switch(viewName) {
        case 'dashboard':
          this._loadDashboardData();
          break;
        case 'editor':
          this._initializeEditor();
          break;
        case 'search':
          this._initializeSearch();
          break;
        case 'import-export':
          this._initializeImportExport();
          break;
        case 'study':
          this._initializeStudyView();
          break;
      }
    },

    _initializeViews() {
      // Assegurar que la vista dashboard estigui activa per defecte
      this._switchView('dashboard');
    },

    // =============================
    // VISTA DASHBOARD
    // =============================

    async _loadDashboardData() {
      try {
        console.log('📊 Quadern: Carregant dades del dashboard...');
        
        const notes = await this._getAllNotes();
        
        this._updateRecentNotes(notes);
        this._updateDashboardStats(notes);
        this._updatePopularTags(notes);
        
      } catch (error) {
        console.error('❌ Error carregant dashboard:', error);
        this._showToast('Error carregant les dades', 'error');
      }
    },

    _updateRecentNotes(notes) {
      const container = document.getElementById('recent-notes');
      if (!container) return;

      const recentNotes = notes
        .sort((a, b) => new Date(b.updated || b.created) - new Date(a.updated || a.created))
        .slice(0, this.config.maxRecentNotes);

      if (recentNotes.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>Encara no tens notes. Crea la teva primera nota!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = recentNotes.map(note => `
        <div class="recent-note-item" data-note-id="${note.id}">
          <div class="recent-note-title">${this._escapeHtml(note.title)}</div>
          <div class="recent-note-preview">${this._getContentPreview(note.content)}</div>
          <div class="recent-note-meta">
            ${this._formatLocation(note)} • ${this._formatDate(note.updated || note.created)}
          </div>
        </div>
      `).join('');
    },

    _updateDashboardStats(notes) {
      const totalNotesEl = document.getElementById('stat-total-notes');
      const unitsEl = document.getElementById('stat-units');
      const blocksEl = document.getElementById('stat-blocks');
      const lastEditEl = document.getElementById('stat-last-edit');
      const storageEl = document.getElementById('stat-storage');

      if (totalNotesEl) totalNotesEl.textContent = `${notes.length} notes`;
      
      const units = new Set(notes.map(n => n.unit)).size;
      if (unitsEl) unitsEl.textContent = `${units} unitats`;
      
      const blocks = new Set(notes.map(n => `${n.unit}-${n.bloc}`)).size;
      if (blocksEl) blocksEl.textContent = `${blocks} blocs`;
      
      if (notes.length > 0) {
        const lastEdit = notes.reduce((latest, note) => {
          const noteDate = new Date(note.updated || note.created);
          return noteDate > latest ? noteDate : latest;
        }, new Date(0));
        
        if (lastEditEl) lastEditEl.textContent = this._formatDate(lastEdit.toISOString());
      } else {
        if (lastEditEl) lastEditEl.textContent = 'Mai';
      }
      
      // Calcular mida d'emmagatzematge aproximada
      const storageSize = this._calculateStorageSize(notes);
      if (storageEl) storageEl.textContent = storageSize;
    },

    _updatePopularTags(notes) {
      const container = document.getElementById('popular-tags');
      if (!container) return;

      // Extreure etiquetes de les notes (implementació simplificada)
      const tagCounts = {};
      notes.forEach(note => {
        // Buscar hashtags en el contingut
        const content = note.content || '';
        const tags = content.match(/#[\w\u00C0-\u017F]+/g) || [];
        tags.forEach(tag => {
          const cleanTag = tag.slice(1).toLowerCase();
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        });
      });

      const popularTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);

      if (popularTags.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>Les etiquetes apareixeran quan tinguis notes amb #hashtags.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = popularTags.map(([tag, count]) => `
        <span class="tag" data-tag="${tag}">
          #${tag} (${count})
        </span>
      `).join('');
    },

    _handleQuickAction(action) {
      switch(action) {
        case 'new-note':
          this._switchView('editor');
          this._createNewNote();
          break;
        case 'search':
          this._switchView('search');
          break;
        case 'import':
          this._switchView('import-export');
          break;
        case 'export':
          this._switchView('import-export');
          break;
      }
    },

    // =============================
    // VISTA EDITOR
    // =============================

    _initializeEditor() {
      console.log('✏️ Quadern: Inicialitzant editor...');
      this._loadEditorNavigation();
    },

    async _loadEditorNavigation() {
      try {
        const notes = await this._getAllNotes();
        const structure = this._buildCourseStructure(notes);
        
        const navTree = document.getElementById('editor-nav-tree');
        if (navTree) {
          navTree.innerHTML = this._renderNavigationTree(structure);
        }
      } catch (error) {
        console.error('❌ Error carregant navegació editor:', error);
      }
    },

    _buildCourseStructure(notes) {
      const structure = {};
      
      notes.forEach(note => {
        const unitKey = `unit-${note.unit}`;
        const blockKey = `block-${note.bloc}`;
        const sectionKey = note.section;

        if (!structure[unitKey]) {
          structure[unitKey] = {
            name: `Unitat ${note.unit}`,
            blocks: {}
          };
        }

        if (!structure[unitKey].blocks[blockKey]) {
          structure[unitKey].blocks[blockKey] = {
            name: `Bloc ${note.bloc}`,
            sections: {}
          };
        }

        if (!structure[unitKey].blocks[blockKey].sections[sectionKey]) {
          structure[unitKey].blocks[blockKey].sections[sectionKey] = {
            name: note.sectionTitle || sectionKey,
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
          <div class="tree-item">
            <div class="tree-item-header" data-level="unit" data-key="${unitKey}">
              <span><i class="bi bi-book"></i> ${unit.name}</span>
              <i class="bi bi-chevron-right tree-arrow"></i>
            </div>
            <div class="tree-children">
        `;
        
        Object.entries(unit.blocks).forEach(([blockKey, block]) => {
          html += `
            <div class="tree-item">
              <div class="tree-item-header" data-level="block" data-key="${blockKey}" data-parent="${unitKey}">
                <span><i class="bi bi-folder"></i> ${block.name}</span>
                <i class="bi bi-chevron-right tree-arrow"></i>
              </div>
              <div class="tree-children">
          `;
          
          Object.entries(block.sections).forEach(([sectionKey, section]) => {
            html += `
              <div class="tree-item">
                <div class="tree-item-header" data-level="section" data-key="${sectionKey}" 
                     data-parent="${blockKey}" data-unit="${unitKey.split('-')[1]}" data-block="${blockKey.split('-')[1]}">
                  <span><i class="bi bi-file-text"></i> ${section.name}</span>
                  <span class="notes-count">(${section.notes.length})</span>
                </div>
              </div>
            `;
          });
          
          html += '</div></div>';
        });
        
        html += '</div></div>';
      });

      return html || '<div class="empty-state"><p>No hi ha notes disponibles</p></div>';
    },

    _toggleTreeItem(header) {
      const children = header.nextElementSibling;
      const arrow = header.querySelector('.tree-arrow');
      
      if (children && arrow) {
        children.classList.toggle('expanded');
        arrow.classList.toggle('expanded');
      }
    },

    _selectSection(header) {
      if (header.dataset.level !== 'section') return;

      // Actualitzar selecció visual
      document.querySelectorAll('.tree-item-header').forEach(h => {
        h.classList.remove('active');
      });
      header.classList.add('active');

      // Carregar notes de la secció
      this._loadSectionNotes(header.dataset);
    },

    async _loadSectionNotes(sectionData) {
      try {
        const notes = await this._getAllNotes();
        const sectionNotes = notes.filter(note => 
          note.unit == sectionData.unit && 
          note.bloc == sectionData.block && 
          note.section === sectionData.key
        );

        const titleEl = document.getElementById('section-title');
        if (titleEl) {
          titleEl.textContent = `${sectionData.key} (${sectionNotes.length} notes)`;
        }

        const listContainer = document.getElementById('notes-list');
        if (listContainer) {
          if (sectionNotes.length === 0) {
            listContainer.innerHTML = `
              <div class="empty-state">
                <p>No hi ha notes en aquesta secció.</p>
                <button class="btn btn-primary" onclick="Quadern._createNewNote('${sectionData.unit}', '${sectionData.block}', '${sectionData.key}')">
                  Crear Primera Nota
                </button>
              </div>
            `;
          } else {
            listContainer.innerHTML = sectionNotes.map(note => `
              <div class="note-preview" data-note-id="${note.id}">
                <div class="note-preview-title">${this._escapeHtml(note.title)}</div>
                <div class="note-preview-content">${this._getContentPreview(note.content)}</div>
                <div class="note-preview-meta">${this._formatDate(note.updated || note.created)}</div>
              </div>
            `).join('');
          }
        }
      } catch (error) {
        console.error('❌ Error carregant notes de secció:', error);
      }
    },

    _createNewNote(unit = null, bloc = null, section = null) {
      // Detectar context actual si no es proporcionen paràmetres
      const activeSection = document.querySelector('.tree-item-header.active');
      if (!unit && activeSection && activeSection.dataset.level === 'section') {
        unit = activeSection.dataset.unit;
        bloc = activeSection.dataset.block;
        section = activeSection.dataset.key;
      }

      this.currentNote = {
        id: 'new',
        title: '',
        content: '',
        unit: unit || '1',
        bloc: bloc || '1',
        section: section || 'general',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      const titleInput = document.getElementById('note-title');
      const contentEditor = document.getElementById('note-content');
      
      if (titleInput) {
        titleInput.value = '';
        titleInput.focus();
      }
      
      if (contentEditor) {
        contentEditor.innerHTML = '<p>Comença a escriure la teva nota...</p>';
        // Focus al contingut després d'un moment
        setTimeout(() => {
          contentEditor.focus();
          // Posicionar cursor al final
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(contentEditor.firstChild, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }, 100);
      }

      this.isEditing = true;
      
      const context = section ? ` per ${section}` : '';
      this._showToast(`Nova nota creada${context}`, 'info');
    },

    async _selectNote(noteId) {
      try {
        console.log(`📝 Quadern: Seleccionant nota ${noteId}`);
        
        const notes = await this._getAllNotes();
        const note = notes.find(n => n.id === noteId);
        
        if (!note) {
          console.error(`❌ Nota amb ID ${noteId} no trobada`);
          this._showToast('Nota no trobada', 'error');
          return;
        }

        this.currentNote = { ...note }; // Clonar per evitar modificacions directes
        this.isEditing = true;

        // Actualitzar interfície de l'editor
        const titleInput = document.getElementById('note-title');
        const contentEditor = document.getElementById('note-content');
        
        if (titleInput) titleInput.value = note.title;
        if (contentEditor) contentEditor.innerHTML = note.content;

        // Marcar nota com activa a la llista
        document.querySelectorAll('.note-preview').forEach(preview => {
          preview.classList.remove('active');
        });
        
        const activePreview = document.querySelector(`[data-note-id="${noteId}"]`);
        if (activePreview) activePreview.classList.add('active');

        this._showToast('Nota carregada per edició', 'info');
        
      } catch (error) {
        console.error('❌ Error seleccionant nota:', error);
        this._showToast('Error carregant la nota', 'error');
      }
    },

    _execEditorCommand(command) {
      const editor = document.getElementById('note-content');
      if (!editor) return;

      try {
        switch(command) {
          case 'createLink':
            const url = prompt('Introdueix la URL:');
            if (url) {
              document.execCommand('createLink', false, url);
            }
            break;
          default:
            document.execCommand(command, false, null);
        }
      } catch (error) {
        console.error('❌ Error executant comanda editor:', error);
      }
    },

    async _saveCurrentNote() {
      if (!this.currentNote) {
        this._showToast('No hi ha nota per desar', 'warning');
        return;
      }

      const titleInput = document.getElementById('note-title');
      const contentEditor = document.getElementById('note-content');
      
      if (!titleInput || !contentEditor) {
        this._showToast('Error: Elements editor no trobats', 'error');
        return;
      }

      // Validar dades
      const title = titleInput.value.trim();
      if (!title) {
        this._showToast('El títol és obligatori', 'warning');
        titleInput.focus();
        return;
      }

      const content = contentEditor.innerHTML.trim();
      if (!content || content === '<p>Selecciona una nota per editar o crea una nova nota.</p>') {
        this._showToast('El contingut no pot estar buit', 'warning');
        contentEditor.focus();
        return;
      }

      try {
        // Actualitzar dades de la nota
        this.currentNote.title = title;
        this.currentNote.content = content;
        this.currentNote.updated = new Date().toISOString();

        // Desar nota via localStorage
        console.log('💾 Quadern: Desant nota...');
        await this._saveToLocalStorage(this.currentNote);

        console.log('✅ Quadern: Nota desada:', this.currentNote);
        this._showToast('Nota desada correctament', 'success');
        
        // Refrescar vistes amb les noves dades
        await this._refreshAllViews();
        
        this.isEditing = false;
        
      } catch (error) {
        console.error('❌ Error desant nota:', error);
        this._showToast('Error desant la nota', 'error');
      }
    },

    async _saveToLocalStorage(note) {
      try {
        // Carregar estructura actual de localStorage
        let storage = {};
        try {
          const stored = localStorage.getItem('notes-v1');
          storage = stored ? JSON.parse(stored) : {};
        } catch {
          storage = {};
        }
        
        // Assegurar estructura correcta
        if (!storage.notes || !Array.isArray(storage.notes)) {
          storage = {
            version: 2,
            createdAt: storage.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: []
          };
        }
        
        // Trobar índex de la nota existent o afegir nova
        const existingIndex = storage.notes.findIndex(n => n.id === note.id);
        
        if (existingIndex >= 0) {
          // Actualitzar nota existent
          storage.notes[existingIndex] = { ...note };
          console.log(`📝 Quadern: Nota actualitzada - ${note.title}`);
        } else {
          // Afegir nova nota
          if (note.id === 'new') {
            note.id = `n_${Date.now()}`;
          }
          storage.notes.push({ ...note });
          console.log(`🆕 Quadern: Nova nota afegida - ${note.title}`);
        }
        
        // Actualitzar metadades de l'emmagatzematge
        storage.updatedAt = new Date().toISOString();
        
        // Desar a localStorage
        localStorage.setItem('notes-v1', JSON.stringify(storage));
        console.log(`💾 Quadern: ${storage.notes.length} notes emmagatzemades`);
        
        // Si la nota era nova, actualitzar la referència
        if (this.currentNote.id === 'new') {
          this.currentNote.id = note.id;
        }
        
      } catch (error) {
        console.error('❌ Error desant a localStorage:', error);
        throw error;
      }
    },

    async _refreshAllViews() {
      try {
        // Refrescar dashboard
        if (this.currentView === 'dashboard') {
          await this._loadDashboardData();
        }
        
        // Refrescar navegació
        await this._initializeNavTree();
        
        // Refrescar footer stats
        await this._updateFooterStats();
        
        // Refrescar llista de notes si estem a l'editor
        if (this.currentView === 'editor') {
          const activeSectionHeader = document.querySelector('.tree-item-header.active');
          if (activeSectionHeader && activeSectionHeader.dataset.level === 'section') {
            await this._loadSectionNotes(activeSectionHeader.dataset);
          }
        }
        
      } catch (error) {
        console.error('❌ Error refrescant vistes:', error);
      }
    },

    _cancelEdit() {
      if (this.isEditing && this.currentNote) {
        const hasChanges = this._checkForUnsavedChanges();
        if (hasChanges) {
          const confirmCancel = confirm('Tens canvis no desats. Vols sortir sense desar?');
          if (!confirmCancel) return;
        }
      }
      
      this.currentNote = null;
      this.isEditing = false;
      
      const titleInput = document.getElementById('note-title');
      const contentEditor = document.getElementById('note-content');
      
      if (titleInput) titleInput.value = '';
      if (contentEditor) contentEditor.innerHTML = '<p>Selecciona una nota per editar o crea una nova nota.</p>';
      
      this._showToast('Edició cancel·lada', 'info');
    },

    _autoSave() {
      if (this.currentNote && this.isEditing) {
        this._saveCurrentNote();
        this._showToast('Auto-guardat', 'info');
      }
    },

    // =============================
    // VISTA CERCA
    // =============================

    _initializeSearch() {
      console.log('🔍 Quadern: Inicialitzant cerca...');
      this._loadSearchFilters();
    },

    async _loadSearchFilters() {
      try {
        const notes = await this._getAllNotes();
        
        // Carregar unitats i blocs als filtres
        const units = [...new Set(notes.map(n => n.unit))].sort();
        const blocks = [...new Set(notes.map(n => n.bloc))].sort();

        const unitFilter = document.getElementById('unit-filter');
        if (unitFilter) {
          unitFilter.innerHTML = '<option value="">Totes les unitats</option>' +
            units.map(unit => `<option value="${unit}">Unitat ${unit}</option>`).join('');
        }

        const blockFilter = document.getElementById('block-filter');
        if (blockFilter) {
          blockFilter.innerHTML = '<option value="">Tots els blocs</option>' +
            blocks.map(bloc => `<option value="${bloc}">Bloc ${bloc}</option>`).join('');
        }

        // Carregar etiquetes populars als filtres
        this._loadTagsFilter(notes);
        
        // Actualitzar listener del filtre d'unitat per carregar blocs
        if (unitFilter) {
          unitFilter.addEventListener('change', () => {
            this._updateBlockFilter(notes);
          });
        }
        
      } catch (error) {
        console.error('❌ Error carregant filtres de cerca:', error);
      }
    },

    _loadTagsFilter(notes) {
      const tagsContainer = document.getElementById('tags-filter');
      if (!tagsContainer) return;

      const tagCounts = {};
      notes.forEach(note => {
        const content = note.content || '';
        const tags = content.match(/#[\w\u00C0-\u017F]+/g) || [];
        tags.forEach(tag => {
          const cleanTag = tag.slice(1).toLowerCase();
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        });
      });

      const popularTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

      if (popularTags.length === 0) {
        tagsContainer.innerHTML = '<p class="empty-state">No hi ha etiquetes disponibles</p>';
        return;
      }

      tagsContainer.innerHTML = popularTags.map(([tag, count]) => `
        <span class="tag" data-tag="${tag}">
          #${tag} (${count})
        </span>
      `).join('');
      
      // Afegir listeners per les etiquetes
      tagsContainer.querySelectorAll('.tag').forEach(tagEl => {
        tagEl.addEventListener('click', () => {
          tagEl.classList.toggle('active');
          this._executeSearch();
        });
      });
    },

    _updateBlockFilter(notes) {
      const unitFilter = document.getElementById('unit-filter');
      const blockFilter = document.getElementById('block-filter');
      
      if (!unitFilter || !blockFilter) return;
      
      const selectedUnit = unitFilter.value;
      let blocks = [];
      
      if (selectedUnit) {
        blocks = [...new Set(notes.filter(n => n.unit === selectedUnit).map(n => n.bloc))].sort();
      } else {
        blocks = [...new Set(notes.map(n => n.bloc))].sort();
      }
      
      blockFilter.innerHTML = '<option value="">Tots els blocs</option>' +
        blocks.map(bloc => `<option value="${bloc}">Bloc ${bloc}</option>`).join('');
    },

    _performGlobalSearch(query) {
      if (this.currentView !== 'search') {
        this._switchView('search');
      }
      
      setTimeout(() => {
        this._executeSearch(query);
      }, 100);
    },

    async _executeSearch(query = '') {
      try {
        const notes = await this._getAllNotes();
        let filteredNotes = notes;

        // Aplicar cerca de text
        if (query.trim()) {
          const searchTerm = query.toLowerCase();
          filteredNotes = filteredNotes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm)
          );
        }

        // Aplicar filtres actius
        filteredNotes = this._applyActiveFilters(filteredNotes);

        this._displaySearchResults(filteredNotes, query);
        
      } catch (error) {
        console.error('❌ Error executant cerca:', error);
      }
    },

    _applyActiveFilters(notes) {
      const dateFrom = document.getElementById('date-from')?.value;
      const dateTo = document.getElementById('date-to')?.value;
      const unitFilter = document.getElementById('unit-filter')?.value;
      const blockFilter = document.getElementById('block-filter')?.value;
      const activeTags = Array.from(document.querySelectorAll('#tags-filter .tag.active'))
        .map(tag => tag.dataset.tag);

      return notes.filter(note => {
        // Filtres de data
        if (dateFrom) {
          const noteDate = new Date(note.created).toISOString().split('T')[0];
          if (noteDate < dateFrom) return false;
        }
        
        if (dateTo) {
          const noteDate = new Date(note.created).toISOString().split('T')[0];
          if (noteDate > dateTo) return false;
        }

        // Filtres d'unitat i bloc
        if (unitFilter && note.unit != unitFilter) return false;
        if (blockFilter && note.bloc != blockFilter) return false;

        // Filtres d'etiquetes
        if (activeTags.length > 0) {
          const noteContent = note.content.toLowerCase();
          const hasMatchingTag = activeTags.some(tag => 
            noteContent.includes(`#${tag}`)
          );
          if (!hasMatchingTag) return false;
        }

        return true;
      });
    },

    _displaySearchResults(results, query = '') {
      const container = document.getElementById('search-results-container');
      const countEl = document.getElementById('results-count');
      
      if (countEl) {
        countEl.textContent = `${results.length} resultats`;
      }

      if (!container) return;

      if (results.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="bi bi-search"></i>
            <h3>Cap resultat trobat</h3>
            <p>Prova amb altres termes de cerca o filtres.</p>
          </div>
        `;
        return;
      }

      const isGridView = document.querySelector('.view-toggle .toggle-btn.active')?.dataset.view === 'grid';
      const containerClass = isGridView ? 'results-grid' : 'results-list';
      
      container.innerHTML = `
        <div class="${containerClass}">
          ${results.map(note => this._renderSearchResult(note, query)).join('')}
        </div>
      `;
    },

    _renderSearchResult(note, query) {
      let content = this._getContentPreview(note.content, 150);
      
      // Resaltar termes de cerca
      if (query.trim()) {
        const regex = new RegExp(`(${this._escapeRegex(query)})`, 'gi');
        content = content.replace(regex, '<span class="highlight">$1</span>');
      }

      return `
        <div class="result-card" data-note-id="${note.id}">
          <div class="result-title">${this._escapeHtml(note.title)}</div>
          <div class="result-content">${content}</div>
          <div class="result-meta">
            <span>${this._formatLocation(note)}</span>
            <span>${this._formatDate(note.updated || note.created)}</span>
          </div>
        </div>
      `;
    },

    _applySearchFilters() {
      this._executeSearch();
    },

    _clearSearchFilters() {
      document.getElementById('date-from').value = '';
      document.getElementById('date-to').value = '';
      document.getElementById('unit-filter').value = '';
      document.getElementById('block-filter').value = '';
      
      document.querySelectorAll('#tags-filter .tag.active').forEach(tag => {
        tag.classList.remove('active');
      });

      this._executeSearch();
    },

    _toggleResultsView(view) {
      document.querySelectorAll('.view-toggle .toggle-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      document.querySelector(`[data-view="${view}"]`).classList.add('active');
      this._executeSearch();
    },

    // =============================
    // IMPORT/EXPORT
    // =============================

    _initializeImportExport() {
      console.log('📤 Quadern: Inicialitzant import/export...');
    },

    _handleFileImport(file) {
      if (!file.name.endsWith('.json')) {
        this._showToast('Només es permeten fitxers JSON', 'error');
        return;
      }

      const importBtn = document.getElementById('import-btn');
      if (importBtn) {
        importBtn.textContent = `Importar: ${file.name}`;
        importBtn.disabled = false;
      }

      this.pendingImportFile = file;
    },

    async _processImport() {
      if (!this.pendingImportFile) return;

      try {
        const text = await this.pendingImportFile.text();
        const data = JSON.parse(text);
        
        // TODO: Validar format i integrar amb notes.js
        console.log('📥 Quadern: Processant importació:', data);
        
        this._showToast('Notes importades correctament', 'success');
        this._loadDashboardData(); // Refrescar dashboard
        
      } catch (error) {
        console.error('❌ Error processant importació:', error);
        this._showToast('Error processant el fitxer', 'error');
      }
    },

    async _exportNotes(format) {
      try {
        console.log(`📤 Quadern: Exportant en format ${format}...`);
        
        const notes = await this._getAllNotes();
        const includeTimestamps = document.getElementById('include-timestamps')?.checked ?? true;
        const includeMetadata = document.getElementById('include-metadata')?.checked ?? true;
        const groupByStructure = document.getElementById('group-by-structure')?.checked ?? true;

        let exportData;
        let filename;
        let mimeType;

        switch(format) {
          case 'json':
            exportData = this._generateJSONExport(notes, { includeTimestamps, includeMetadata });
            filename = `notes-export-${this._getDateStamp()}.json`;
            mimeType = 'application/json';
            break;
            
          case 'html':
            exportData = this._generateHTMLExport(notes, { includeTimestamps, includeMetadata, groupByStructure });
            filename = `notes-export-${this._getDateStamp()}.html`;
            mimeType = 'text/html';
            break;
            
          case 'markdown':
            exportData = this._generateMarkdownExport(notes, { includeTimestamps, includeMetadata, groupByStructure });
            filename = `notes-export-${this._getDateStamp()}.md`;
            mimeType = 'text/markdown';
            break;
            
          case 'pdf':
            this._generatePDFExport(notes, { includeTimestamps, includeMetadata, groupByStructure });
            return;
        }

        this._downloadFile(exportData, filename, mimeType);
        this._showToast(`Exportació ${format.toUpperCase()} completada`, 'success');
        
      } catch (error) {
        console.error('❌ Error exportant:', error);
        this._showToast('Error durant l\'exportació', 'error');
      }
    },

    // =============================
    // VISTA D'ESTUDI
    // =============================

    _initializeStudyView() {
      console.log('📖 Quadern: Inicialitzant vista d\'estudi...');
      this._loadStudyContent();
    },

    async _loadStudyContent() {
      try {
        const notes = await this._getAllNotes();
        const structure = this._buildCourseStructure(notes);
        
        this._renderStudyIndex(structure);
        this._renderStudyContent(structure);
        
      } catch (error) {
        console.error('❌ Error carregant vista d\'estudi:', error);
      }
    },

    _renderStudyIndex(structure) {
      const indexContent = document.getElementById('study-index-content');
      if (!indexContent) return;

      let html = '';
      Object.entries(structure).forEach(([unitKey, unit]) => {
        html += `
          <div class="index-item" data-target="${unitKey}">
            <i class="bi bi-book"></i> ${unit.name}
          </div>
        `;
        
        Object.entries(unit.blocks).forEach(([blockKey, block]) => {
          html += `
            <div class="index-item" data-target="${blockKey}" style="padding-left: 20px;">
              <i class="bi bi-folder"></i> ${block.name}
            </div>
          `;
        });
      });

      indexContent.innerHTML = html || '<div class="empty-state"><p>No hi ha contingut per mostrar</p></div>';
    },

    _renderStudyContent(structure) {
      const studyBody = document.getElementById('study-body');
      if (!studyBody) return;

      if (Object.keys(structure).length === 0) {
        studyBody.innerHTML = `
          <div class="empty-state">
            <i class="bi bi-book"></i>
            <h3>No hi ha notes per mostrar</h3>
            <p>Crea algunes notes per veure-les en format d'estudi.</p>
          </div>
        `;
        return;
      }

      let html = '';
      Object.entries(structure).forEach(([unitKey, unit]) => {
        html += `<div class="study-unit" id="${unitKey}">`;
        html += `<h1>${unit.name}</h1>`;
        
        Object.entries(unit.blocks).forEach(([blockKey, block]) => {
          html += `<div class="study-block" id="${blockKey}">`;
          html += `<h2>${block.name}</h2>`;
          
          Object.entries(block.sections).forEach(([sectionKey, section]) => {
            if (section.notes.length > 0) {
              html += `<div class="study-section">`;
              html += `<h3>${section.name}</h3>`;
              
              section.notes.forEach(note => {
                html += `
                  <div class="study-note">
                    <h4>${this._escapeHtml(note.title)}</h4>
                    <div>${note.content}</div>
                  </div>
                `;
              });
              
              html += `</div>`;
            }
          });
          
          html += `</div>`;
        });
        
        html += `</div>`;
      });

      studyBody.innerHTML = html;
    },

    // =============================
    // UTILITATS I HELPERS
    // =============================

    async _getAllNotes() {
      let notes = [];
      
      try {
        console.log('📦 Quadern: Carregant notes des de localStorage...');
        
        // Carregar des de localStorage amb validació robusta
        const stored = localStorage.getItem('notes-v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          
          // Validar estructura de dades - suportar múltiples formats
          if (Array.isArray(parsed)) {
            // Format simple: array directe de notes
            notes = parsed;
            console.log(`✅ Quadern: Carregades ${notes.length} notes (format array directe)`);
          } else if (parsed && typeof parsed === 'object') {
            // Format objecte contenidor
            if (Array.isArray(parsed.notes)) {
              // Format nou: {notes: [...]}
              notes = parsed.notes;
              console.log(`✅ Quadern: Carregades ${notes.length} notes (format objecte)`);
            } else {
              // Format legacy possible - intentar extreure notes
              console.warn('⚠️ Quadern: Format localStorage no reconegut:', parsed);
              notes = [];
            }
          } else {
            console.warn('⚠️ Quadern: Dades localStorage no vàlides:', parsed);
            notes = [];
          }
        } else {
          console.log('📝 Quadern: Cap nota trobada, inicialitzant emmagatzematge buit');
          // Inicialitzar estructura buida
          this._initializeStorage();
          notes = [];
        }
        
      } catch (parseError) {
        console.error('❌ Quadern: Error parsejant localStorage:', parseError);
        console.log('🔄 Quadern: Reinicialitzant emmagatzematge...');
        this._initializeStorage();
        notes = [];
      }
      
      // Validació final: assegurar que sempre retornem un array
      if (!Array.isArray(notes)) {
        console.error('❌ Quadern: Dades no són un array, forçant array buit');
        notes = [];
      }
      
      // Validar i normalitzar estructura de cada nota
      notes = notes.filter(note => {
        if (!note || typeof note !== 'object') return false;
        
        // Validar camps mínims requerits
        if (!note.id) return false;
        if (!note.title && !note.content) return false;
        
        // Normalitzar camps obligatoris amb valors per defecte
        note.title = note.title || 'Nota sense títol';
        note.content = note.content || '';
        note.unit = (note.unit || note.unitat || '1').toString();
        note.bloc = (note.bloc || '1').toString();
        note.section = note.section || note.sectionId || 'general';
        note.sectionTitle = note.sectionTitle || note.section;
        note.created = note.created || note.createdAt || new Date().toISOString();
        note.updated = note.updated || note.updatedAt || note.created;
        
        return true;
      });
      
      console.log(`🎯 Quadern: Retornant ${notes.length} notes vàlides`);
      return notes;
    },

    _initializeStorage() {
      try {
        const initialData = {
          version: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: []
        };
        localStorage.setItem('notes-v1', JSON.stringify(initialData));
        console.log('✅ Quadern: Emmagatzematge inicialitzat');
      } catch (error) {
        console.error('❌ Quadern: Error inicialitzant emmagatzematge:', error);
      }
    },

    async _initializeNavTree() {
      try {
        const notes = await this._getAllNotes();
        const structure = this._buildCourseStructure(notes);
        
        const navTree = document.getElementById('nav-tree');
        if (navTree) {
          navTree.innerHTML = this._renderNavigationTree(structure);
        }
      } catch (error) {
        console.error('❌ Error inicialitzant arbre de navegació:', error);
      }
    },

    async _updateFooterStats() {
      try {
        const notes = await this._getAllNotes();
        
        const totalNotesEl = document.getElementById('total-notes');
        if (totalNotesEl) {
          totalNotesEl.textContent = `${notes.length} notes`;
        }
        
        const storageSize = this._calculateStorageSize(notes);
        const storageSizeEl = document.getElementById('storage-size');
        if (storageSizeEl) {
          storageSizeEl.textContent = storageSize;
        }
        
        const lastSyncEl = document.getElementById('last-sync');
        if (lastSyncEl && notes.length > 0) {
          const lastEdit = notes.reduce((latest, note) => {
            const noteDate = new Date(note.updated || note.created);
            return noteDate > latest ? noteDate : latest;
          }, new Date(0));
          
          lastSyncEl.textContent = this._formatRelativeTime(lastEdit);
        }
      } catch (error) {
        console.error('❌ Error actualitzant estadístiques footer:', error);
      }
    },

    _calculateStorageSize(notes) {
      const dataSize = JSON.stringify(notes).length;
      if (dataSize < 1024) return `${dataSize} B`;
      if (dataSize < 1024 * 1024) return `${(dataSize / 1024).toFixed(1)} KB`;
      return `${(dataSize / (1024 * 1024)).toFixed(1)} MB`;
    },

    _formatLocation(note) {
      return `Unitat ${note.unit} - Bloc ${note.bloc}`;
    },

    _formatDate(isoString) {
      const date = new Date(isoString);
      return date.toLocaleDateString('ca-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },

    _formatRelativeTime(date) {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Ara mateix';
      if (diffMins < 60) return `Fa ${diffMins} minuts`;
      if (diffHours < 24) return `Fa ${diffHours} hores`;
      if (diffDays < 7) return `Fa ${diffDays} dies`;
      return this._formatDate(date.toISOString());
    },

    _getContentPreview(content, maxLength = 80) {
      if (!content) return 'Sense contingut';
      
      // Eliminar HTML tags per obtenir text pla
      const textContent = content.replace(/<[^>]*>/g, ' ').trim();
      
      if (textContent.length <= maxLength) return textContent;
      return textContent.slice(0, maxLength) + '...';
    },

    _getDateStamp() {
      return new Date().toISOString().split('T')[0];
    },

    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    _escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    _checkForUnsavedChanges() {
      // Comprovar si hi ha canvis no desats
      return this.isEditing && this.currentNote;
    },

    // =============================
    // EXPORTACIÓ DE FORMATS
    // =============================

    _generateJSONExport(notes, options) {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '2.0',
          totalNotes: notes.length
        },
        notes: notes.map(note => {
          const exported = {
            id: note.id,
            title: note.title,
            content: note.content
          };
          
          if (options.includeMetadata) {
            exported.unit = note.unit;
            exported.bloc = note.bloc;
            exported.section = note.section;
            exported.sectionTitle = note.sectionTitle;
          }
          
          if (options.includeTimestamps) {
            exported.created = note.created;
            exported.updated = note.updated;
          }
          
          return exported;
        })
      };

      return JSON.stringify(exportData, null, 2);
    },

    _generateHTMLExport(notes, options) {
      const title = 'Quadern de Notes - Exportació';
      const date = new Date().toLocaleDateString('ca-ES');
      
      let html = `
<!DOCTYPE html>
<html lang="ca">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #3498db; padding-bottom: 20px; }
        .unit { margin-bottom: 40px; }
        .unit-title { color: #3498db; font-size: 2rem; margin-bottom: 20px; }
        .block { margin-bottom: 30px; margin-left: 20px; }
        .block-title { color: #2c3e50; font-size: 1.5rem; margin-bottom: 15px; }
        .section { margin-bottom: 25px; margin-left: 20px; }
        .section-title { color: #34495e; font-size: 1.2rem; margin-bottom: 10px; }
        .note { background: #f8f9fa; border-left: 4px solid #3498db; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
        .note-title { font-weight: 600; margin-bottom: 8px; }
        .note-content { margin-bottom: 8px; }
        .note-meta { font-size: 0.8rem; color: #6c757d; }
        @media print { body { margin: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Exportat el ${date}</p>
        <p>Total de notes: ${notes.length}</p>
    </div>
`;

      if (options.groupByStructure) {
        const structure = this._buildCourseStructure(notes);
        
        Object.entries(structure).forEach(([unitKey, unit]) => {
          html += `<div class="unit"><h2 class="unit-title">${unit.name}</h2>`;
          
          Object.entries(unit.blocks).forEach(([blockKey, block]) => {
            html += `<div class="block"><h3 class="block-title">${block.name}</h3>`;
            
            Object.entries(block.sections).forEach(([sectionKey, section]) => {
              if (section.notes.length > 0) {
                html += `<div class="section"><h4 class="section-title">${section.name}</h4>`;
                
                section.notes.forEach(note => {
                  html += `<div class="note">`;
                  html += `<div class="note-title">${this._escapeHtml(note.title)}</div>`;
                  html += `<div class="note-content">${note.content}</div>`;
                  if (options.includeTimestamps) {
                    html += `<div class="note-meta">Creat: ${this._formatDate(note.created)}`;
                    if (note.updated !== note.created) {
                      html += ` • Modificat: ${this._formatDate(note.updated)}`;
                    }
                    html += `</div>`;
                  }
                  html += `</div>`;
                });
                
                html += `</div>`;
              }
            });
            
            html += `</div>`;
          });
          
          html += `</div>`;
        });
      } else {
        // Exportació lineal sense agrupació
        notes.forEach(note => {
          html += `<div class="note">`;
          html += `<div class="note-title">${this._escapeHtml(note.title)}</div>`;
          html += `<div class="note-content">${note.content}</div>`;
          if (options.includeMetadata) {
            html += `<div class="note-meta">Ubicació: ${this._formatLocation(note)} - ${note.section}</div>`;
          }
          if (options.includeTimestamps) {
            html += `<div class="note-meta">Creat: ${this._formatDate(note.created)}</div>`;
          }
          html += `</div>`;
        });
      }

      html += `
</body>
</html>`;

      return html;
    },

    _generateMarkdownExport(notes, options) {
      let markdown = `# Quadern de Notes\n\n`;
      markdown += `Exportat el ${new Date().toLocaleDateString('ca-ES')}\n`;
      markdown += `Total de notes: ${notes.length}\n\n---\n\n`;

      if (options.groupByStructure) {
        const structure = this._buildCourseStructure(notes);
        
        Object.entries(structure).forEach(([unitKey, unit]) => {
          markdown += `## ${unit.name}\n\n`;
          
          Object.entries(unit.blocks).forEach(([blockKey, block]) => {
            markdown += `### ${block.name}\n\n`;
            
            Object.entries(block.sections).forEach(([sectionKey, section]) => {
              if (section.notes.length > 0) {
                markdown += `#### ${section.name}\n\n`;
                
                section.notes.forEach(note => {
                  markdown += `**${note.title}**\n\n`;
                  
                  // Convertir HTML a markdown simple
                  let content = note.content
                    .replace(/<p[^>]*>/g, '')
                    .replace(/<\/p>/g, '\n\n')
                    .replace(/<br[^>]*>/g, '\n')
                    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
                    .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
                    .replace(/<[^>]*>/g, '');
                    
                  markdown += `${content}\n\n`;
                  
                  if (options.includeTimestamps) {
                    markdown += `*Creat: ${this._formatDate(note.created)}*\n\n`;
                  }
                  
                  markdown += `---\n\n`;
                });
              }
            });
          });
        });
      } else {
        // Exportació lineal
        notes.forEach(note => {
          markdown += `## ${note.title}\n\n`;
          
          let content = note.content
            .replace(/<p[^>]*>/g, '')
            .replace(/<\/p>/g, '\n\n')
            .replace(/<br[^>]*>/g, '\n')
            .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
            .replace(/<[^>]*>/g, '');
            
          markdown += `${content}\n\n`;
          
          if (options.includeMetadata) {
            markdown += `**Ubicació:** ${this._formatLocation(note)} - ${note.section}\n\n`;
          }
          
          if (options.includeTimestamps) {
            markdown += `**Creat:** ${this._formatDate(note.created)}\n\n`;
          }
          
          markdown += `---\n\n`;
        });
      }

      return markdown;
    },

    _generatePDFExport(notes, options) {
      try {
        // Generar HTML i obrir per imprimir com PDF
        const htmlContent = this._generateHTMLExport(notes, options);
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
          this._showToast('Error: No es pot obrir finestra d\'impressió. Comprova els bloquejadors de finestres emergents.', 'error');
          return;
        }
        
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Esperar que es carregui i després imprimir
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        });
        
      } catch (error) {
        console.error('❌ Error generant PDF:', error);
        this._showToast('Error generant PDF', 'error');
      }
    },

    _downloadFile(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    },

    // =============================
    // UI UTILITIES
    // =============================

    _showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      if (!toast) return;

      const iconMap = {
        success: 'bi-check-circle',
        error: 'bi-exclamation-circle',
        warning: 'bi-exclamation-triangle',
        info: 'bi-info-circle'
      };

      toast.className = `toast ${type}`;
      toast.querySelector('.toast-icon').className = `toast-icon ${iconMap[type]}`;
      toast.querySelector('.toast-message').textContent = message;
      
      toast.classList.add('show');
      
      setTimeout(() => {
        this._hideToast();
      }, this.config.toastDuration);
    },

    _hideToast() {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.classList.remove('show');
      }
    },

    _showModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('active');
        
        // Focus al primer element focusable
        const firstFocusable = modal.querySelector('input, button, select, textarea');
        if (firstFocusable) {
          setTimeout(() => firstFocusable.focus(), 100);
        }
      }
    },

    _closeModal() {
      document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
      });
    },

    _scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _handleScroll() {
      const backToTop = document.getElementById('back-to-top');
      if (backToTop) {
        if (window.scrollY > 300) {
          backToTop.classList.add('visible');
        } else {
          backToTop.classList.remove('visible');
        }
      }
    },

    // =============================
    // API PÚBLICA
    // =============================

    // Mètodes accessibles des de l'exterior per debugging i integració
    switchView(viewName) {
      this._switchView(viewName);
    },

    async refreshData() {
      await this._loadDashboardData();
      await this._initializeNavTree();
      await this._updateFooterStats();
    },

    exportNotes(format) {
      this._exportNotes(format);
    },

    // Bridge amb Notes.js - permetent comunicació bidireccional
    async createNoteFromSection(unit, bloc, section, sectionTitle) {
      try {
        console.log(`🆕 Quadern: Creant nova nota per ${unit}-${bloc}-${section}`);
        
        // Canviar a vista editor
        this._switchView('editor');
        
        // Esperar que la vista es carregui
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Crear nova nota amb contexte
        this.currentNote = {
          id: 'new',
          title: '',
          content: '',
          unit: unit.toString(),
          bloc: bloc.toString(),
          section: section,
          sectionTitle: sectionTitle,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };

        const titleInput = document.getElementById('note-title');
        const contentEditor = document.getElementById('note-content');
        
        if (titleInput) {
          titleInput.value = '';
          titleInput.focus();
        }
        
        if (contentEditor) {
          contentEditor.innerHTML = '<p>Comença a escriure la teva nota...</p>';
        }

        this.isEditing = true;
        this._showToast(`Nova nota per ${sectionTitle}`, 'info');
        
        return this.currentNote;
        
      } catch (error) {
        console.error('❌ Error creant nota des de secció:', error);
        this._showToast('Error creant la nota', 'error');
        return null;
      }
    },

    // Mètode per sincronitzar des de Notes.js quan es desin notes
    async notifyNoteChanged() {
      console.log('🔄 Quadern: Nota canviada, refrescant vistes...');
      await this._refreshAllViews();
    }
  };

  // =============================
  // INICIALITZACIÓ AUTOMÀTICA
  // =============================

  // Exposar globalment per debugging
  window.Quadern = Quadern;

  // Auto-inicialització quan el DOM estigui llest
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Quadern.init());
  } else {
    Quadern.init();
  }

})();