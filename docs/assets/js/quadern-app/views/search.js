/*
  Quadern de Notes - Vista Cerca
  Sistema de cerca i filtres avançats
*/

;(function() {
  'use strict';

  const Search = {
    app: null,
    currentResults: [],
    currentFilters: {},

    init(app) {
      this.app = app;
      console.log('🔍 Search: Inicialitzant vista cerca...');
      this._bindEvents();
      console.log('✅ Search: Vista inicialitzada');
    },

    _bindEvents() {
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

    performGlobalSearch(query) {
      console.log('🔍 Search: Cercant:', query);
      this._searchNotes(query);
    },

    async _searchNotes(query) {
      if (window.Quadern && window.Quadern.Store) {
        const state = window.Quadern.Store.load();
        const notes = Object.values(state.notes.byId || {});
        
        const results = notes.filter(note => {
          const searchText = `${note.noteTitle || ''} ${note.content || ''} ${(note.tags || []).join(' ')}`.toLowerCase();
          return searchText.includes(query.toLowerCase());
        });

        this.currentResults = results;
        this._displayResults(results, query);
      }
    },

    _applySearchFilters() {
      // Implementació simplificada
      console.log('🔍 Search: Aplicant filtres');
    },

    _clearSearchFilters() {
      console.log('🔍 Search: Netejant filtres');
      this.currentFilters = {};
    },

    _toggleResultsView(view) {
      console.log('🔍 Search: Canviant vista resultats:', view);
    },

    _displayResults(results, query) {
      const container = document.getElementById('search-results');
      if (!container) return;

      if (results.length === 0) {
        container.innerHTML = `
          <div class="search-empty">
            <i class="bi bi-search"></i>
            <h3>Cap resultat per "${query}"</h3>
            <p>Prova amb altres paraules clau</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="search-header">
          <h3>${results.length} resultats per "${query}"</h3>
        </div>
        <div class="search-results-list">
          ${results.map(note => this._renderSearchResult(note, query)).join('')}
        </div>
      `;
    },

    _renderSearchResult(note, query) {
      return `
        <div class="search-result-item" data-note-id="${note.id}">
          <div class="result-title">${this._escapeHtml(note.noteTitle || 'Sense títol')}</div>
          <div class="result-preview">${this._getContentPreview(note.content, 200)}</div>
          <div class="result-meta">
            <span class="result-location">${this._formatLocation(note)}</span>
            <span class="result-date">${this._formatDate(note.updatedAt || note.createdAt)}</span>
          </div>
        </div>
      `;
    },

    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    },

    _getContentPreview(content, maxLength = 200) {
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
      return date.toLocaleDateString('ca-ES');
    },

    refreshData() {
      // Refrescar resultats si cal
    }
  };

  window.Quadern = window.Quadern || {};
  window.Quadern.Search = Search;

})();