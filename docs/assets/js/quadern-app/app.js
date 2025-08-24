/*
  Quadern de Notes - Aplicació Principal
  Coordinador central del sistema de notes
*/

;(function() {
  'use strict';

  // Namespace principal del Quadern
  const QuadernApp = {
    // Estat de l'aplicació
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

    // Referències als mòduls
    modules: {
      events: null,
      navigation: null,
      dashboard: null,
      editor: null,
      search: null,
      study: null,
      importExport: null,
      components: null,
      formatters: null
    },

    // =============================
    // INICIALITZACIÓ
    // =============================

    init() {
      try {
        console.log('🟦 Quadern: Inicialitzant aplicació...');
        
        // Comprovar si estem a la pàgina del quadern
        if (!this._isQuadernPage()) {
          console.log('🟨 Quadern: No és pàgina de quadern, sortint...');
          return;
        }

        // Inicialitzar mòduls en ordre de dependència
        this._initializeModules();
        
        console.log('✅ Quadern: Aplicació inicialitzada correctament');
      } catch (error) {
        console.error('❌ Quadern: Error en inicialització:', error);
      }
    },

    _isQuadernPage() {
      return document.querySelector('.quadern-layout') !== null ||
             document.querySelector('[data-page="quadern"]') !== null ||
             window.location.pathname.includes('quadern');
    },

    _initializeModules() {
      // 1. Events (base per tot)
      if (window.Quadern?.Events) {
        this.modules.events = window.Quadern.Events;
        this.modules.events.init(this);
      }

      // 2. Navigation (gestió de vistes)
      if (window.Quadern?.Navigation) {
        this.modules.navigation = window.Quadern.Navigation;
        this.modules.navigation.init(this);
      }

      // 3. Components UI
      if (window.Quadern?.Components) {
        this.modules.components = window.Quadern.Components;
        this.modules.components.init(this);
      }

      // 4. Vistes específiques
      this._initializeViews();

      // 5. Discovery - Sistema de descobriment d'estructura
      if (window.Quadern?.Discovery) {
        this.modules.discovery = window.Quadern.Discovery;
        this.modules.discovery.init(this);
      }

      // 6. Utilitats
      if (window.Quadern?.Formatters) {
        this.modules.formatters = window.Quadern.Formatters;
        this.modules.formatters.init(this);
      }

      // Inicialitzar vista per defecte
      this._initializeDefaultView();
    },

    _initializeViews() {
      // Dashboard
      if (window.Quadern?.Dashboard) {
        this.modules.dashboard = window.Quadern.Dashboard;
        this.modules.dashboard.init(this);
      }

      // Editor
      if (window.Quadern?.Editor) {
        this.modules.editor = window.Quadern.Editor;
        this.modules.editor.init(this);
      }

      // Cerca
      if (window.Quadern?.Search) {
        this.modules.search = window.Quadern.Search;
        this.modules.search.init(this);
      }

      // Estudi
      if (window.Quadern?.Study) {
        this.modules.study = window.Quadern.Study;
        this.modules.study.init(this);
      }

      // Import/Export
      if (window.Quadern?.ImportExport) {
        this.modules.importExport = window.Quadern.ImportExport;
        this.modules.importExport.init(this);
      }
    },

    _initializeDefaultView() {
      // Verificar que els elements HTML existeixen
      console.log('🟦 App: Verificant elements HTML...');
      const dashboardView = document.getElementById('dashboard-view');
      const navTree = document.getElementById('nav-tree');
      
      if (!dashboardView) {
        console.warn('🟨 App: No s\'ha trobat #dashboard-view');
      }
      if (!navTree) {
        console.warn('🟨 App: No s\'ha trobat #nav-tree');
      }
      
      // Carregar dades del dashboard per defecte
      if (this.modules.dashboard && dashboardView) {
        console.log('🟦 App: Carregant dades del dashboard...');
        this.modules.dashboard.loadData();
      }
      
      // Inicialitzar navegació d'arbre
      this._initializeNavTree();
      
      // Actualitzar estadístiques del peu
      this._updateFooterStats();
      
      // Assegurar que la vista per defecte està visible
      if (this.modules.navigation) {
        this.modules.navigation.switchView('dashboard');
      }
    },

    _initializeNavTree() {
      // Delegar a Navigation module si existeix
      if (this.modules.navigation) {
        this.modules.navigation.initializeNavTree();
      }
      
      // També carregar estructura al nav-tree principal
      this._loadCourseStructure();
    },
    
    async _loadCourseStructure() {
      const navTree = document.getElementById('nav-tree');
      if (!navTree) return;
      
      console.log('🟦 App: Carregant estructura completa del curs...');
      
      // Mostrar loader inicial
      navTree.innerHTML = `
        <div class="nav-loading">
          <div class="loading-spinner"></div>
          <p>Carregant estructura del curs...</p>
        </div>
      `;
      
      try {
        // Usar Discovery per carregar estructura completa
        if (this.modules.discovery) {
          const completeStructure = await this.modules.discovery.loadCompleteStructure();
          
          if (!completeStructure || Object.keys(completeStructure).length === 0) {
            navTree.innerHTML = `
              <div class="nav-empty">
                <i class="bi bi-journal-text"></i>
                <p>No s'ha trobat estructura del curs</p>
                <p>Comprova la configuració del curs</p>
              </div>
            `;
            return;
          }
          
          // Renderitzar estructura completa
          navTree.innerHTML = this._renderCompleteStructure(completeStructure);
          
          // Mostrar estadístiques
          const stats = this.modules.discovery.getStructureStats();
          if (stats) {
            console.log('📊 App: Estadístiques estructura:', stats);
          }
          
          console.log('✅ App: Estructura completa carregada');
        } else {
          throw new Error('Discovery module no disponible');
        }
        
      } catch (error) {
        console.error('❌ App: Error carregant estructura:', error);
        navTree.innerHTML = `
          <div class="nav-error">
            <i class="bi bi-exclamation-triangle"></i>
            <p>Error carregant l'estructura</p>
            <button class="btn btn-sm btn-outline" onclick="window.Quadern.App.refreshCourseStructure()">
              <i class="bi bi-arrow-clockwise"></i> Intentar de nou
            </button>
          </div>
        `;
      }
    },
    
    _buildNavStructure(notes) {
      const structure = {};
      
      notes.forEach(note => {
        const unitKey = `U${note.unitat || '?'}`;
        const blockKey = `B${note.bloc || '?'}`;
        
        if (!structure[unitKey]) {
          structure[unitKey] = { name: unitKey, blocks: {}, noteCount: 0 };
        }
        
        if (!structure[unitKey].blocks[blockKey]) {
          structure[unitKey].blocks[blockKey] = { name: blockKey, sections: {}, noteCount: 0 };
        }
        
        const sectionKey = note.sectionTitle || note.sectionId || 'Sense títol';
        if (!structure[unitKey].blocks[blockKey].sections[sectionKey]) {
          structure[unitKey].blocks[blockKey].sections[sectionKey] = { 
            name: sectionKey, 
            notes: [],
            url: note.pageUrl
          };
        }
        
        structure[unitKey].blocks[blockKey].sections[sectionKey].notes.push(note);
        structure[unitKey].blocks[blockKey].noteCount++;
        structure[unitKey].noteCount++;
      });
      
      return structure;
    },
    
    _renderNavStructure(structure) {
      let html = '';
      
      Object.entries(structure).forEach(([unitKey, unit]) => {
        html += `
          <div class="nav-unit">
            <div class="nav-unit-header">
              <i class="bi bi-chevron-right nav-toggle"></i>
              <i class="bi bi-folder"></i>
              <span>${unit.name}</span>
              <span class="nav-count">(${unit.noteCount})</span>
            </div>
            <div class="nav-unit-content">
        `;
        
        Object.entries(unit.blocks).forEach(([blockKey, block]) => {
          html += `
            <div class="nav-block">
              <div class="nav-block-header">
                <i class="bi bi-chevron-right nav-toggle"></i>
                <i class="bi bi-folder-fill"></i>
                <span>${block.name}</span>
                <span class="nav-count">(${block.noteCount})</span>
              </div>
              <div class="nav-block-content">
          `;
          
          Object.entries(block.sections).forEach(([sectionKey, section]) => {
            html += `
              <div class="nav-section" data-url="${section.url}">
                <i class="bi bi-file-text"></i>
                <span>${section.name}</span>
                <span class="nav-count">(${section.notes.length})</span>
              </div>
            `;
          });
          
          html += `
              </div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      });
      
      return html;
    },

    _renderCompleteStructure(structure) {
      let html = '<div class="nav-tree-complete">';
      
      Object.values(structure).forEach(unitat => {
        const hasNotes = unitat.noteCount > 0;
        const unitClass = hasNotes ? 'nav-unit has-notes' : 'nav-unit';
        
        html += `
          <div class="${unitClass}" data-unit-id="${unitat.id}">
            <div class="nav-unit-header" role="button" tabindex="0">
              <i class="bi bi-chevron-right nav-toggle" aria-hidden="true"></i>
              <i class="bi bi-folder unit-icon" aria-hidden="true"></i>
              <span class="nav-unit-title">${unitat.nom}</span>
              <div class="nav-badges">
                ${unitat.noteCount > 0 ? `<span class="note-badge">${unitat.noteCount}</span>` : ''}
              </div>
            </div>
            <div class="nav-unit-content">
        `;
        
        Object.values(unitat.blocs).forEach(bloc => {
          const blocHasNotes = bloc.noteCount > 0;
          const blockClass = blocHasNotes ? 'nav-block has-notes' : 'nav-block';
          const sectionCount = Object.keys(bloc.seccions || {}).length;
          
          html += `
            <div class="${blockClass}" data-block-id="${bloc.id}">
              <div class="nav-block-header" role="button" tabindex="0">
                <i class="bi bi-chevron-right nav-toggle" aria-hidden="true"></i>
                <i class="bi bi-folder-fill block-icon" aria-hidden="true"></i>
                <span class="nav-block-title">${bloc.nom}</span>
                <div class="nav-badges">
                  ${bloc.isLoading ? '<span class="loading-badge">⟳</span>' : ''}
                  ${sectionCount > 0 ? `<span class="section-badge">${sectionCount}</span>` : ''}
                  ${bloc.noteCount > 0 ? `<span class="note-badge">${bloc.noteCount}</span>` : ''}
                </div>
              </div>
              <div class="nav-block-content">
          `;
          
          if (bloc.isLoading) {
            html += `
              <div class="nav-loading-sections">
                <i class="bi bi-hourglass-split"></i>
                <span>Carregant seccions...</span>
              </div>
            `;
          } else if (Object.keys(bloc.seccions || {}).length === 0) {
            html += `
              <div class="nav-no-sections">
                <i class="bi bi-info-circle"></i>
                <span>Sense seccions detectades</span>
                ${bloc.url ? `<a href="${bloc.url}" target="_blank" class="nav-link-external">Veure pàgina</a>` : ''}
              </div>
            `;
          } else {
            // Ordenar seccions per ordre
            const sortedSections = Object.values(bloc.seccions).sort((a, b) => a.order - b.order);
            
            sortedSections.forEach(seccio => {
              const sectionHasNotes = seccio.notes.length > 0;
              const sectionClass = sectionHasNotes ? 'nav-section has-notes' : 'nav-section';
              
              html += `
                <div class="${sectionClass}" 
                     data-section-id="${seccio.id}" 
                     data-page-url="${seccio.pageUrl}">
                  <div class="nav-section-content">
                    <i class="bi ${sectionHasNotes ? 'bi-file-text-fill' : 'bi-file-text'} section-icon" aria-hidden="true"></i>
                    <span class="nav-section-title">${seccio.title}</span>
                    <div class="nav-section-actions">
                      ${seccio.notes.length > 0 ? `<span class="note-count">${seccio.notes.length}</span>` : ''}
                      <button class="btn-icon btn-add-note" 
                              title="Afegir nota" 
                              data-unit-id="${unitat.id}"
                              data-block-id="${bloc.id}"
                              data-section-id="${seccio.id}"
                              data-page-url="${seccio.pageUrl}">
                        <i class="bi bi-plus-circle" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            });
          }
          
          html += `
              </div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      
      // Afegir event listeners per navegació
      setTimeout(() => this._bindNavigationEvents(), 100);
      
      return html;
    },

    _bindNavigationEvents() {
      console.log('🟦 App: Vinculant events de navegació...');
      
      // Toggle unitats i blocs
      document.querySelectorAll('.nav-unit-header, .nav-block-header').forEach(header => {
        header.addEventListener('click', (e) => {
          const container = header.parentElement;
          const isExpanded = container.classList.contains('expanded');
          
          // Toggle expanded class
          container.classList.toggle('expanded', !isExpanded);
          
          // Actualitzar icona
          const toggleIcon = header.querySelector('.nav-toggle');
          if (toggleIcon) {
            toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
          }
        });
      });
      
      // Click en seccions
      document.querySelectorAll('.nav-section').forEach(section => {
        section.addEventListener('click', (e) => {
          // Evitar que el click en botons propagui
          if (e.target.closest('.btn-add-note')) return;
          
          const pageUrl = section.dataset.pageUrl;
          const sectionId = section.dataset.sectionId;
          
          if (pageUrl) {
            // Navegar a la pàgina amb ancoratge
            const fullUrl = `${pageUrl}#${sectionId}`;
            console.log('🧭 App: Navegant a secció:', fullUrl);
            window.open(fullUrl, '_blank');
          }
        });
      });
      
      // Botons d'afegir nota
      document.querySelectorAll('.btn-add-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          
          const unitId = btn.dataset.unitId;
          const blockId = btn.dataset.blockId;
          const sectionId = btn.dataset.sectionId;
          const pageUrl = btn.dataset.pageUrl;
          
          console.log('➕ App: Afegir nota per secció:', {unitId, blockId, sectionId, pageUrl});
          
          // Canviar a vista editor i crear nova nota
          if (this.switchView) {
            this.switchView('editor');
            
            // Crear nota amb context
            setTimeout(() => {
              if (this.modules.editor && this.modules.editor.createNewNoteForSection) {
                this.modules.editor.createNewNoteForSection(unitId, blockId, sectionId, pageUrl);
              }
            }, 200);
          }
        });
      });
    },

    _updateFooterStats() {
      // Delegar a Components module si existeix
      if (this.modules.components) {
        this.modules.components.updateFooterStats();
      }
    },

    // =============================
    // API PÚBLICA
    // =============================

    // Mètodes per canviar vista
    switchView(viewName) {
      console.log('🟦 App: switchView cridat per:', viewName);
      if (this.modules.navigation) {
        return this.modules.navigation.switchView(viewName);
      } else {
        console.error('❌ App: Navigation module no disponible');
      }
    },

    // Mètodes per gestionar notes
    selectNote(noteId) {
      if (this.modules.editor) {
        return this.modules.editor.selectNote(noteId);
      }
    },

    // Mètodes per actualitzar dades
    refreshData() {
      this.notesCache = null;
      this.statsCache = null;
      
      // Notificar tots els mòduls que les dades han canviat
      Object.values(this.modules).forEach(module => {
        if (module && typeof module.refreshData === 'function') {
          module.refreshData();
        }
      });
    },

    // Bridge amb el sistema de panells
    syncWithPanel() {
      this.refreshData();
      if (this.modules.dashboard) {
        this.modules.dashboard.loadData();
      }
    },

    // Mètode per debugging
    getModuleStatus() {
      const status = {};
      Object.keys(this.modules).forEach(key => {
        status[key] = this.modules[key] ? 'loaded' : 'not_loaded';
      });
      return status;
    },

    // Mètode per refrescar estructura del curs
    async refreshCourseStructure() {
      console.log('🟦 App: Refrescant estructura del curs...');
      await this._loadCourseStructure();
    }
  };

  // Exposar al namespace global
  window.Quadern = window.Quadern || {};
  window.Quadern.App = QuadernApp;

  // Auto-inicialització quan DOM estigui llest
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => QuadernApp.init());
  } else {
    QuadernApp.init();
  }

})();