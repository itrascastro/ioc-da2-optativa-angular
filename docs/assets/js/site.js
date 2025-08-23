// Dropdown de navegació
function initializeNavDropdown() {
  const dropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));
  if (dropdowns.length === 0) return;

  const closeAll = () => dropdowns.forEach(d => d.classList.remove('open'));

  dropdowns.forEach(dropdown => {
    const btn = dropdown.querySelector('.nav-dropdown-btn');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      // si és de header (no sidebar-mode), comportament exclusiu
      const isSidebar = dropdown.classList.contains('sidebar-mode');
      if (!isSidebar) closeAll();
      dropdown.classList.toggle('open');
    });

    // Evitar tancar en clicar dins del dropdown
    dropdown.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  });

  // Tancar en clicar fora (només afecta dropdowns oberts)
  document.addEventListener('click', function () {
    closeAll();
  });
}


// Tema fosc/clar + tema Prism
function initializeThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  const prismLink = document.getElementById('prism-theme');
  if (!themeToggle) return;

  // Carregar tema guardat
  const savedTheme = localStorage.getItem('theme') || 'light';
  body.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? 'Mode Clar' : 'Mode Fosc';
  setPrismTheme(savedTheme);

  themeToggle.addEventListener('click', function () {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? 'Mode Clar' : 'Mode Fosc';
    setPrismTheme(newTheme);
  });

  function setPrismTheme(theme) {
    if (!prismLink) return;
    const base = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/';
    prismLink.href = theme === 'dark' ? `${base}prism-tomorrow.css` : `${base}prism.css`;
  }
}

// Inici
document.addEventListener('DOMContentLoaded', function () {
  initializeThemeToggle();
  initializeNavDropdown();
  initializeFooterProgress();
  initializePromptCopy();
  initializeTocActive();
  initializeFooterNav();

  // Smooth scroll amb offset per header fix
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      // Si són botons de la barra del footer per next/prev, deixar que la seva funció específica gestioni
      const action = (this.getAttribute('id') || '').startsWith('footer-btn-') ? (this.getAttribute('id') || '') : '';
      if (action === 'footer-btn-next' || action === 'footer-btn-prev') {
        return; // gestionat per initializeFooterNav
      }
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      if (!targetId || targetId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (targetId === 'bottom') {
        const fullHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        window.scrollTo({ top: fullHeight, behavior: 'smooth' });
        return;
      }
      const target = document.getElementById(targetId);
      if (target) {
        const headerHeight = 70;
        const additionalOffset = 20;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - additionalOffset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });
  
  // Checklist accessible: click/teclat per canviar estat
  document.querySelectorAll('.checklist .checklist-item').forEach(item => {
    const box = item.querySelector('.checklist-checkbox');
    const toggle = () => {
      const checked = item.getAttribute('aria-checked') === 'true';
      const next = !checked;
      item.setAttribute('aria-checked', String(next));
      if (box) {
        box.classList.toggle('checked', next);
      }
      item.classList.toggle('checked', next);
    };
    item.addEventListener('click', (e) => {
      // Evitar activar si el clic prové d'un enllaç intern
      if ((e.target instanceof HTMLElement) && e.target.closest('a')) return;
      toggle();
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    });
  });
  
  // Assignar id a H2 sense id per compatibilitzar amb TOC
  const slugify = (text) => text
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  document.querySelectorAll('.content-body h2').forEach(h2 => {
    if (!h2.id) {
      const base = slugify(h2.textContent || '');
      let id = base;
      let i = 1;
      while (id && document.getElementById(id)) {
        i += 1;
        id = `${base}-${i}`;
      }
      if (id) h2.id = id;
    }
  });
});

// Assegurar posició 0,0 inicial
window.addEventListener('load', function () {
  window.scrollTo(0, 0);
});
// Barra de progrés: inicialitza grups (curs/unitat) a partir d'atributs data-*
function initializeFooterProgress() {
  document.querySelectorAll('.footer-progress .progress-group').forEach(group => {
    const text = group.querySelector('.progress-text');
    const fill = group.querySelector('.progress-fill-footer');
    if (!text || !fill) return;
    const pos = parseInt(text.getAttribute('data-pos') || '0', 10) || 0;
    const total = parseInt(text.getAttribute('data-total') || '0', 10) || 0;
    const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((pos / total) * 100))) : 0;
    text.textContent = `(${pos}/${total})`;
    // Assegurar aplicació després del primer paint
    requestAnimationFrame(() => { fill.style.width = `${pct}%`; });
  });

  // Seccions: comptar H2 i actualitzar progrés segons scroll
  const sectionGroup = document.querySelector('.footer-progress .section-progress[data-scan-sections="true"]');
  if (sectionGroup) {
    const text = sectionGroup.querySelector('.progress-text');
    const fill = sectionGroup.querySelector('.progress-fill-footer');
    let total = 0;
    let current = 0;

    const update = () => {
      if (!text || !fill) return;
      const headers = Array.from(document.querySelectorAll('.content-body h2'));
      total = headers.length;
      if (total === 0) {
        text.textContent = '(0/0)';
        fill.style.width = '0%';
        return;
      }
      // Trobar la secció més propera a la part superior (amb offset per header fix)
      const headerEl = document.querySelector('.header');
      const headerOffset = (headerEl ? headerEl.offsetHeight : 0) + 20;
      const scrollY = window.scrollY + headerOffset;
      let idx = 0;
      for (let i = 0; i < total; i++) {
        const top = headers[i].getBoundingClientRect().top + window.scrollY;
        if (top <= scrollY) {
          idx = i;
        }
      }
      current = Math.min(total, idx + 1);
      // Si estem al final de la pàgina, assegurar 100% (última secció)
      const docBottom = Math.ceil(window.innerHeight + window.scrollY);
      const fullHeight = Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight);
      if (docBottom >= fullHeight - 2) {
        current = total;
      }
      const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
      text.setAttribute('data-pos', String(current));
      text.setAttribute('data-total', String(total));
      text.textContent = `(${current}/${total})`;
      fill.style.width = `${pct}%`;
    };

    // Inicialitzar segons hash si existeix
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      // Ajustar posició inicial si es carrega amb hash
      const target = document.getElementById(hash);
      if (target) {
        const all = Array.from(document.querySelectorAll('.content-body h2'));
        current = all.indexOf(target) + 1;
      }
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('hashchange', update);
  }
}

