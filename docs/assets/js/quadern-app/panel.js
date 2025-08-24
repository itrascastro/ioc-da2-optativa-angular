;(function(){
  const U = window.Quadern.Utils; const S = window.Quadern.Store;
  function Panel(){ this.root = null; this.state = null; }
  Panel.prototype.init = function(){
    this.state = S.load();
    this.ensurePanel();
    this.installHeads();
    this.populateSections();
    this.adjustOffsets();
    window.addEventListener('resize', this.adjustOffsets.bind(this));
  };
  Panel.prototype.ensurePanel = function(){
    if (document.querySelector('.qnp-panel')) return;
    const panel = document.createElement('div'); panel.className = 'qnp-panel'; panel.setAttribute('role','dialog');
    panel.innerHTML = [
      '<div class="qnp-inner">',
      ' <div class="qnp-header">',
      '   <div class="qnp-title"><i class="bi bi-journal-text" aria-hidden="true"></i> Notes d\'aquesta pàgina</div>',
      '   <div class="qnp-actions">',
      '     <button type="button" class="qnp-btn" data-action="new"><i class="bi bi-journal-plus"></i> Nova</button>',
      '     <button type="button" class="qnp-btn" data-action="close">✕</button>',
      '   </div>',
      ' </div>',
      ' <div class="qnp-body">',
      '   <div class="qnp-row">',
      '     <label class="sr-only" for="qnp-section">Secció</label>',
      '     <select id="qnp-section"></select>',
      '   </div>',
      '   <div class="qnp-split">',
      '     <div class="qnp-list" id="qnp-list"></div>',
      '     <div class="qnp-editor">',
      '       <input id="qnp-title" placeholder="Títol de la nota" />',
      '       <input id="qnp-tags" placeholder="Etiquetes (separades per comes)" />',
      '       <textarea id="qnp-text" placeholder="Escriu la teva nota…"></textarea>',
      '       <div class="qnp-editor-actions">',
      '         <button type="button" class="qnp-btn" data-action="dup"><i class="bi bi-files"></i> Duplicar</button>',
      '         <button type="button" class="qnp-btn qnp-danger" data-action="del"><i class="bi bi-trash"></i> Eliminar</button>',
      '       </div>',
      '     </div>',
      '   </div>',
      ' </div>',
      '</div>'
    ].join('');
    document.body.appendChild(panel);
    this.root = panel;
    this.bind();
  };
  Panel.prototype.bind = function(){
    const r = this.root; if (!r) return;
    r.querySelector('[data-action="close"]').addEventListener('click', ()=> this.toggle(false));
    r.querySelector('[data-action="new"]').addEventListener('click', ()=> this.newNote());
    r.querySelector('[data-action="dup"]').addEventListener('click', ()=> this.duplicate());
    r.querySelector('[data-action="del"]').addEventListener('click', ()=> this.remove());
    r.querySelector('#qnp-title').addEventListener('input', ()=> this.autosave());
    r.querySelector('#qnp-tags').addEventListener('input', ()=> this.autosave());
    r.querySelector('#qnp-text').addEventListener('input', ()=> this.autosave());
    r.querySelector('#qnp-section').addEventListener('change', ()=> this.refreshList());
  };
  Panel.prototype.toggle = function(show){ this.root.style.display = (show===false)?'none':'block'; };
  Panel.prototype.scanSections = function(){
    const headers = U.$all('.content-body h2');
    return headers.map(h2 => ({ id: h2.id||'', title: (h2.textContent||'').trim() }));
  };
  Panel.prototype.populateSections = function(){
    const sel = this.root.querySelector('#qnp-section'); sel.innerHTML='';
    this.scanSections().forEach(s => { if(!s.id) return; const opt=document.createElement('option'); opt.value=s.id; opt.textContent=s.title||s.id; sel.appendChild(opt); });
  };
  Panel.prototype.sectionContext = function(){
    const unitat = Number(document.querySelector('meta[name="page-unitat"]')?.getAttribute('content')) || undefined;
    const bloc = Number(document.querySelector('meta[name="page-bloc"]')?.getAttribute('content')) || undefined;
    const base = document.body.getAttribute('data-baseurl')||''; const pageUrl = base + (location.pathname||'');
    const sectionId = this.root.querySelector('#qnp-section')?.value || '';
    const sectionTitle = (document.getElementById(sectionId)?.textContent||'').trim();
    return { unitat, bloc, pageUrl, sectionId, sectionTitle };
  };
  Panel.prototype.refresh = function(){ this.populateSections(); this.refreshList(); };
  Panel.prototype.refreshList = function(){
    const ctx = this.sectionContext(); if (!ctx.sectionId) return;
    const list = this.root.querySelector('#qnp-list'); list.innerHTML='';
    const state = this.state; const notes = S.notesForSection(state, ctx.pageUrl, ctx.sectionId);
    if (!notes.length) { list.innerHTML = '<div class="qnp-empty">Cap nota encara</div>'; this.clearEditor(); return; }
    notes.sort((a,b)=> new Date(b.updatedAt||b.createdAt||0) - new Date(a.updatedAt||a.createdAt||0));
    notes.forEach(n => {
      const item = document.createElement('div'); item.className='qnp-item'; item.setAttribute('data-id', n.id);
      item.innerHTML = `<div class="qnp-item-title">${(n.noteTitle||n.sectionTitle||n.sectionId||'')}
        <span class="qnp-item-meta">${U.timeAgo(n.updatedAt||n.createdAt||'')}</span></div>
        <div class="qnp-item-tags">${(n.tags||[]).map(t=>`<span class="qnp-tag">${t}</span>`).join('')}</div>`;
      item.addEventListener('click', ()=> this.loadEditor(n.id));
      list.appendChild(item);
    });
    this.loadEditor(notes[0].id);
    this.updateHeadCounts();
  };
  Panel.prototype.clearEditor = function(){
    this.root.querySelector('#qnp-title').value='';
    this.root.querySelector('#qnp-tags').value='';
    this.root.querySelector('#qnp-text').value='';
    this.currentId = null;
  };
  Panel.prototype.loadEditor = function(id){
    const n = this.state.notes.byId[id]; if(!n) return;
    this.currentId = id;
    this.root.querySelector('#qnp-title').value = n.noteTitle||'';
    this.root.querySelector('#qnp-tags').value = (n.tags||[]).join(', ');
    this.root.querySelector('#qnp-text').value = n.content||'';
  };
  Panel.prototype.autosave = function(){
    if (!this.currentId) return;
    const n = this.state.notes.byId[this.currentId]; if(!n) return;
    n.noteTitle = this.root.querySelector('#qnp-title').value.trim();
    n.tags = (this.root.querySelector('#qnp-tags').value||'').split(',').map(s=>s.trim()).filter(Boolean);
    n.content = this.root.querySelector('#qnp-text').value;
    n.updatedAt = U.nowISO();
    S.save(this.state);
    this.updateHeadCounts();
  };
  Panel.prototype.newNote = function(){
    const ctx = this.sectionContext(); if(!ctx.sectionId) return;
    const n = Object.assign({ id: '', noteTitle: 'Nova nota', tags: [], content: '', createdAt: U.nowISO(), updatedAt: U.nowISO() }, ctx);
    const saved = S.upsertNote(this.state, n); S.save(this.state); this.refreshList(); this.loadEditor(saved.id); this.updateHeadCounts();
  };
  Panel.prototype.duplicate = function(){
    if (!this.currentId) return; const base = this.state.notes.byId[this.currentId]; if(!base) return;
    const copy = Object.assign({}, base, { id: '', noteTitle: (base.noteTitle||'') + ' (còpia)', createdAt: U.nowISO(), updatedAt: U.nowISO() });
    const saved = S.upsertNote(this.state, copy); S.save(this.state); this.refreshList(); this.loadEditor(saved.id); this.updateHeadCounts();
  };
  Panel.prototype.remove = function(){
    if (!this.currentId) return; S.deleteNote(this.state, this.currentId); S.save(this.state); this.refreshList(); this.updateHeadCounts();
  };

  // H2 buttons with count badge
  Panel.prototype.installHeads = function(){
    const headers = U.$all('.content-body h2');
    headers.forEach(h2 => {
      if (!h2.id) return;
      if (h2.querySelector('.qnp-add')) return;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'qnp-add';
      btn.innerHTML = '<i class="bi bi-journal-text" aria-hidden="true"></i><span class="qnp-badge" hidden>0</span>';
      const style = window.getComputedStyle(h2); if (style.position === 'static') h2.style.position = 'relative';
      btn.addEventListener('click', () => { this.openForSection(h2.id); });
      h2.appendChild(btn);
    });
    this.updateHeadCounts();
  };
  Panel.prototype.updateHeadCounts = function(){
    const base = document.body.getAttribute('data-baseurl')||''; const pageUrl = base + (location.pathname||'');
    U.$all('.content-body h2').forEach(h2 => {
      if (!h2.id) return;
      const count = S.countForSection(this.state, pageUrl, h2.id) || 0;
      const badge = h2.querySelector('.qnp-add .qnp-badge');
      if (badge) {
        badge.textContent = String(count);
        badge.hidden = !(count > 0);
      }
      const icon = h2.querySelector('.qnp-add i');
      if (icon) icon.className = 'bi ' + (count>0 ? 'bi-journal-check' : 'bi-journal-text');
    });
  };
  Panel.prototype.openForSection = function(sectionId){
    this.toggle(true);
    const sel = this.root.querySelector('#qnp-section');
    if (sel) { sel.value = sectionId; }
    this.refreshList();
    this.adjustOffsets();
  };
  Panel.prototype.adjustOffsets = function(){
    const footer = document.querySelector('.footer, .quadern-footer');
    const h = footer ? footer.offsetHeight : 0;
    this.root.style.bottom = h + 'px';
    const main = document.querySelector('.main-content, .quadern-main');
    if (main) main.style.paddingBottom = `calc(${h + (this.root.offsetHeight||0) + 20}px)`;
  };

  window.Quadern = window.Quadern || {};
  window.Quadern.Panel = Panel;
})();
