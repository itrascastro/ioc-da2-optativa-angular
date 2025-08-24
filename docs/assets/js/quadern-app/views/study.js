/*
  Quadern de Notes - Vista Estudi
  Mode d'estudi i repàs de notes
*/

;(function() {
  'use strict';

  const Study = {
    app: null,

    init(app) {
      this.app = app;
      console.log('📚 Study: Inicialitzant vista d\'estudi...');
      console.log('✅ Study: Vista inicialitzada');
    },

    refreshData() {
      // Implementació futura
    }
  };

  window.Quadern = window.Quadern || {};
  window.Quadern.Study = Study;

})();