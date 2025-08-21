// Dropdown de navegació
function initializeNavDropdown() {
  const dropdown = document.getElementById('nav-dropdown');
  const btn = document.getElementById('nav-dropdown-btn');
  if (!dropdown || !btn) return;

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  // Tancar en clicar fora
  document.addEventListener('click', function () {
    dropdown.classList.remove('open');
  });

  // Evitar tancar en clicar dins del dropdown
  dropdown.addEventListener('click', function (e) {
    e.stopPropagation();
  });
}

// Footer progrés (estàtic)
function initializeFooterProgress() {
  const progressText = document.getElementById('footer-progress-text');
  const progressFill = document.getElementById('footer-progress-fill');
  if (progressText && progressFill) {
    progressText.textContent = '0 de 5';
    progressFill.style.width = '0%';
  }
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

  // Smooth scroll amb offset per header fix
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        const headerHeight = 70;
        const additionalOffset = 20;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - additionalOffset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });
});

// Assegurar posició 0,0 inicial
window.addEventListener('load', function () {
  window.scrollTo(0, 0);
});