// Resaltat de la secció actual al TOC del sidebar (H2)
function initializeTocActive() {
  const tocLinks = Array.from(document.querySelectorAll('.sidebar .nav-link'));
  if (tocLinks.length === 0) return;
  const headerEl = document.querySelector('.header');
  const headerOffset = (headerEl ? headerEl.offsetHeight : 0) + 20;

  const getHeaders = () => Array.from(document.querySelectorAll('.content-body h2'));

  const updateActive = () => {
    const headers = getHeaders();
    if (headers.length === 0) return;
    const scrollY = window.scrollY + headerOffset;
    let idx = 0;
    for (let i = 0; i < headers.length; i++) {
      const top = headers[i].getBoundingClientRect().top + window.scrollY;
      if (top <= scrollY) idx = i;
    }
    const docBottom = Math.ceil(window.innerHeight + window.scrollY);
    const fullHeight = Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight);
    if (docBottom >= fullHeight - 2) idx = headers.length - 1;

    const currentId = headers[idx]?.id || '';
    tocLinks.forEach(a => {
      if (a.getAttribute('data-section') === currentId) a.classList.add('current');
      else a.classList.remove('current');
    });
  };

  updateActive();
  window.addEventListener('scroll', updateActive, { passive: true });
  window.addEventListener('resize', updateActive);
  window.addEventListener('hashchange', updateActive);
}

// Copiar prompt d'IA des d'una textarea amb botó copy
function initializePromptCopy() {
  document.querySelectorAll('.ai-prompt').forEach(box => {
    const content = box.querySelector('.ai-prompt-content');
    const copyBtn = box.querySelector('.copy-btn');
    if (!content || !copyBtn) return;
    copyBtn.addEventListener('click', async () => {
      const text = content.innerText;
      try {
        await navigator.clipboard.writeText(text);
        showPromptCopyFeedback(copyBtn, true);
      } catch (err) {
        try {
          const t = document.createElement('textarea');
          t.value = text;
          t.style.position = 'fixed'; t.style.opacity = '0';
          document.body.appendChild(t);
          t.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(t);
          showPromptCopyFeedback(copyBtn, ok);
        } catch (e) {
          showPromptCopyFeedback(copyBtn, false);
        }
      }
    });
  });
}

function showPromptCopyFeedback(button, success) {
  const original = button.innerHTML;
  if (success) {
    button.innerHTML = '<i class="bi bi-clipboard-check" aria-hidden="true"></i>';
    button.classList.add('copied');
    button.setAttribute('aria-label', 'Prompt copiat correctament');
  } else {
    button.innerHTML = '<i class="bi bi-x-circle" aria-hidden="true"></i>';
    button.setAttribute('aria-label', 'Error en copiar el prompt');
  }
  setTimeout(() => {
    button.innerHTML = '<i class="bi bi-clipboard" aria-hidden="true"></i>';
    button.classList.remove('copied');
    button.setAttribute('aria-label', 'Copiar prompt');
  }, 2000);
}

// Navegació del footer: inici, final, següent/anter. secció
function initializeFooterNav() {
  const btnTop = document.getElementById('footer-btn-top');
  const btnBottom = document.getElementById('footer-btn-bottom');
  const btnNext = document.getElementById('footer-btn-next');
  const btnPrev = document.getElementById('footer-btn-prev');
  const headerEl = document.querySelector('.header');
  const headerOffset = (headerEl ? headerEl.offsetHeight : 0) + 20;

  const getHeaders = () => Array.from(document.querySelectorAll('.content-body h2'));
  const currentIndex = () => {
    const headers = getHeaders();
    if (headers.length === 0) return -1;
    const scrollY = window.scrollY + headerOffset;
    let idx = 0;
    for (let i = 0; i < headers.length; i++) {
      const top = headers[i].getBoundingClientRect().top + window.scrollY;
      if (top <= scrollY) idx = i;
    }
    // si al final de la pàgina, seleccionar l'última
    const docBottom = Math.ceil(window.innerHeight + window.scrollY);
    const fullHeight = Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight);
    if (docBottom >= fullHeight - 2) idx = headers.length - 1;
    return idx;
  };
  const scrollToHeader = (el) => {
    const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  if (btnTop) {
    btnTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  if (btnBottom) {
    btnBottom.addEventListener('click', (e) => {
      e.preventDefault();
      const full = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      window.scrollTo({ top: full, behavior: 'smooth' });
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', (e) => {
      e.preventDefault();
      const headers = getHeaders();
      if (headers.length === 0) return;
      const idx = currentIndex();
      const nextIdx = Math.min(headers.length - 1, idx + 1);
      scrollToHeader(headers[nextIdx]);
    });
  }
  if (btnPrev) {
    btnPrev.addEventListener('click', (e) => {
      e.preventDefault();
      const headers = getHeaders();
      if (headers.length === 0) return;
      const idx = currentIndex();
      const prevIdx = Math.max(0, idx - 1);
      scrollToHeader(headers[prevIdx]);
    });
  }
}
