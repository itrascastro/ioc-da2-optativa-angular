/*
  Quadern de Notes - Vista Dashboard
  Gestió de la pàgina principal amb estadístiques i notes recents
*/

;(function() {
  'use strict';

  const Dashboard = {
    app: null,
    _tagFilter: null,

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

      // Aplicar filtre per etiqueta si cal
      let filtered = notes;
      if (this._tagFilter && this._tagFilter.length) {
        const set = new Set(this._tagFilter.map(t=>t.toLowerCase()));
        filtered = notes.filter(n => (n.tags||[]).some(t => set.has(String(t).toLowerCase())));
      }

      const recentNotes = filtered
        .filter(note => note.content && note.content.trim()) // Només notes amb contingut
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 100); // mostrarem scroll per veure més, però limitem per rendiment

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

      // Construir vista timeline agrupada per data relativa
      const groups = this._groupByRelativeDate(recentNotes);
      container.innerHTML = `
        <div class="timeline" aria-label="Línia de temps de notes">
          ${groups.map(g => `
            <section class="date-group">
              <div class="date-marker" aria-hidden="true"></div>
              <h4 class="date-title">${g.title}</h4>
              <div class="date-notes">
                ${g.items.map(n => this._renderRecentNoteCard(n)).join('')}
              </div>
            </section>
          `).join('')}
        </div>
      `;
    },
    _groupByRelativeDate(notes){
      const today = new Date();
      const isSameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
      const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
      const groupsMap = new Map();
      const pushTo = (key, note) => { if(!groupsMap.has(key)) groupsMap.set(key, []); groupsMap.get(key).push(note); };
      notes.forEach(n=>{
        const d = new Date(n.updatedAt || n.createdAt);
        if (isSameDay(d, today)) pushTo('Avui', n);
        else if (isSameDay(d, yesterday)) pushTo('Ahir', n);
        else pushTo(d.toLocaleDateString('ca-ES', { weekday:'long', day:'2-digit', month:'short', year:'numeric' }), n);
      });
      return Array.from(groupsMap.entries()).map(([title, items])=>({title, items}));
    },
    _renderRecentNoteCard(note) {
      const tags = (note.tags||[]).map(t=>`<span class="tag">#${t}</span>`).join(' ');
      const time = this._formatDate(note.updatedAt || note.createdAt);
      const title = this._escapeHtml(note.noteTitle || 'Sense títol');
      const preview = this._getContentPreview(note.content || '', 180);
      return `
        <div class="recent-note-card" data-note-id="${note.id}">
          <div class="card-head">
            <div class="title">${title}</div>
            <div class="time">${time}</div>
          </div>
          <div class="location">${this._formatLocationLinks(note)}</div>
          ${preview ? `<div class="preview">${this._escapeHtml(preview)}</div>` : ''}
          ${tags ? `<div class="meta">${tags}</div>` : ''}
          <div class="actions">
            <button class="btn-icon" title="Editar" data-action="edit-note" data-note-id="${note.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn-icon btn-danger" title="Eliminar" data-action="delete-note" data-note-id="${note.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    },
    _formatLocationLinks(note) {
      const base = (document.body.getAttribute('data-baseurl')||'');
      const unit = (note.unitat ? Number(note.unitat) : null);
      const bloc = (note.bloc ? Number(note.bloc) : null);
      const pageUrl = note.pageUrl || '';
      const sectionId = note.sectionId || '';
      const rawSectionTitle = note.sectionTitle || (sectionId ? ('Secció ' + sectionId) : 'Secció');
      const sectionTitle = this._escapeHtml(this._cleanSectionTitle(rawSectionTitle));
      const unitHref = unit ? `${base}/unitat-${unit}/` : null;
      const blocHref = pageUrl || null;
      const sectHref = sectionId && pageUrl ? `${pageUrl}#${sectionId}` : (pageUrl || '#');
      const parts = [];
      if (unitHref) parts.push(`<a href="${unitHref}">Unitat ${unit}</a>`); else if (unit) parts.push(`Unitat ${unit}`);
      if (blocHref && bloc) parts.push(`<a href="${blocHref}">Bloc ${bloc}</a>`);
      if (sectHref) parts.push(`<a href="${sectHref}">${sectionTitle || 'Secció'}</a>`);
      return parts.join(' <span class="sep">&gt;</span> ');
    },
    _cleanSectionTitle(title) {
      if (!title) return '';
      // Neteja números de comptadors al final, p.ex. "Secció X 3" o "Secció X (3)"
      return String(title)
        .replace(/\s*(?:\(\d+\)|\[\d+\]|\d+)\s*$/, '')
        .trim();
    },
    _bindEvents() {
      const container = document.getElementById('recent-notes');
      if (!container) return;
      container.addEventListener('click', (e)=>{
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const noteId = btn.getAttribute('data-note-id');
        if (action === 'edit-note') {
          this._editNote(noteId);
        } else if (action === 'delete-note') {
          this._deleteNote(noteId);
        } else if (action === 'open-filter') {
          this._openFilterModal();
        } else if (action === 'create-note') {
          this._createNewNote();
        }
      });
      // Click en targeta completa para editar
      container.addEventListener('click', (e)=>{
        if (e.target.closest('[data-action]')) return; // ya gestionado por botones
        const card = e.target.closest('.recent-note-card');
        if (!card) return;
        const noteId = card.getAttribute('data-note-id');
        if (noteId) this._editNote(noteId);
      });
      // Delegació: botons de la capçalera (fora de recent-notes)
      const listCard = container.closest('.card');
      if (listCard) {
        listCard.addEventListener('click', (e)=>{
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          const action = btn.getAttribute('data-action');
          if (action === 'open-filter') this._openFilterModal();
          if (action === 'create-note') this._createNewNote();
        });
      }
    },
    _openFilterModal(){
      const tagCounts = this._extractTags(this._getAllNotesSync());
      const tags = Object.entries(tagCounts).sort((a,b)=> b[1]-a[1]);
      const content = `
        <div class="filter-modal">
          <input type="text" id="filter-search" placeholder="Cerca etiqueta..." class="input" style="width:100%;margin-bottom:10px;" />
          <div class="filter-tags" style="max-height:260px; overflow:auto; display:flex; flex-direction:column; gap:6px;">
            ${tags.map(([tag,count])=>`
              <label style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" class="filter-tag" value="${tag}" ${this._tagFilter?.includes(tag)?'checked':''} />
                <span>#${tag}</span>
                <span style="margin-left:auto; opacity:.7;">${count}</span>
              </label>
            `).join('')}
          </div>
        </div>`;
      const modal = window.Quadern?.Components?.showModal
        ? window.Quadern.Components.showModal('Filtrar per etiqueta', content, [
            { text: 'Netejar', action: 'clear', class: 'btn-secondary' },
            { text: 'Aplicar', action: 'apply', class: 'btn-primary' }
          ])
        : null;
      if (!modal) return;
      modal.addEventListener('click', (e)=>{
        const act = e.target?.dataset?.action;
        if (!act) return;
        if (act === 'clear') { this._tagFilter = null; this.loadData(); }
        if (act === 'apply') {
          const selected = Array.from(modal.querySelectorAll('.filter-tag:checked')).map(i=>i.value);
          this._tagFilter = selected;
          this.loadData();
        }
      });
      // Filtre per text
      const search = modal.querySelector('#filter-search');
      if (search) {
        search.addEventListener('input', ()=>{
          const q = search.value.toLowerCase();
          modal.querySelectorAll('.filter-tag').forEach(cb => {
            const row = cb.closest('label');
            row.style.display = cb.value.toLowerCase().includes(q) ? '' : 'none';
          });
        });
      }
    },
    _getAllNotesSync(){
      if (window.Quadern && window.Quadern.Store) {
        const state = window.Quadern.Store.load();
        return Object.values(state.notes.byId || {});
      }
      return [];
    },
    _editNote(noteId){
      if (!noteId) return;
      if (this.app && this.app.switchView) {
        this.app.switchView('editor');
        setTimeout(()=>{
          if (this.app.modules.editor && this.app.modules.editor.selectNote) {
            this.app.modules.editor.selectNote(noteId);
          }
        }, 50);
      }
    },
    _deleteNote(noteId){
      if (!noteId) return;
      const doDelete = () => {
        try {
          const state = window.Quadern.Store.load();
          window.Quadern.Store.deleteNote(state, noteId);
          window.Quadern.Store.save(state);
          this.loadData();
          if (this.app.refreshData) this.app.refreshData();
        } catch (e) { console.error(e); }
      };
      if (window.Quadern?.Components?.showConfirmDialog) {
        window.Quadern.Components.showConfirmDialog('Eliminar aquesta nota?', doDelete);
      } else {
        if (confirm('Eliminar aquesta nota?')) doDelete();
      }
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
      
      // Obtenir estadístiques reals del curs des de Discovery
      let courseStats = { unitats: 0, blocs: 0, seccions: 0 };
      if (window.Quadern?.Discovery) {
        const realStats = window.Quadern.Discovery.getStructureStats();
        if (realStats) {
          courseStats = realStats;
        }
      }
      
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
        units: courseStats.unitats,        // Unitats reals del curs
        blocks: courseStats.blocs,         // Blocs reals del curs
        sections: courseStats.seccions,    // Seccions reals del curs
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

    onViewActivated() {
      this.loadData();
    },

    refreshData() {
      this.loadData();
    }
  };

  // Exposar al namespace
  window.Quadern = window.Quadern || {};
  window.Quadern.Dashboard = Dashboard;

})();
