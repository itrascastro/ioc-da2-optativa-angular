/*
  Quadern de Notes - Vista Estudi
  Mode d'estudi i repàs de notes
*/

;(function() {
  'use strict';

  const Study = {
    app: null,
    currentSection: null,

    init(app) {
      this.app = app;
      console.log('📚 Study: Inicialitzant vista d\'estudi...');
      this._bindEvents();
      console.log('✅ Study: Vista inicialitzada');
    },

    // Mètode cridat quan s'activa la vista d'estudi
    onViewActivated() {
      console.log('📚 Study: Vista activada - carregant totes les notes');
      this.loadAllNotes();
    },

    _bindEvents() {
      // Esdeveniment per print
      const printBtn = document.getElementById('print-study');
      if (printBtn) {
        printBtn.addEventListener('click', () => this._printStudy());
      }

      // Esdeveniment per exportar
      const exportBtn = document.getElementById('export-study');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this._exportStudy());
      }
    },

    // =============================
    // CÀRREGA DE TOTES LES NOTES
    // =============================

    loadAllNotes() {
      console.log('📚 Study: Carregant totes les notes del curs');
      
      // Actualitzar header
      const header = document.querySelector('.study-header h2');
      if (header) {
        header.textContent = 'Vista d\'Estudi del Curs';
      }
      
      // Obtenir totes les notes
      let allNotes = [];
      if (window.Quadern?.Store) {
        const state = window.Quadern.Store.load();
        allNotes = Object.values(state.notes.byId || {});
      }
      
      // Organitzar per estructura del curs
      const organizedNotes = this._organizeNotesByStructure(allNotes);
      
      // Mostrar en format d'estudi
      this._displayAllNotes(organizedNotes, allNotes.length);
    },

    _organizeNotesByStructure(allNotes) {
      const organized = {};
      
      allNotes.forEach(note => {
        const unitKey = `unitat-${note.unitat || 'sense'}`;
        const blocKey = `bloc-${note.bloc || 'sense'}`;
        
        if (!organized[unitKey]) {
          organized[unitKey] = {
            id: note.unitat || 0,
            nom: `Unitat ${note.unitat || '?'}`,
            blocs: {}
          };
        }
        
        if (!organized[unitKey].blocs[blocKey]) {
          organized[unitKey].blocs[blocKey] = {
            id: note.bloc || 0,
            nom: `Bloc ${note.bloc || '?'}`,
            seccions: {}
          };
        }
        
        const sectionKey = note.sectionId || 'sense-seccio';
        if (!organized[unitKey].blocs[blocKey].seccions[sectionKey]) {
          organized[unitKey].blocs[blocKey].seccions[sectionKey] = {
            id: sectionKey,
            title: note.sectionTitle || 'Sense títol de secció',
            notes: []
          };
        }
        
        organized[unitKey].blocs[blocKey].seccions[sectionKey].notes.push(note);
      });
      
      return organized;
    },

    _displayAllNotes(organizedNotes, totalCount) {
      const studyBody = document.getElementById('study-body');
      if (!studyBody) return;
      
      if (totalCount === 0) {
        studyBody.innerHTML = `
          <div class="empty-state">
            <i class="bi bi-book"></i>
            <h3>No hi ha notes per mostrar</h3>
            <p>Crea algunes notes per veure-les en format d'estudi.</p>
            <button class="btn btn-primary" onclick="window.Quadern.Navigation.switchView('editor')">
              <i class="bi bi-plus"></i>
              Crear primera nota
            </button>
          </div>
        `;
        return;
      }
      
      let html = `
        <div class="study-course">
          <div class="study-course-header">
            <h1>Totes les Notes del Curs</h1>
            <p class="course-meta">${totalCount} ${totalCount === 1 ? 'nota' : 'notes'} disponibles per estudiar</p>
          </div>
          <div class="study-units">
      `;
      
      // Renderitzar per unitats
      Object.keys(organizedNotes).forEach(unitKey => {
        const unitat = organizedNotes[unitKey];
        html += this._renderStudyUnit(unitat);
      });
      
      html += `
          </div>
        </div>
      `;
      
      studyBody.innerHTML = html;
    },

    _renderStudyUnit(unitat) {
      let html = `
        <div class="study-unit">
          <div class="study-unit-header">
            <h2>${unitat.nom}</h2>
          </div>
          <div class="study-unit-content">
      `;
      
      // Renderitzar blocs de la unitat
      Object.keys(unitat.blocs).forEach(blocKey => {
        const bloc = unitat.blocs[blocKey];
        html += this._renderStudyBlock(bloc);
      });
      
      html += `
          </div>
        </div>
      `;
      
      return html;
    },

    _renderStudyBlock(bloc) {
      let html = `
        <div class="study-block">
          <div class="study-block-header">
            <h3>${bloc.nom}</h3>
          </div>
          <div class="study-block-content">
      `;
      
      // Renderitzar seccions del bloc
      Object.keys(bloc.seccions).forEach(sectionKey => {
        const seccio = bloc.seccions[sectionKey];
        html += this._renderStudySection(seccio);
      });
      
      html += `
          </div>
        </div>
      `;
      
      return html;
    },

    _renderStudySection(seccio) {
      let html = `
        <div class="study-section">
          <div class="study-section-header">
            <h4>${seccio.title}</h4>
            <p class="section-meta">${seccio.notes.length} ${seccio.notes.length === 1 ? 'nota' : 'notes'}</p>
          </div>
          <div class="study-notes">
      `;
      
      // Renderitzar notes de la secció
      seccio.notes.forEach((note, index) => {
        html += this._renderStudyNote(note, index + 1);
      });
      
      html += `
          </div>
        </div>
      `;
      
      return html;
    },

    _renderStudyNote(note, index) {
      const createdDate = new Date(note.createdAt).toLocaleDateString('ca-ES');
      const tags = note.tags && note.tags.length > 0 ? 
        note.tags.map(tag => `<span class="study-tag">${tag}</span>`).join('') : '';

      return `
        <div class="study-note" data-note-id="${note.id}">
          <div class="study-note-header">
            <div class="study-note-number">${index}</div>
            <div class="study-note-meta">
              <h3 class="study-note-title">${note.noteTitle || 'Sense títol'}</h3>
              <div class="study-note-info">
                <span class="study-date">Creat: ${createdDate}</span>
                ${tags}
              </div>
            </div>
          </div>
          <div class="study-note-content">
            ${note.content || '<p><em>Contingut buit</em></p>'}
          </div>
        </div>
      `;
    },

    _printStudy() {
      console.log('📚 Study: Imprimint vista d\'estudi');
      window.print();
    },

    _exportStudy() {
      console.log('📚 Study: Exportant vista d\'estudi');
      
      // Obtenir totes les notes
      let allNotes = [];
      if (window.Quadern?.Store) {
        const state = window.Quadern.Store.load();
        allNotes = Object.values(state.notes.byId || {});
      }
      
      if (allNotes.length === 0) {
        alert('No hi ha notes per exportar');
        return;
      }

      // Crear contingut per exportar
      let content = `# Notes d'Estudi - Curs Complet\n\n`;
      content += `**Total: ${allNotes.length} notes**\n\n`;
      
      // Organitzar per estructura
      const organized = this._organizeNotesByStructure(allNotes);
      
      Object.keys(organized).forEach(unitKey => {
        const unitat = organized[unitKey];
        content += `# ${unitat.nom}\n\n`;
        
        Object.keys(unitat.blocs).forEach(blocKey => {
          const bloc = unitat.blocs[blocKey];
          content += `## ${bloc.nom}\n\n`;
          
          Object.keys(bloc.seccions).forEach(sectionKey => {
            const seccio = bloc.seccions[sectionKey];
            content += `### ${seccio.title}\n\n`;
            
            seccio.notes.forEach((note, index) => {
              content += `#### ${index + 1}. ${note.noteTitle || 'Sense títol'}\n\n`;
              content += `${note.content || 'Contingut buit'}\n\n`;
              if (note.tags && note.tags.length) {
                content += `*Etiquetes: ${note.tags.join(', ')}*\n\n`;
              }
              content += '---\n\n';
            });
          });
        });
      });

      // Descarregar com a fitxer
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estudi-curs-complet.md`;
      a.click();
      URL.revokeObjectURL(url);
    },

    refreshData() {
      // Recarregar totes les notes
      console.log('📚 Study: Refrescant dades - recarregant totes les notes');
      this.loadAllNotes();
    }
  };

  window.Quadern = window.Quadern || {};
  window.Quadern.Study = Study;

})();