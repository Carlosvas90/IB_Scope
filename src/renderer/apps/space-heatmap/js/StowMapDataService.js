/**
 * StowMapDataService
 * 
 * Servicio para cargar y acceder a los datos procesados de StowMap.
 * Los datos se procesan en Python y se guardan como JSONs pequeños
 * para carga rápida en el frontend.
 */

class StowMapDataService {
  constructor() {
    this.dataCache = {};
    this.dataPath = null;
    this.isLoaded = false;
  }

  /**
   * Inicializa el servicio obteniendo la ruta base de datos
   */
  async initialize() {
    try {
      if (!window.api || !window.api.getUserDataPath) {
        console.warn('[StowMapDataService] APIs no disponibles. Reinicia la aplicación.');
        return false;
      }

      const userDataPath = await window.api.getUserDataPath();
      this.dataPath = `${userDataPath}/data/space-heatmap/processed`;
      console.log('[StowMapDataService] Inicializado con ruta:', this.dataPath);
      return true;
    } catch (error) {
      console.error('[StowMapDataService] Error al inicializar:', error);
      return false;
    }
  }

  /**
   * Lee un archivo JSON procesado
   */
  async readJSON(filename) {
    try {
      if (!this.dataPath) {
        await this.initialize();
      }

      const filePath = `${this.dataPath}/${filename}`;
      
      if (!window.api || !window.api.readJson) {
        throw new Error('API readJson no disponible');
      }

      const data = await window.api.readJson(filePath);
      return data;
    } catch (error) {
      console.error(`[StowMapDataService] Error leyendo ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Carga todos los datos procesados en caché
   */
  async loadAll() {
    try {
      console.log('[StowMapDataService] Cargando todos los datos procesados...');
      
      const files = [
        'fullness_by_floor.json',
        'fullness_by_bintype.json',
        'fullness_by_mod.json',
        'fullness_by_shelf.json',
        'summary_stats.json',
        'heatmap_zones.json',
        'top_bins.json'
      ];

      const promises = files.map(file => 
        this.readJSON(file)
          .then(data => ({ file, data, success: true }))
          .catch(error => ({ file, error, success: false }))
      );

      const results = await Promise.all(promises);
      
      // Almacenar en caché
      results.forEach(result => {
        if (result.success) {
          const key = result.file.replace('.json', '');
          this.dataCache[key] = result.data;
          console.log(`[StowMapDataService] ✓ Cargado: ${result.file}`);
        } else {
          console.warn(`[StowMapDataService] ✗ Error: ${result.file}`, result.error);
        }
      });

      this.isLoaded = true;
      console.log('[StowMapDataService] Todos los datos cargados en caché');
      return true;
    } catch (error) {
      console.error('[StowMapDataService] Error al cargar datos:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas generales
   */
  getSummaryStats() {
    return this.dataCache['summary_stats'] || null;
  }

  /**
   * Obtiene fullness por piso
   */
  getFullnessByFloor() {
    return this.dataCache['fullness_by_floor'] || {};
  }

  /**
   * Obtiene fullness por tipo de bin
   */
  getFullnessByBinType() {
    return this.dataCache['fullness_by_bintype'] || {};
  }

  /**
   * Obtiene fullness por módulo
   */
  getFullnessByMod() {
    return this.dataCache['fullness_by_mod'] || {};
  }

  /**
   * Obtiene fullness por estante
   */
  getFullnessByShelf() {
    return this.dataCache['fullness_by_shelf'] || {};
  }

  /**
   * Obtiene datos del heatmap por zonas
   */
  getHeatmapZones() {
    return this.dataCache['heatmap_zones'] || {};
  }

  /**
   * Obtiene top bins (más utilizados, más unidades, etc.)
   */
  getTopBins() {
    return this.dataCache['top_bins'] || {};
  }

  /**
   * Verifica si los datos están cargados
   */
  isDataLoaded() {
    return this.isLoaded && Object.keys(this.dataCache).length > 0;
  }

  /**
   * Limpia la caché
   */
  clearCache() {
    this.dataCache = {};
    this.isLoaded = false;
    console.log('[StowMapDataService] Caché limpiada');
  }

  /**
   * Obtiene la fecha del último procesamiento
   */
  getLastProcessedDate() {
    const stats = this.getSummaryStats();
    if (stats && stats.processed_at) {
      return new Date(stats.processed_at);
    }
    return null;
  }

  /**
   * Formatea fecha de procesamiento
   */
  getFormattedProcessedDate() {
    const date = this.getLastProcessedDate();
    if (!date) return 'Desconocido';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 60) {
      return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}

// Crear y exportar instancia singleton
const stowMapDataService = new StowMapDataService();

// Hacer disponible globalmente INMEDIATAMENTE
window.StowMapDataService = stowMapDataService;

console.log('[StowMapDataService] Servicio cargado y disponible globalmente');

