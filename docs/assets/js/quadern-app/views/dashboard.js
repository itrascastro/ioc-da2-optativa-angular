/*
  Quadern de Notes - Vista Dashboard
  Gestió de la pàgina principal amb estadístiques i notes recents
*/

;(function() {
  'use strict';

  const Dashboard = {
    app: null,
    _tagFilter: null,
    _searchQuery: '',
    _structureFilter: null, // { unitId?, blocId?, sectionId? }

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
      // Esdeveniments específics del dashboard
      const view = document.getElementById('dashboard-view');
      if (view) {
        view.addEventListener('click', (e)=>{
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          const action = btn.getAttribute('data-action');
          if (action === 'open-filter') this._openFilterModal();
          if (action === 'create-note') this._createNewNote();
        });
      }

      // Cerca en temps real
      const search = document.getElementById('dashboard-search');
      if (search) {
        search.addEventListener('input', () => {
          this._searchQuery = (search.value || '').trim().toLowerCase();
          this.loadData();
        });
      }

      // Click en etiquetes (fila superior)
      const tagFilters = document.getElementById('dashboard-tag-filters');
      if (tagFilters) {
        tagFilters.addEventListener('click', (e)=>{
          const tagBtn = e.target.closest('.tag-item');
          if (!tagBtn) return;
          const tag = tagBtn.getAttribute('data-tag');
          if (!tag) return;
          // Toggle simple: seleccionar/deseleccionar
          if (this._tagFilter && this._tagFilter[0] === tag) {
            this._tagFilter = null;
          } else {
            this._tagFilter = [tag];
          }
          this.loadData();
        });
      }
      // Bind de la llista de notes (accions i click)
      this._bindListEvents();
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
        this._updateRecentTags(notes);
        this._renderTagFilters(notes);
        this._updateActivityChart(notes);
        
      } catch (error) {
        console.error('❌ Dashboard: Error carregant dades:', error);
        this._showToast('Error carregant les dades', 'error');
      }
    },

    async _getAllNotes() {
      // Si hi ha filtre d'estructura, retornar només aquestes notes (preferent)
      if (this._structureFilter) {
        const ids = this._collectNoteIdsForStructure(this._structureFilter);
        if (ids && window.Quadern?.Store) {
          const state = window.Quadern.Store.load();
          return ids.map(id => state.notes.byId[id]).filter(Boolean);
        }
      }
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

      // Filtre per text (títol, contingut, etiquetes)
      if (this._searchQuery && this._searchQuery.length > 0) {
        const q = this._searchQuery;
        filtered = filtered.filter(n => {
          const title = String(n.noteTitle || '').toLowerCase();
          const content = String(n.content || '').toLowerCase();
          const tags = (n.tags||[]).join(' ').toLowerCase();
          return title.includes(q) || content.includes(q) || tags.includes(q);
        });
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

      // Agrupar per data i construir llista per dates (sense línia temporal)
      const groups = this._groupByDateLabel(recentNotes);
      const html = groups.map(g => `
        <section class="date-group">
          <div class="date-title">${this._escapeHtml(g.title)}</div>
          <div class="date-notes">
            ${g.items.map(n => this._renderRecentNoteCard(n)).join('')}
          </div>
        </section>
      `).join('');
      container.innerHTML = html;
    },
    // Establir filtre per estructura i mostrar al dashboard
    setStructureFilter(filter){
      this._structureFilter = filter || null;
      // Netejar altres filtres per claredat visual
      this._tagFilter = null;
      this._searchQuery = '';
      try {
        if (this.app && typeof this.app.switchView === 'function') {
          this.app.switchView('dashboard');
        }
      } catch {}
      // Donar un petit marge per si Discovery encara s'està carregant
      setTimeout(()=> this.loadData(), 30);
    },
    _groupByDateLabel(notes){
      const map = new Map();
      const fmt = (d) => d.toLocaleDateString('ca-ES', { day:'2-digit', month:'long', year:'numeric' });
      notes.forEach(n=>{
        const d = new Date(n.updatedAt || n.createdAt || Date.now());
        const key = fmt(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(n);
      });
      return Array.from(map.entries()).map(([title, items])=>({title, items}));
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
      const tags = (note.tags||[]).map(t=>`<span class="tag note-tag">#${t}</span>`).join(' ');
      const title = this._escapeHtml(note.noteTitle || 'Sense títol');
      const preview = this._getContentPreview(note.content || '', 240);
      const footer = this._escapeHtml(this._cleanSectionTitle(note.sectionTitle || ''));
      return `
        <article class="note-card" data-note-id="${note.id}">
          <header class="note-head">
            <h3 class="note-title">${title}</h3>
            <div class="note-actions">
              <button class="icon-btn" title="Editar" data-action="edit-note" data-note-id="${note.id}"><i class="bi bi-pencil"></i></button>
              <button class="icon-btn danger" title="Eliminar" data-action="delete-note" data-note-id="${note.id}"><i class="bi bi-trash"></i></button>
            </div>
          </header>
          ${preview ? `<p class="note-content">${this._escapeHtml(preview)}</p>` : ''}
          ${tags ? `<div class="note-tags">${tags}</div>` : ''}
          ${footer ? `<footer class="note-footer">${footer}</footer>` : ''}
        </article>
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
    _bindListEvents() {
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
        const card = e.target.closest('.note-card');
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

      // Click en etiquetes recents per filtrar
      const tagsContainer = document.getElementById('recent-tags');
      if (tagsContainer) {
        tagsContainer.addEventListener('click', (e)=>{
          const tagBtn = e.target.closest('.tag-item');
          if (!tagBtn) return;
          const tag = tagBtn.getAttribute('data-tag');
          if (!tag) return;
          this._tagFilter = [tag];
          this.loadData();
        });
      }
    },
    _openFilterModal(){
      const tagCounts = this._extractTags(this._getAllNotesSync());
      const tags = Object.entries(tagCounts).sort((a,b)=> b[1]-a[1]);
      const content = `
        <div class="filter-modal">
          <div class="filter-search">
            <input type="text" id="filter-search" class="input-search" placeholder="Cerca etiqueta..." />
          </div>
          <div class="filter-tags">
            ${tags.map(([tag,count])=>`
              <div class=\"filter-row\"> 
                <input type=\"checkbox\" class=\"filter-checkbox\" value=\"${tag}\" ${this._tagFilter?.includes(tag)?'checked':''} />
                <span class=\"tag-name\">#${tag}</span>
                <span class=\"tag-count\">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
      const modal = window.Quadern?.Components?.showModal
        ? window.Quadern.Components.showModal('Filtrar per etiqueta', content, [
            { text: 'Netejar', action: 'clear', class: 'btn-outline' },
            { text: 'Aplicar', action: 'apply', class: 'btn-primary' }
          ], { backdropClose: false })
        : null;
      if (!modal) return;
      modal.addEventListener('click', (e)=>{
        const btn = e.target.closest('[data-action]');
        const act = btn?.dataset?.action;
        if (!act) return;
        if (act === 'clear') {
          this._tagFilter = null;
          // Netejar checks visuals
          modal.querySelectorAll('.filter-checkbox:checked').forEach(cb => { cb.checked = false; });
          this.loadData();
        }
        if (act === 'apply') {
          const selected = Array.from(modal.querySelectorAll('.filter-checkbox:checked')).map(i=>i.value);
          this._tagFilter = selected;
          this.loadData();
        }
      });
      // Filtre per text
      const search = modal.querySelector('#filter-search');
      if (search) {
        search.addEventListener('input', ()=>{
          const q = search.value.toLowerCase();
          modal.querySelectorAll('.filter-checkbox').forEach(cb => {
            const row = cb.closest('.filter-row');
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

    _updateRecentTags(notes) {
      const container = document.getElementById('recent-tags');
      if (!container) return;

      // Recents: tags únicos ordenados por recencia + contador global
      const ordered = [...notes]
        .filter(n => (n.tags && n.tags.length))
        .sort((a,b)=> new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt));
      const counts = this._extractTags(notes);
      const seen = new Set();
      const recentTags = [];
      for (const n of ordered) {
        for (const t of n.tags) {
          const tt = String(t).trim().toLowerCase();
          if (!tt) continue;
          if (!seen.has(tt)) { seen.add(tt); recentTags.push([tt, counts[tt]||0]); }
          if (recentTags.length >= 28) break;
        }
        if (recentTags.length >= 28) break;
      }

      if (recentTags.length === 0) {
        container.innerHTML = `
          <div class="empty-tags">
            <p>No hi ha etiquetes encara. Afegeix #etiquetes a les teves notes!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="tags-cloud">
          ${recentTags.map(([tag,count]) => `
            <button class="tag-item" data-tag="${tag}">#${tag} <span class="tag-count">${count}</span></button>
          `).join('')}
        </div>
      `;

      // Filtro por texto
      const search = document.getElementById('recent-tags-search');
      if (search) {
        search.oninput = () => {
          const q = search.value.trim().toLowerCase();
          container.querySelectorAll('.tag-item').forEach(el => {
            const t = el.getAttribute('data-tag') || '';
            el.style.display = t.includes(q) ? '' : 'none';
          });
        };
      }
    },
    // Fila superior de filtres d'etiquetes (píndoles simples)
    _renderTagFilters(notes) {
      const cont = document.getElementById('dashboard-tag-filters');
      if (!cont) return;
      const counts = this._extractTags(notes);
      const tags = Object.keys(counts).sort((a,b)=> counts[b]-counts[a]).slice(0, 30);
      if (tags.length === 0) { cont.innerHTML = ''; return; }
      cont.innerHTML = tags.map(t=>{
        const active = this._tagFilter && this._tagFilter[0] === t;
        return `<button class="tag-item tag${active?' active':''}" data-tag="${t}"># ${this._escapeHtml(t)}</button>`;
      }).join('');
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

      // Convertir HTML a text pla preservant només el contingut llegible
      let text = '';
      try {
        const div = document.createElement('div');
        div.innerHTML = content;
        text = (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
      } catch {
        text = String(content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }

      if (!text) return 'Sense contingut';

      return text.length > maxLength ? (text.slice(0, maxLength).trim() + '...') : text;
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
      // Filtre per estructura (unitat/bloc/secció) – preferir Discovery
      if (this._structureFilter) {
        const byIds = this._collectNoteIdsForStructure(this._structureFilter);
        if (byIds) {
          const allow = new Set(byIds);
          filtered = filtered.filter(n => allow.has(n.id));
        } else {
          const f = this._structureFilter;
          filtered = filtered.filter(n => {
            const unitOk = f.unitId ? Number(n.unitat||0) === Number(f.unitId) : true;
            const blocOk = f.blocId ? Number(n.bloc||0) === Number(f.blocId) : true;
            const sectOk = f.sectionId ? String(n.sectionId||'') === String(f.sectionId) : true;
            return unitOk && blocOk && sectOk;
          });
        }
      }
      this.loadData();
    },
    _collectNoteIdsForStructure(f){
      try {
        const D = window.Quadern?.Discovery;
        const CS = D?.getCourseStructure?.();
        if (!D || !CS) return null;
        const ids = [];
        const unitId = f.unitId != null ? parseInt(f.unitId,10) : null;
        const blocId = f.blocId != null ? parseInt(f.blocId,10) : null;
        const sectionId = f.sectionId != null ? String(f.sectionId) : null;
        if (sectionId && unitId && blocId) {
          const notes = D.getNotesForSection(unitId, blocId, sectionId) || [];
          notes.forEach(n => ids.push(n.id));
          return ids;
        }
        if (blocId != null && unitId != null) {
          const sections = D.getSectionsForBlock(unitId, blocId) || {};
          Object.values(sections).forEach(sec => (sec.notes||[]).forEach(n => ids.push(n.id)));
          return ids;
        }
        if (unitId != null) {
          const unit = CS[`unitat-${unitId}`];
          if (!unit) return [];
          Object.values(unit.blocs||{}).forEach(bloc => {
            Object.values(bloc.seccions||{}).forEach(sec => (sec.notes||[]).forEach(n => ids.push(n.id)));
          });
          return ids;
        }
        return null;
      } catch { return null; }
    },

    refreshData() {
      this.loadData();
    }
  };

  // Exposar al namespace
  window.Quadern = window.Quadern || {};
  window.Quadern.Dashboard = Dashboard;

})();
