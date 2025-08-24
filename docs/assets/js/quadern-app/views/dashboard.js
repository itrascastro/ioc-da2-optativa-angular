/*
  Quadern de Notes - Vista Dashboard
  Gestió de la pàgina principal amb estadístiques i notes recents
*/

;(function() {
  'use strict';

  const Dashboard = {
    app: null,

    // =============================
    // INICIALITZACIÓ
    // =============================

    init(app) {
      this.app = app;
      console.log('📊 Dashboard: Inicialitzant vista dashboard...');
      this._bindEvents();
      console.log('✅ Dashboard: Vista inicialitzada');
    },

    _bindEvents() {
      // Els esdeveniments globals ja es gestionen a events.js
      // Aquí només els específics del dashboard
    },

    // =============================
    // CÀRREGA DE DADES
    // =============================

    async loadData() {
      try {
        console.log('📊 Dashboard: Carregant dades...');
        
        const notes = await this._getAllNotes();
        
        this._updateRecentNotes(notes);
        this._updateDashboardStats(notes);
        this._updatePopularTags(notes);
        this._updateActivityChart(notes);
        
      } catch (error) {
        console.error('❌ Dashboard: Error carregant dades:', error);
        this._showToast('Error carregant les dades', 'error');
      }
    },

    async _getAllNotes() {
      // Usar el store per obtenir totes les notes
      if (window.Quadern && window.Quadern.Store) {
        const state = window.Quadern.Store.load();
        return Object.values(state.notes.byId || {});
      }
      return [];
    },

    // =============================
    // NOTES RECENTS
    // =============================

    _updateRecentNotes(notes) {
      const container = document.getElementById('recent-notes');
      if (!container) return;

      const recentNotes = notes
        .filter(note => note.content && note.content.trim()) // Només notes amb contingut
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, this.app.config.maxRecentNotes);

      if (recentNotes.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <i class="bi bi-journal-text"></i>
            </div>
            <h3>Encara no tens notes</h3>
            <p>Crea la teva primera nota per començar!</p>
            <button class="btn btn-primary" data-action="create-note">
              <i class="bi bi-plus"></i> Crear Nova Nota
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="recent-notes-header">
          <h3>Notes Recents</h3>
          <a href="#" class="view-all-link" data-action="view-all-notes">Veure totes</a>
        </div>
        <div class="recent-notes-list">
          ${recentNotes.map(note => this._renderRecentNoteItem(note)).join('')}
        </div>
      `;
    },

    _renderRecentNoteItem(note) {
      return `
        <div class="recent-note-item" data-note-id="${note.id}">
          <div class="recent-note-content">
            <div class="recent-note-title">${this._escapeHtml(note.noteTitle || 'Sense títol')}</div>
            <div class="recent-note-preview">${this._getContentPreview(note.content)}</div>
            <div class="recent-note-meta">
              <span class="location">${this._formatLocation(note)}</span>
              <span class="separator">•</span>
              <span class="date">${this._formatDate(note.updatedAt || note.createdAt)}</span>
              ${note.tags && note.tags.length > 0 ? `
                <span class="separator">•</span>
                <div class="tags-preview">
                  ${note.tags.slice(0, 2).map(tag => `<span class="tag">#${tag}</span>`).join(' ')}
                  ${note.tags.length > 2 ? `<span class="tag-count">+${note.tags.length - 2}</span>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
          <div class="recent-note-actions">
            <button class="btn-icon" title="Editar" data-action="edit-note" data-note-id="${note.id}">
              <i class="bi bi-pencil"></i>
            </button>
          </div>
        </div>
      `;
    },

    // =============================
    // ESTADÍSTIQUES
    // =============================

    _updateDashboardStats(notes) {
      const stats = this._calculateStats(notes);
      
      // Actualitzar widgets d'estadístiques
      this._updateStatWidget('stat-total-notes', stats.totalNotes, 'notes');
      this._updateStatWidget('stat-units', stats.units, 'unitats');
      this._updateStatWidget('stat-blocks', stats.blocks, 'blocs');
      this._updateStatWidget('stat-storage', stats.storageSize, '');
      
      // Última edició
      const lastEditEl = document.getElementById('stat-last-edit');
      if (lastEditEl) {
        lastEditEl.textContent = stats.lastEdit;
      }

      // Actualitzar barra de progres si existeix
      this._updateProgressIndicators(stats);
    },

    _calculateStats(notes) {
      const notesWithContent = notes.filter(n => n.content && n.content.trim());
      
      // Unitats úniques
      const units = new Set(notesWithContent.map(n => n.unitat).filter(u => u != null));
      
      // Blocs únics
      const blocks = new Set(notesWithContent.map(n => `${n.unitat}-${n.bloc}`).filter(b => !b.includes('undefined')));
      
      // Última edició
      let lastEdit = 'Mai';
      if (notesWithContent.length > 0) {
        const lastEditDate = notesWithContent.reduce((latest, note) => {
          const noteDate = new Date(note.updatedAt || note.createdAt);
          return noteDate > latest ? noteDate : latest;
        }, new Date(0));
        lastEdit = this._formatDate(lastEditDate.toISOString());
      }
      
      // Mida d'emmagatzematge
      const storageSize = this._calculateStorageSize(notesWithContent);
      
      return {
        totalNotes: notesWithContent.length,
        units: units.size,
        blocks: blocks.size,
        lastEdit,
        storageSize,
        allNotes: notes.length // Inclou notes buides
      };
    },

    _updateStatWidget(elementId, value, unit) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = `${value}${unit ? ' ' + unit : ''}`;
      }
    },

    _updateProgressIndicators(stats) {
      // Actualitzar indicadors de progrés per unitats/blocs si existeixen
      const progressContainer = document.getElementById('progress-indicators');
      if (!progressContainer) return;

      // Això es pot expandir per mostrar progrés per unitat
      const completion = stats.blocks > 0 ? Math.round((stats.totalNotes / stats.blocks) * 100) : 0;
      progressContainer.innerHTML = `
        <div class="progress-item">
          <div class="progress-label">Completitud de Notes</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(completion, 100)}%"></div>
          </div>
          <div class="progress-value">${Math.min(completion, 100)}%</div>
        </div>
      `;
    },

    // =============================
    // ETIQUETES POPULARS
    // =============================

    _updatePopularTags(notes) {
      const container = document.getElementById('popular-tags');
      if (!container) return;

      const tagCounts = this._extractTags(notes);
      const popularTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);

      if (popularTags.length === 0) {
        container.innerHTML = `
          <div class="empty-tags">
            <p>No hi ha etiquetes encara. Afegeix #etiquetes a les teves notes!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="popular-tags-header">
          <h3>Etiquetes Populars</h3>
        </div>
        <div class="tags-cloud">
          ${popularTags.map(([tag, count]) => `
            <button class="tag-item" data-tag="${tag}" data-count="${count}">
              #${tag}
              <span class="tag-count">${count}</span>
            </button>
          `).join('')}
        </div>
      `;
    },

    _extractTags(notes) {
      const tagCounts = {};
      
      notes.forEach(note => {
        // Etiquetes del camp tags
        if (note.tags && Array.isArray(note.tags)) {
          note.tags.forEach(tag => {
            const cleanTag = tag.toLowerCase().trim();
            if (cleanTag) {
              tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
            }
          });
        }
        
        // Hashtags en el contingut
        const content = note.content || '';
        const hashtags = content.match(/#[\w\u00C0-\u017F]+/g) || [];
        hashtags.forEach(tag => {
          const cleanTag = tag.slice(1).toLowerCase();
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        });
      });
      
      return tagCounts;
    },

    // =============================
    // GRÀFIC D'ACTIVITAT
    // =============================

    _updateActivityChart(notes) {
      const container = document.getElementById('activity-chart');
      if (!container) return;

      const activityData = this._calculateActivityData(notes);
      this._renderActivityChart(container, activityData);
    },

    _calculateActivityData(notes) {
      const last7Days = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const count = notes.filter(note => {
          const noteDate = new Date(note.createdAt || note.updatedAt);
          return noteDate.toISOString().split('T')[0] === dateStr;
        }).length;
        
        last7Days.push({
          date: dateStr,
          count,
          label: this._formatShortDate(date)
        });
      }
      
      return last7Days;
    },

    _renderActivityChart(container, data) {
      const maxCount = Math.max(...data.map(d => d.count), 1);
      
      container.innerHTML = `
        <div class="activity-chart-header">
          <h3>Activitat dels Últims 7 Dies</h3>
        </div>
        <div class="activity-bars">
          ${data.map(day => `
            <div class="activity-bar" data-date="${day.date}" data-count="${day.count}">
              <div class="bar-fill" style="height: ${(day.count / maxCount) * 100}%"></div>
              <div class="bar-label">${day.label}</div>
              <div class="bar-count">${day.count}</div>
            </div>
          `).join('')}
        </div>
      `;
    },

    // =============================
    // ACCIONS RÀPIDES
    // =============================

    handleQuickAction(action) {
      switch(action) {
        case 'create-note':
          this._createNewNote();
          break;
        case 'view-all-notes':
          this._viewAllNotes();
          break;
        case 'export-notes':
          this._exportNotes();
          break;
        case 'import-notes':
          this._importNotes();
          break;
        default:
          console.warn('Dashboard: Acció desconeguda:', action);
      }
    },

    _createNewNote() {
      if (this.app && this.app.switchView) {
        this.app.switchView('editor');
        // Crear nova nota a l'editor
        setTimeout(() => {
          if (this.app.modules.editor && this.app.modules.editor.createNewNote) {
            this.app.modules.editor.createNewNote();
          }
        }, 100);
      }
    },

    _viewAllNotes() {
      if (this.app && this.app.switchView) {
        this.app.switchView('search');
      }
    },

    _exportNotes() {
      if (this.app && this.app.switchView) {
        this.app.switchView('import-export');
      }
    },

    _importNotes() {
      if (this.app && this.app.switchView) {
        this.app.switchView('import-export');
      }
    },

    // =============================
    // UTILITATS
    // =============================

    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    _getContentPreview(content, maxLength = 150) {
      if (!content) return 'Sense contingut';
      
      // Netejar markdown/html bàsic
      const clean = content
        .replace(/#+\s*/g, '') // Headers markdown
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
        .replace(/\*(.*?)\*/g, '$1') // Italic
        .replace(/`(.*?)`/g, '$1') // Inline code
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
      } else if (note.sectionTitle) {
        return note.sectionTitle;
      }
      return 'Ubicació desconeguda';
    },

    _formatDate(dateStr) {
      if (!dateStr) return 'Data desconeguda';
      
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Ara mateix';
      if (diffMins < 60) return `fa ${diffMins} min`;
      if (diffHours < 24) return `fa ${diffHours}h`;
      if (diffDays < 7) return `fa ${diffDays} dies`;
      
      return date.toLocaleDateString('ca-ES');
    },

    _formatShortDate(date) {
      const days = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'];
      return days[date.getDay()];
    },

    _calculateStorageSize(notes) {
      const totalChars = notes.reduce((sum, note) => {
        return sum + (note.content || '').length + (note.noteTitle || '').length;
      }, 0);
      
      const bytes = totalChars * 2; // Aproximació UTF-16
      
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
      return `${Math.round(bytes / 1048576 * 10) / 10} MB`;
    },

    _showToast(message, type = 'info') {
      if (this.app.modules.components && this.app.modules.components.showToast) {
        this.app.modules.components.showToast(message, type);
      }
    },

    // =============================
    // API PÚBLICA
    // =============================

    refreshData() {
      this.loadData();
    }
  };

  // Exposar al namespace
  window.Quadern = window.Quadern || {};
  window.Quadern.Dashboard = Dashboard;

})();