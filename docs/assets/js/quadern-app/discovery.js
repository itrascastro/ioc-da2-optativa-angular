/*
  Quadern de Notes - Sistema de Descobriment d'Estructura
  Detecta i carrega l'estructura completa del curs
*/

;(function() {
  'use strict';

  const Discovery = {
    app: null,
    courseStructure: null,
    sectionsCache: new Map(),

    // =============================
    // INICIALITZACIÓ
    // =============================

    init(app) {
      this.app = app;
      console.log('🔍 Discovery: Inicialitzant sistema de descobriment...');
      console.log('✅ Discovery: Sistema inicialitzat');
    },

    // =============================
    // CÀRREGA D'ESTRUCTURA COMPLETA
    // =============================

    async loadCompleteStructure() {
      console.log('🔍 Discovery: Carregant estructura completa del curs...');
      
      try {
        // 1. Verificar dades del curs de Jekyll
        if (!window.courseData) {
          console.warn('🟨 Discovery: No s\'han trobat dades del curs');
          return this._fallbackToNotesStructure();
        }

        console.log('🔍 Discovery: Dades del curs trobades:', window.courseData);

        // 2. Construir estructura base
        const baseStructure = this._buildBaseStructure();
        
        // 3. Detectar seccions per cada bloc
        await this._detectSectionsForAllBlocks(baseStructure);
        
        // 4. Fusionar amb notes existents
        const completeStructure = this._mergeWithNotes(baseStructure);
        
        this.courseStructure = completeStructure;
        console.log('✅ Discovery: Estructura completa carregada');
        
        return completeStructure;
        
      } catch (error) {
        console.error('❌ Discovery: Error carregant estructura:', error);
        return this._fallbackToNotesStructure();
      }
    },

    _buildBaseStructure() {
      const structure = {};
      
      if (!window.courseData || !window.courseData.unitats) {
        return structure;
      }
      
      window.courseData.unitats.forEach(unitat => {
        const unitKey = `unitat-${unitat.numero}`;
        
        structure[unitKey] = {
          id: unitat.numero,
          nom: unitat.nom,
          descripcio: unitat.descripcio,
          noteCount: 0,
          blocs: {}
        };
        
        if (unitat.blocs) {
          unitat.blocs.forEach(bloc => {
            const blockKey = `bloc-${bloc.numero}`;
            
            structure[unitKey].blocs[blockKey] = {
              id: bloc.numero,
              nom: bloc.nom,
              descripcio: bloc.descripcio,
              url: bloc.url,
              noteCount: 0,
              seccions: {},
              isLoading: true // Indica que les seccions s'estan carregant
            };
          });
        }
      });
      
      return structure;
    },

    async _detectSectionsForAllBlocks(structure) {
      const promises = [];
      
      Object.values(structure).forEach(unitat => {
        Object.values(unitat.blocs).forEach(bloc => {
          if (bloc.url) {
            promises.push(this._detectSectionsForBlock(bloc));
          }
        });
      });
      
      await Promise.allSettled(promises);
    },

    async _detectSectionsForBlock(bloc) {
      try {
        console.log(`🔍 Discovery: Detectant seccions per ${bloc.nom}...`);
        
        // Comprovar cache
        if (this.sectionsCache.has(bloc.url)) {
          const cachedSections = this.sectionsCache.get(bloc.url);
          bloc.seccions = cachedSections;
          bloc.isLoading = false;
          return;
        }
        
        // Fer request per obtenir HTML de la pàgina
        const response = await fetch(bloc.url);
        if (!response.ok) {
          console.warn(`🟨 Discovery: No s'ha pogut carregar ${bloc.url}`);
          bloc.isLoading = false;
          return;
        }
        
        const html = await response.text();
        const sections = this._parseSectionsFromHTML(html, bloc.url);
        
        // Guardar al cache
        this.sectionsCache.set(bloc.url, sections);
        bloc.seccions = sections;
        bloc.isLoading = false;
        
        console.log(`✅ Discovery: Trobades ${Object.keys(sections).length} seccions a ${bloc.nom}`);
        
      } catch (error) {
        console.error(`❌ Discovery: Error detectant seccions per ${bloc.nom}:`, error);
        bloc.isLoading = false;
      }
    },

    _parseSectionsFromHTML(html, pageUrl) {
      const sections = {};
      
      try {
        // Crear un parser DOM temporal
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Buscar tots els H2 amb ID
        const h2Elements = doc.querySelectorAll('h2[id]');
        
        h2Elements.forEach((h2, index) => {
          const sectionId = h2.id;
          const sectionTitle = h2.textContent?.trim() || `Secció ${index + 1}`;
          
          sections[sectionId] = {
            id: sectionId,
            title: sectionTitle,
            pageUrl: pageUrl,
            notes: [],
            order: index
          };
        });
        
      } catch (error) {
        console.error('❌ Discovery: Error parsejant HTML:', error);
      }
      
      return sections;
    },

    _mergeWithNotes(baseStructure) {
      // Obtenir notes existents
      let existingNotes = [];
      if (window.Quadern && window.Quadern.Store) {
        const state = window.Quadern.Store.load();
        existingNotes = Object.values(state.notes.byId || {});
      }
      
      console.log(`🔍 Discovery: Fusionant amb ${existingNotes.length} notes existents`);
      
      // Associar notes amb seccions
      existingNotes.forEach(note => {
        const unitKey = `unitat-${note.unitat}`;
        const blockKey = `bloc-${note.bloc}`;
        const sectionId = note.sectionId;
        
        if (baseStructure[unitKey] && 
            baseStructure[unitKey].blocs[blockKey] && 
            baseStructure[unitKey].blocs[blockKey].seccions[sectionId]) {
          
          // Afegir nota a la secció
          baseStructure[unitKey].blocs[blockKey].seccions[sectionId].notes.push(note);
          
          // Actualitzar comptadors
          baseStructure[unitKey].blocs[blockKey].noteCount++;
          baseStructure[unitKey].noteCount++;
        } else {
          console.warn('🟨 Discovery: Nota òrfena trobada:', note.id, {
            unitat: note.unitat,
            bloc: note.bloc,
            sectionId: note.sectionId
          });
        }
      });
      
      return baseStructure;
    },

    // =============================
    // FALLBACK
    // =============================

    _fallbackToNotesStructure() {
      console.log('🔍 Discovery: Usant estructura basada només en notes (fallback)');
      
      // Retornar estructura simple basada només en notes existents
      let notes = [];
      if (window.Quadern && window.Quadern.Store) {
        const state = window.Quadern.Store.load();
        notes = Object.values(state.notes.byId || {});
      }
      
      const structure = {};
      
      notes.forEach(note => {
        const unitKey = `unitat-${note.unitat || '?'}`;
        const blockKey = `bloc-${note.bloc || '?'}`;
        
        if (!structure[unitKey]) {
          structure[unitKey] = {
            id: note.unitat || 0,
            nom: `Unitat ${note.unitat || '?'}`,
            descripcio: '',
            noteCount: 0,
            blocs: {}
          };
        }
        
        if (!structure[unitKey].blocs[blockKey]) {
          structure[unitKey].blocs[blockKey] = {
            id: note.bloc || 0,
            nom: `Bloc ${note.bloc || '?'}`,
            descripcio: '',
            url: note.pageUrl,
            noteCount: 0,
            seccions: {},
            isLoading: false
          };
        }
        
        const sectionId = note.sectionId || 'sense-seccio';
        if (!structure[unitKey].blocs[blockKey].seccions[sectionId]) {
          structure[unitKey].blocs[blockKey].seccions[sectionId] = {
            id: sectionId,
            title: note.sectionTitle || 'Sense títol',
            pageUrl: note.pageUrl,
            notes: [],
            order: 0
          };
        }
        
        structure[unitKey].blocs[blockKey].seccions[sectionId].notes.push(note);
        structure[unitKey].blocs[blockKey].noteCount++;
        structure[unitKey].noteCount++;
      });
      
      return structure;
    },

    // =============================
    // UTILITATS
    // =============================

    getCourseStructure() {
      return this.courseStructure;
    },

    getSectionsForBlock(unitId, blockId) {
      if (!this.courseStructure) return {};
      
      const unit = this.courseStructure[`unitat-${unitId}`];
      if (!unit) return {};
      
      const block = unit.blocs[`bloc-${blockId}`];
      if (!block) return {};
      
      return block.seccions || {};
    },

    getNotesForSection(unitId, blockId, sectionId) {
      const sections = this.getSectionsForBlock(unitId, blockId);
      const section = sections[sectionId];
      
      return section ? section.notes : [];
    },

    // Mètode per forçar refresh de seccions d'un bloc
    async refreshBlockSections(unitId, blockId) {
      if (!this.courseStructure) return;
      
      const unit = this.courseStructure[`unitat-${unitId}`];
      if (!unit) return;
      
      const block = unit.blocs[`bloc-${blockId}`];
      if (!block || !block.url) return;
      
      // Netejar cache
      this.sectionsCache.delete(block.url);
      
      // Re-detectar seccions
      await this._detectSectionsForBlock(block);
    },

    // Estadístiques d'estructura
    getStructureStats() {
      if (!this.courseStructure) return null;
      
      const stats = {
        unitats: 0,
        blocs: 0,
        seccions: 0,
        notes: 0,
        seccionsAmbNotes: 0
      };
      
      Object.values(this.courseStructure).forEach(unitat => {
        stats.unitats++;
        stats.notes += unitat.noteCount;
        
        Object.values(unitat.blocs).forEach(bloc => {
          stats.blocs++;
          
          Object.values(bloc.seccions).forEach(seccio => {
            stats.seccions++;
            if (seccio.notes.length > 0) {
              stats.seccionsAmbNotes++;
            }
          });
        });
      });
      
      return stats;
    }
  };

  // Exposar al namespace
  window.Quadern = window.Quadern || {};
  window.Quadern.Discovery = Discovery;

})();