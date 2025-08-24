/*
  Quadern de Notes - Navegació UI
  Gestió de navegació entre vistes i navegació d'arbre
*/

;(function() {
  'use strict';

  const Navigation = {
    app: null,

    init(app) {
      this.app = app;
      console.log('🧭 Navigation: Inicialitzant navegació...');
      console.log('✅ Navigation: Navegació inicialitzada');
    },

    switchView(viewName) {
      console.log('🧭 Navigation: Canviant a vista:', viewName);
      
      // Actualitzar botons de navegació
      const viewBtns = document.querySelectorAll('.view-btn');
      viewBtns.forEach(btn => {
        const isActive = btn.dataset.view === viewName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive.toString());
      });

      // Actualitzar contingut de vistes - usar IDs correctes
      const views = document.querySelectorAll('.view');
      views.forEach(view => {
        const isCurrentView = view.id === `${viewName}-view`;
        view.classList.toggle('active', isCurrentView);
        if (isCurrentView) {
          view.style.display = 'block';
        } else {
          view.style.display = 'none';
        }
      });

      // Actualitzar estat de l'app
      this.app.currentView = viewName;

      // Inicialitzar vista específica si és necessari
      this._initializeView(viewName);

      // Actualitzar URL hash
      if (history.pushState) {
        history.pushState(null, null, `#${viewName}`);
      } else {
        window.location.hash = viewName;
      }
    },

    _initializeView(viewName) {
      switch(viewName) {
        case 'dashboard':
          if (this.app.modules.dashboard) {
            this.app.modules.dashboard.loadData();
          }
          break;
        case 'editor':
          if (this.app.modules.editor) {
            this.app.modules.editor.refreshData();
          }
          break;
      }
    },

    initializeNavTree() {
      console.log('🧭 Navigation: Inicialitzant arbre de navegació');
      // Implementació de l'arbre de navegació per la sidebar
    },

    toggleTreeItem(header) {
      const item = header.closest('.tree-item, .nav-unit, .nav-block');
      if (item) {
        const isExpanded = item.classList.contains('expanded');
        item.classList.toggle('expanded', !isExpanded);
        
        const arrow = header.querySelector('.tree-arrow, .nav-toggle');
        if (arrow) {
          arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
        }
      }
    },

    selectSection(header) {
      console.log('🧭 Navigation: Seleccionant secció');
      
      // Canviar a l'editor i seleccionar secció
      this.switchView('editor');
      
      // Notificar a l'editor sobre la selecció de secció
      const sectionId = header.dataset.section;
      if (sectionId && this.app.modules.editor) {
        setTimeout(() => {
          // L'editor pot implementar selectSection si cal
        }, 100);
      }
    }
  };

  window.Quadern = window.Quadern || {};
  window.Quadern.Navigation = Navigation;

})();