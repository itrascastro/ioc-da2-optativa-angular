/*
  SISTEMA NAVIGATION TREE - DES DE ZERO
  No fallbacks, no patches, no mierda - funciona des del primer click
*/

;(function() {
  'use strict';

  const NavigationTree = {
    
    init() {
      console.log('🆕 NavigationTree: Inicialitzant sistema NOU...');
      this.loadCourseStructure();
      this.bindEvents();
      console.log('✅ NavigationTree: Sistema inicialitzat CORRECTAMENT');
    },

    async loadCourseStructure() {
      const container = document.getElementById('nav-tree');
      if (!container) {
        console.error('❌ NavigationTree: Container #nav-tree no trobat');
        return;
      }

      // Mostrar loading
      container.innerHTML = `
        <div class="nav-tree-loading">
          <div class="loading-spinner"></div>
          <p>Carregant estructura del curs...</p>
        </div>
      `;

      try {
        // Esperar que Discovery estigui disponible
        if (window.Quadern?.Discovery) {
          console.log('🆕 NavigationTree: Carregant estructura amb Discovery...');
          const structure = await window.Quadern.Discovery.loadCompleteStructure();
          
          if (structure && Object.keys(structure).length > 0) {
            this.renderCompleteStructure(structure);
          } else {
            this.renderEmpty();
          }
        } else {
          console.warn('🔴 NavigationTree: Discovery no disponible, usant fallback');
          this.renderFromCourseData();
        }
      } catch (error) {
        console.error('❌ NavigationTree: Error carregant estructura:', error);
        this.renderError();
      }
    },

    renderFromCourseData() {
      // Fallback: usar window.courseData directament
      if (!window.courseData?.unitats) {
        this.renderEmpty();
        return;
      }

      console.log('🆕 NavigationTree: Renderitzant des de courseData...');
      const structure = this.buildStructureFromCourseData(window.courseData);
      this.renderCompleteStructure(structure);
    },

    buildStructureFromCourseData(courseData) {
      const structure = {};
      
      courseData.unitats.forEach(unitat => {
        const unitKey = `unitat-${unitat.numero}`;
        structure[unitKey] = {
          id: unitat.numero,
          nom: unitat.nom,
          descripcio: unitat.descripcio,
          noteCount: 0,
          blocs: {}
        };
        
        if (unitat.blocs) {
          unitat.blocs.forEach(bloc => {
            const blockKey = `bloc-${bloc.numero}`;
            structure[unitKey].blocs[blockKey] = {
              id: bloc.numero,
              nom: bloc.nom,
              descripcio: bloc.descripcio,
              url: bloc.url,
              noteCount: 0,
              seccions: {}
            };
            
            if (bloc.seccions) {
              bloc.seccions.forEach((seccio, index) => {
                structure[unitKey].blocs[blockKey].seccions[seccio.id] = {
                  id: seccio.id,
                  title: seccio.titol,
                  pageUrl: bloc.url,
                  notes: [],
                  order: index
                };
              });
            }
          });
        }
      });
      
      return structure;
    },

    renderMinimal() {
      const container = document.getElementById('nav-tree');
      if (!container) {
        console.error('❌ NavigationTree: Container #nav-tree no trobat');
        return;
      }

      // HTML MÍNIM - només un test inicial (DEPRECATED)
      container.innerHTML = `
        <div class="nav-tree">
          <div class="nav-tree-unit" id="test-unit">
            <button class="nav-tree-toggle" data-target="test-content">
              🔽 UNITAT TEST (Click per toggle)
            </button>
            <div class="nav-tree-content" id="test-content">
              <p>✅ CONTINGUT VISIBLE - Aquest és el contingut que hauria de mostrar-se/amagar-se</p>
              <p>🎯 Si pots veure aquest text, el CSS funciona</p>
              <p>🖱️ Si el botó fa toggle, el JavaScript funciona</p>
            </div>
          </div>
        </div>
      `;
      
      console.log('✅ NavigationTree: HTML mínim renderitzat (DEPRECATED)');
    },

    renderCompleteStructure(structure) {
      const container = document.getElementById('nav-tree');
      if (!container) return;

      console.log('🏗️ NavigationTree: Renderitzant estructura completa...', structure);

      let html = '<div class="nav-tree">';
      
      // Renderitzar cada unitat
      Object.keys(structure).forEach(unitKey => {
        const unitat = structure[unitKey];
        html += this.renderUnitat(unitat, unitKey);
      });
      
      html += '</div>';
      container.innerHTML = html;
      
      console.log('✅ NavigationTree: Estructura completa renderitzada');
      
      // Restaurar estat d'expansió després de renderitzar
      setTimeout(() => {
        this.restoreExpandedState();
      }, 100);
    },

    renderUnitat(unitat, unitKey) {
      const noteCount = unitat.noteCount || 0;
      const hasNotes = noteCount > 0;
      const noteBadge = hasNotes ? `<span class="note-badge">${noteCount}</span>` : '';
      
      let html = `
        <div class="nav-tree-unit ${hasNotes ? 'has-notes' : ''}" data-unit-id="${unitat.id}">
          <div class="nav-tree-unit-header" role="button" tabindex="0">
            <i class="nav-tree-toggle bi bi-chevron-right"></i>
            <i class="unit-icon bi bi-folder"></i>
            <span class="nav-tree-unit-title">${unitat.nom}</span>
            <div class="nav-badges">
              ${noteBadge}
            </div>
          </div>
          <div class="nav-tree-unit-content">
      `;
      
      // Renderitzar blocs de la unitat
      if (unitat.blocs && Object.keys(unitat.blocs).length > 0) {
        Object.keys(unitat.blocs).forEach(blockKey => {
          const bloc = unitat.blocs[blockKey];
          html += this.renderBloc(bloc, blockKey, unitat.id);
        });
      } else {
        html += '<div class="nav-no-blocks">No hi ha blocs disponibles</div>';
      }
      
      html += `
          </div>
        </div>
      `;
      
      return html;
    },

    renderBloc(bloc, blockKey, unitId) {
      const noteCount = bloc.noteCount || 0;
      const hasNotes = noteCount > 0;
      const noteBadge = hasNotes ? `<span class="note-badge">${noteCount}</span>` : '';
      
      let html = `
        <div class="nav-tree-bloc ${hasNotes ? 'has-notes' : ''}" data-bloc-id="${bloc.id}" data-unit-id="${unitId}">
          <div class="nav-tree-bloc-header" role="button" tabindex="0">
            <i class="nav-tree-toggle bi bi-chevron-right"></i>
            <i class="bloc-icon bi bi-folder-open"></i>
            <span class="nav-tree-bloc-title">${bloc.nom}</span>
            <div class="nav-badges">
              ${noteBadge}
            </div>
          </div>
          <div class="nav-tree-bloc-content">
      `;
      
      // Renderitzar seccions del bloc
      if (bloc.seccions && Object.keys(bloc.seccions).length > 0) {
        Object.keys(bloc.seccions).forEach(sectionKey => {
          const seccio = bloc.seccions[sectionKey];
          html += this.renderSeccio(seccio, unitId, bloc.id);
        });
      } else {
        html += '<div class="nav-no-sections">No hi ha seccions disponibles</div>';
      }
      
      html += `
          </div>
        </div>
      `;
      
      return html;
    },

    renderSeccio(seccio, unitId, blocId) {
      const noteCount = seccio.notes?.length || 0;
      const hasNotes = noteCount > 0;
      const noteBadge = hasNotes ? `<span class="note-badge">${noteCount}</span>` : '';
      
      return `
        <div class="nav-tree-section ${hasNotes ? 'has-notes' : ''}" 
             data-section-id="${seccio.id}" 
             data-unit-id="${unitId}" 
             data-bloc-id="${blocId}">
          <div class="nav-tree-section-content" role="button" tabindex="0">
            <i class="section-icon bi bi-file-text"></i>
            <span class="nav-tree-section-title">${seccio.title}</span>
            <div class="nav-tree-section-actions">
              ${noteBadge}
              <button class="btn-add-note" title="Afegir nota">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    },

    renderEmpty() {
      const container = document.getElementById('nav-tree');
      if (!container) return;
      
      container.innerHTML = `
        <div class="nav-tree-empty">
          <i class="bi bi-journal-x"></i>
          <h3>No s'ha trobat contingut</h3>
          <p>No hi ha estructura del curs disponible</p>
        </div>
      `;
    },

    renderError() {
      const container = document.getElementById('nav-tree');
      if (!container) return;
      
      container.innerHTML = `
        <div class="nav-tree-error">
          <i class="bi bi-exclamation-triangle"></i>
          <h3>Error de càrrega</h3>
          <p>No s'ha pogut carregar l'estructura del curs</p>
          <button class="btn btn-outline" onclick="window.Quadern.NavigationTree.init()">
            Tornar a intentar
          </button>
        </div>
      `;
    },

    bindEvents() {
      const container = document.getElementById('nav-tree');
      if (!container) return;

      container.addEventListener('click', (e) => {
        const target = e.target.closest('[role="button"]');
        
        if (target) {
          // Determinar tipus d'element
          if (target.classList.contains('nav-tree-unit-header')) {
            this.toggleUnit(target);
            e.preventDefault();
          } else if (target.classList.contains('nav-tree-bloc-header')) {
            this.toggleBloc(target);
            e.preventDefault();
          } else if (target.classList.contains('nav-tree-section-content')) {
            this.selectSection(target);
            e.preventDefault();
          }
        }
        
        // Gestionar botó afegir nota
        if (e.target.classList.contains('btn-add-note') || 
            e.target.closest('.btn-add-note')) {
          const btn = e.target.closest('.btn-add-note');
          const section = btn.closest('.nav-tree-section');
          this.addNoteToSection(section);
          e.preventDefault();
          e.stopPropagation();
        }
      });
      
      // Suport per teclat
      container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const target = e.target;
          if (target.getAttribute('role') === 'button') {
            target.click();
            e.preventDefault();
          }
        }
      });
      
      console.log('✅ NavigationTree: Events jerarquics configurats');
    },

    toggleUnit(header) {
      const unit = header.closest('.nav-tree-unit');
      const content = unit.querySelector('.nav-tree-unit-content');
      const toggle = header.querySelector('.nav-tree-toggle');
      
      const isExpanded = unit.classList.contains('expanded');
      
      if (isExpanded) {
        unit.classList.remove('expanded');
        content.style.maxHeight = '0';
        content.style.opacity = '0';
        toggle.style.transform = 'rotate(0deg)';
        console.log('➖ NavigationTree: Unitat col·lapsada');
      } else {
        unit.classList.add('expanded');
        content.style.maxHeight = '2000px';
        content.style.opacity = '1';
        toggle.style.transform = 'rotate(90deg)';
        console.log('➕ NavigationTree: Unitat expandida');
      }
      
      // Guardar estat
      this.saveExpandedState();
    },

    toggleBloc(header) {
      const bloc = header.closest('.nav-tree-bloc');
      const content = bloc.querySelector('.nav-tree-bloc-content');
      const toggle = header.querySelector('.nav-tree-toggle');
      
      const isExpanded = bloc.classList.contains('expanded');
      
      if (isExpanded) {
        bloc.classList.remove('expanded');
        content.style.maxHeight = '0';
        content.style.opacity = '0';
        toggle.style.transform = 'rotate(0deg)';
        console.log('➖ NavigationTree: Bloc col·lapsat');
      } else {
        bloc.classList.add('expanded');
        content.style.maxHeight = '1500px';
        content.style.opacity = '1';
        toggle.style.transform = 'rotate(90deg)';
        console.log('➕ NavigationTree: Bloc expandit');
      }
      
      // Guardar estat
      this.saveExpandedState();
    },

    selectSection(sectionContent) {
      const section = sectionContent.closest('.nav-tree-section');
      const sectionId = section.dataset.sectionId;
      const unitId = section.dataset.unitId;
      const blocId = section.dataset.blocId;
      
      console.log(`🎯 NavigationTree: Selecció secció ${sectionId} (U${unitId}/B${blocId})`);
      
      // Treure selecció anterior
      document.querySelectorAll('.nav-tree-section.selected').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Afegir selecció actual
      section.classList.add('selected');
      
      // Connectar amb l'aplicació principal per mostrar notes de la secció
      this._showNotesForSection(sectionId, unitId, blocId, section);
    },

    _showNotesForSection(sectionId, unitId, blocId, sectionElement) {
      console.log(`🎯 NavigationTree: Mostrant notes per secció ${sectionId}`);
      
      // Obtenir notes de la secció des del Discovery
      let sectionNotes = [];
      if (window.Quadern?.Discovery) {
        sectionNotes = window.Quadern.Discovery.getNotesForSection(unitId, blocId, sectionId);
      }
      
      // Obtenir títol de la secció
      const sectionTitle = sectionElement.querySelector('.nav-tree-section-title')?.textContent || 'Secció sense títol';
      
      // Detectar vista actual i actuar en conseqüència
      const currentView = this._getCurrentView();
      const sectionData = {
        sectionId,
        unitId,
        blocId,
        sectionTitle,
        notes: sectionNotes
      };
      
      if (currentView === 'study') {
        // Si estem a vista d'estudi, mostrar notes en format d'estudi
        if (window.Quadern.Study && window.Quadern.Study.showNotesForSection) {
          window.Quadern.Study.showNotesForSection(sectionData);
        }
      } else {
        // Cas per defecte: canviar a editor
        if (window.Quadern?.Navigation) {
          window.Quadern.Navigation.switchView('editor');
          
          setTimeout(() => {
            if (window.Quadern.Editor && window.Quadern.Editor.showNotesForSection) {
              window.Quadern.Editor.showNotesForSection(sectionData);
            }
          }, 200);
        }
      }
    },

    _getCurrentView() {
      // Determinar vista activa
      const activeView = document.querySelector('.view.active');
      if (activeView) {
        return activeView.id.replace('-view', '');
      }
      return 'dashboard'; // per defecte
    },

    addNoteToSection(section) {
      const sectionId = section.dataset.sectionId;
      const unitId = section.dataset.unitId;
      const blocId = section.dataset.blocId;
      
      console.log(`➕ NavigationTree: Afegir nota a secció ${sectionId}`);
      
      // Primer seleccionar la secció per mostrar les notes existents
      const sectionContent = section.querySelector('.nav-tree-section-content');
      if (sectionContent) {
        this.selectSection(sectionContent);
        
        // Després crear una nova nota per aquesta secció
        setTimeout(() => {
          if (window.Quadern?.Editor && window.Quadern.Editor.createNoteForSection) {
            window.Quadern.Editor.createNoteForSection();
          }
        }, 300);
      }
    },

    saveExpandedState() {
      // Guardar estat d'expansió a localStorage
      const expandedUnits = [];
      const expandedBlocs = [];
      
      document.querySelectorAll('.nav-tree-unit.expanded').forEach(unit => {
        expandedUnits.push(unit.dataset.unitId);
      });
      
      document.querySelectorAll('.nav-tree-bloc.expanded').forEach(bloc => {
        expandedBlocs.push(`${bloc.dataset.unitId}-${bloc.dataset.blocId}`);
      });
      
      localStorage.setItem('quadern-navigation-expanded', JSON.stringify({
        units: expandedUnits,
        blocs: expandedBlocs
      }));
    },

    restoreExpandedState() {
      try {
        const saved = localStorage.getItem('quadern-navigation-expanded');
        if (!saved) return;
        
        const state = JSON.parse(saved);
        
        // Restaurar unitats expandides
        state.units?.forEach(unitId => {
          const unit = document.querySelector(`[data-unit-id="${unitId}"]`);
          if (unit) {
            const header = unit.querySelector('.nav-tree-unit-header');
            if (header) this.toggleUnit(header);
          }
        });
        
        // Restaurar blocs expandits
        state.blocs?.forEach(blocKey => {
          const [unitId, blocId] = blocKey.split('-');
          const bloc = document.querySelector(`[data-unit-id="${unitId}"][data-bloc-id="${blocId}"]`);
          if (bloc) {
            const header = bloc.querySelector('.nav-tree-bloc-header');
            if (header) this.toggleBloc(header);
          }
        });
        
        console.log('✅ NavigationTree: Estat expandit restaurat');
      } catch (error) {
        console.warn('🟡 NavigationTree: Error restaurant estat:', error);
      }
    }
  };

  // Exposar al namespace global
  window.Quadern = window.Quadern || {};
  window.Quadern.NavigationTree = NavigationTree;

})();