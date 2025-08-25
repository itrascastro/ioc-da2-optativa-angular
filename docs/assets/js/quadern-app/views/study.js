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
    // INTEGRACIÓ AMB NAVIGATION TREE
    // =============================

    showNotesForSection(sectionData) {
      console.log('📚 Study: Mostrant notes d\'estudi per secció:', sectionData);
      
      const { sectionId, unitId, blocId, sectionTitle, notes } = sectionData;
      
      // Actualitzar header amb informació de la secció
      const header = document.querySelector('.study-header h2');
      if (header) {
        header.textContent = `Estudi: ${sectionTitle}`;
      }
      
      // Mostrar les notes en format d'estudi
      this._displayStudyNotes(notes, sectionData);
      
      // Guardar context actual
      this.currentSection = sectionData;
    },

    _displayStudyNotes(notes, sectionData) {
      const studyBody = document.getElementById('study-body');
      if (!studyBody) return;
      
      if (notes.length === 0) {
        studyBody.innerHTML = `
          <div class="empty-state">
            <i class="bi bi-book"></i>
            <h3>No hi ha notes per mostrar</h3>
            <p>Crea algunes notes per ${sectionData.sectionTitle} per veure-les en format d'estudi.</p>
            <button class="btn btn-primary" onclick="window.Quadern.Events.emit('switch-view', 'editor')">
              <i class="bi bi-plus"></i>
              Crear primera nota
            </button>
          </div>
        `;
        return;
      }
      
      let html = `
        <div class="study-section">
          <div class="study-section-header">
            <h1>${sectionData.sectionTitle}</h1>
            <p class="section-meta">Unitat ${sectionData.unitId} - Bloc ${sectionData.blocId} • ${notes.length} ${notes.length === 1 ? 'nota' : 'notes'}</p>
          </div>
          <div class="study-notes">
      `;
      
      notes.forEach((note, index) => {
        html += this._renderStudyNote(note, index + 1);
      });
      
      html += `
          </div>
        </div>
      `;
      
      studyBody.innerHTML = html;
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
      if (!this.currentSection || !this.currentSection.notes.length) {
        alert('No hi ha contingut per exportar');
        return;
      }

      // Crear contingut per exportar
      let content = `# Estudi: ${this.currentSection.sectionTitle}\n\n`;
      content += `**Unitat ${this.currentSection.unitId} - Bloc ${this.currentSection.blocId}**\n\n`;
      
      this.currentSection.notes.forEach((note, index) => {
        content += `## ${index + 1}. ${note.noteTitle || 'Sense títol'}\n\n`;
        content += `${note.content || 'Contingut buit'}\n\n`;
        if (note.tags && note.tags.length) {
          content += `*Etiquetes: ${note.tags.join(', ')}*\n\n`;
        }
        content += '---\n\n';
      });

      // Descarregar com a fitxer
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estudi-${this.currentSection.sectionId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },

    refreshData() {
      // Recarregar notes de la secció actual si n'hi ha una
      if (this.currentSection) {
        // Obtenir notes actualitzades
        let updatedNotes = [];
        if (window.Quadern?.Discovery) {
          updatedNotes = window.Quadern.Discovery.getNotesForSection(
            this.currentSection.unitId, 
            this.currentSection.blocId, 
            this.currentSection.sectionId
          );
        }
        
        this.showNotesForSection({
          ...this.currentSection,
          notes: updatedNotes
        });
      }
    }
  };

  window.Quadern = window.Quadern || {};
  window.Quadern.Study = Study;

})();