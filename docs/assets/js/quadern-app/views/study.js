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
      console.log('📚 Study: Vista activada - redirigint al Dashboard en mode estudi');
      try {
        if (window.Quadern?.Dashboard) {
          window.Quadern.Dashboard.setStudyMode?.(true);
          if (this.app && typeof this.app.switchView === 'function') {
            this.app.switchView('dashboard');
            return;
          }
        }
      } catch{}
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

      // Cerca i neteja (compartint estat amb Dashboard)
      const sInput = document.getElementById('study-search');
      const sClear = document.getElementById('study-search-clear');
      if (sInput) {
        sInput.addEventListener('input', ()=>{
          try { if (window.Quadern?.Dashboard) { window.Quadern.Dashboard._searchQuery = (sInput.value||'').trim().toLowerCase(); window.Quadern.Dashboard._updateSearchClearVisibility?.(); } } catch {}
          try { this.app?.refreshData?.(); } catch {}
        });
      }
      if (sClear) {
        sClear.addEventListener('click', (e)=>{
          e.preventDefault();
          try {
            if (window.Quadern?.Dashboard) {
              window.Quadern.Dashboard._searchQuery = '';
              window.Quadern.Dashboard._tagFilter = null;
              const inp = document.getElementById('study-search'); if (inp) inp.value = '';
              window.Quadern.Dashboard._updateSearchClearVisibility?.();
            }
          } catch {}
          try { this.app?.refreshData?.(); } catch {}
        });
      }

      // Clicks en etiquetes (fila superior de l'estudi)
      const tagFilters = document.getElementById('study-tag-filters');
      if (tagFilters) {
        tagFilters.addEventListener('click', (e)=>{
          const tagBtn = e.target.closest('.tag-item');
          if (!tagBtn) return;
          const tag = tagBtn.getAttribute('data-tag');
          if (!tag) return;
          try {
            const Dash = window.Quadern?.Dashboard; if (!Dash) return;
            const current = Array.isArray(Dash._tagFilter) ? [...Dash._tagFilter] : [];
            const idx = current.findIndex(t => String(t).toLowerCase() === String(tag).toLowerCase());
            if (idx >= 0) current.splice(idx, 1); else current.push(tag);
            Dash._tagFilter = current.length ? current : null;
            Dash._updateSearchClearVisibility?.();
          } catch {}
          try { this.app?.refreshData?.(); } catch {}
        });
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
      
      // Obtenir totes les notes i aplicar filtres del Dashboard
      let allNotes = [];
      if (window.Quadern?.Store) {
        const state = window.Quadern.Store.load();
        allNotes = Object.values(state.notes.byId || {});
      }
      const filtered = this._applyDashboardFilters(allNotes);
      // Construir document únic agrupat per Unitat/Bloc/Secció
      const organized = this._organizeNotesByStructure(filtered);
      this._displayStudyDocument(organized);
      this._renderTagFiltersForStudy();
      this._updateSearchClearVisibilityStudy();
    },

    _displayStudyDocument(organized){
      const host = document.getElementById('study-notes');
      if (!host) return;
      const allNotesCount = Object.values(organized||{}).reduce((acc,u)=> acc + Object.values(u.blocs||{}).reduce((ab,b)=> ab + Object.values(b.seccions||{}).reduce((as,s)=> as + (s.notes||[]).length,0),0),0);
      if (!allNotesCount) {
        body.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <i class="bi bi-journal-text"></i>
            </div>
            <h3>No hi ha notes en aquesta selecció</h3>
            <p>Selecciona una altra part del curs o modifica els filtres.</p>
          </div>
        `;
        return;
      }
      const unitKeys = Object.keys(organized).sort((a,b)=> (organized[a].id||0) - (organized[b].id||0));
      let html = '<div class="study-doc">';
      unitKeys.forEach(uk => {
        const u = organized[uk];
        html += `<h2 class="doc-h1">${this._formatUnitHeading(u.id)}</h2>`;
        const blockKeys = Object.keys(u.blocs||{}).sort((a,b)=> (u.blocs[a].id||0) - (u.blocs[b].id||0));
        blockKeys.forEach(bk => {
          const b = u.blocs[bk];
          html += `<h3 class="doc-h2">${this._formatBlockHeading(u.id, b.id)}</h3>`;
          const sectionEntries = Object.entries(b.seccions||{});
          // ordenar per title per estabilitat
          sectionEntries.sort((a,b)=> String(a[1].title||'').localeCompare(String(b[1].title||'')));
          sectionEntries.forEach(([sk, s], idx) => {
            html += `<h4 class="doc-h3">${this._formatSectionHeading(u.id, b.id, idx+1, s.title)}</h4>`;
            const notes = (s.notes||[]).filter(n=> n.content && String(n.content).trim())
              .sort((a,b)=> new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt));
            notes.forEach(n => {
              html += `<div class="doc-note" data-note-id="${n.id}">${n.content||''}</div>`;
            });
          });
        });
      });
      html += '</div>';
      host.innerHTML = html;
    },

    _formatUnitHeading(unit){
      const u = Number(unit||0);
      return `Unitat ${u || '?'}`;
    },
    _formatBlockHeading(unit, bloc){
      const u = Number(unit||0), b = Number(bloc||0);
      return `${u||'?'}.${b||'?'} Bloc ${b||'?'}`;
    },
    _formatSectionHeading(unit, bloc, index, title){
      const u = Number(unit||0), b = Number(bloc||0), i = Number(index||0);
      const clean = (window.Quadern?.Dashboard?._cleanSectionTitle?.(title||'') || title || 'Secció');
      return `${u||'?'}.${b||'?'}.${i||'?'} ${clean}`;
    },

    _renderTagFiltersForStudy(){
      const cont = document.getElementById('study-tag-filters');
      if (!cont) return;
      const Dash = window.Quadern?.Dashboard; if (!Dash) { cont.innerHTML=''; return; }
      // Notes dins l'abast d'estructura
      let notes = [];
      if (window.Quadern?.Store) {
        const state = window.Quadern.Store.load();
        notes = Object.values(state.notes.byId || {});
      }
      if (Dash._structureFilter) {
        const byIds = (typeof Dash._collectNoteIdsForStructure === 'function') ? Dash._collectNoteIdsForStructure(Dash._structureFilter) : null;
        if (byIds && byIds.length) {
          const allow = new Set(byIds);
          notes = notes.filter(n => allow.has(n.id));
        }
      }
      const counts = Dash._extractTags ? Dash._extractTags(notes) : {};
      const selected = new Set((Dash._tagFilter||[]).map(t=>String(t).toLowerCase()));
      const tags = Object.keys(counts).sort((a,b)=> counts[b]-counts[a]).slice(0, 50);
      cont.innerHTML = tags.map(t => `<button class="tag-item tag${selected.has(String(t).toLowerCase())?' active':''}" data-tag="${t}"># ${t} <span class="count">${counts[t]}</span></button>`).join('');
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
            <div class="study-tools">
              <button class="icon-btn" id="study-body-expand" title="Expandir tot" aria-label="Expandir tot"><i class="bi bi-arrows-expand" aria-hidden="true"></i></button>
              <button class="icon-btn" id="study-body-collapse" title="Col·lapsar tot" aria-label="Col·lapsar tot"><i class="bi bi-arrows-collapse" aria-hidden="true"></i></button>
            </div>
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
      this._bindCollapseHandlers();
      this._bindBodyControls();
    },

    _applyDashboardFilters(notes){
      const Dash = window.Quadern?.Dashboard;
      if (!Dash) return notes;
      let filtered = notes.slice();
      try {
        // Estructura
        if (Dash._structureFilter) {
          const byIds = (typeof Dash._collectNoteIdsForStructure === 'function') ? Dash._collectNoteIdsForStructure(Dash._structureFilter) : null;
          if (byIds && byIds.length) {
            const allow = new Set(byIds);
            filtered = filtered.filter(n => allow.has(n.id));
          } else {
            const f = Dash._structureFilter;
            filtered = filtered.filter(n => {
              const unitOk = f.unitId ? Number(n.unitat||0) === Number(f.unitId) : true;
              const blocOk = f.blocId ? Number(n.bloc||0) === Number(f.blocId) : true;
              const sectOk = f.sectionId ? String(n.sectionId||'') === String(f.sectionId) : true;
              return unitOk && blocOk && sectOk;
            });
          }
        }
        // Etiquetes (OR)
        if (Array.isArray(Dash._tagFilter) && Dash._tagFilter.length) {
          const set = new Set(Dash._tagFilter.map(t=>String(t).toLowerCase()));
          filtered = filtered.filter(n => (n.tags||[]).some(t => set.has(String(t).toLowerCase())));
        }
        // Cerca
        if (Dash._searchQuery && String(Dash._searchQuery).length > 0) {
          const q = String(Dash._searchQuery).toLowerCase();
          filtered = filtered.filter(n => {
            const title = String(n.noteTitle||'').toLowerCase();
            const content = String(n.content||'').toLowerCase();
            const tags = (n.tags||[]).join(' ').toLowerCase();
            return title.includes(q) || content.includes(q) || tags.includes(q);
          });
        }
      } catch(e){ console.warn('Study: error aplicant filtres Dashboard', e); }
      return filtered;
    },

    // Sense accions de targeta en mode document

    _updateSearchClearVisibilityStudy(){
      try {
        const Dash = window.Quadern?.Dashboard; if (!Dash) return;
        const active = !!(Dash._searchQuery && Dash._searchQuery.length) || (Array.isArray(Dash._tagFilter) && Dash._tagFilter.length);
        const clearBtn = document.getElementById('study-search-clear');
        if (clearBtn) clearBtn.style.display = active ? '' : 'none';
      } catch{}
    },

    _renderStudyUnit(unitat) {
      let html = `
        <div class="study-unit">
          <div class="study-unit-header" data-collapse-toggle>
            <i class="bi bi-caret-down-fill caret" aria-hidden="true"></i>
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
          <div class="study-block-header" data-collapse-toggle>
            <i class="bi bi-caret-down-fill caret" aria-hidden="true"></i>
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
          <div class="study-section-header" data-collapse-toggle>
            <i class="bi bi-caret-down-fill caret" aria-hidden="true"></i>
            <div class="title-wrap">
              <h4>${seccio.title}</h4>
              <span class="count">${seccio.notes.length}</span>
            </div>
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

    _bindCollapseHandlers(){
      const host = document.getElementById('study-body');
      if (!host) return;
      host.addEventListener('click', (e)=>{
        const header = e.target.closest('[data-collapse-toggle]');
        if (!header) return;
        const wrap = header.parentElement;
        if (wrap) wrap.classList.toggle('collapsed');
      });
    },

    _bindBodyControls(){
      const body = document.getElementById('study-body');
      if (!body) return;
      const btnExpand = body.querySelector('#study-body-expand');
      const btnCollapse = body.querySelector('#study-body-collapse');
      if (btnExpand) btnExpand.addEventListener('click', ()=>{
        body.querySelectorAll('.study-unit, .study-block, .study-section').forEach(w=>w.classList.remove('collapsed'));
      });
      if (btnCollapse) btnCollapse.addEventListener('click', ()=>{
        body.querySelectorAll('.study-unit, .study-block, .study-section').forEach(w=>w.classList.add('collapsed'));
      });
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
