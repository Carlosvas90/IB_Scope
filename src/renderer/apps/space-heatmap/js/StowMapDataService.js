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
      if (!window.api) {
        console.warn('[StowMapDataService] APIs no disponibles. Reinicia la aplicación.');
        return false;
      }

      // Usar userData (roaming) como debe ser
      if (!window.api.getUserDataPath) {
        console.warn('[StowMapDataService] getUserDataPath no disponible.');
        return false;
      }

      const userDataPath = await window.api.getUserDataPath();
      this.dataPath = `${userDataPath}/data/space-heatmap/processed`;
      console.log('[StowMapDataService] MODO BUILD: Usando ruta userData:', this.dataPath);
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

      const result = await window.api.readJson(filePath);
      // readJson devuelve { success: true, data: {...} } o { success: false, error: "..." }
      if (result && result.success && result.data) {
        return result.data;
      } else if (result && result.success) {
        // Si no tiene .data pero success es true, puede que sea el objeto directamente
        return result;
      } else {
        throw new Error(result?.error || 'Error desconocido al leer JSON');
      }
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
      
      // Cargar archivos JSON generados
      const files = [
        'fullness_by_bintype.json',
        'summary_kpis.json'
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
   * Obtiene estadísticas generales (deprecated, usar getSummaryKPIs)
   */
  getSummaryStats() {
    return this.dataCache['summary_stats'] || null;
  }

  /**
   * Obtiene KPIs generales calculados
   */
  getSummaryKPIs() {
    return this.dataCache['summary_kpis'] || null;
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

  /**
   * Busca bins disponibles más cercanas a una posición (pasillo) en un piso específico
   * @param {number} floor - Número de piso (1-5)
   * @param {number} currentAisle - Número de pasillo actual (ej: 245)
   * @param {Object} options - Opciones de búsqueda
   * @param {number} options.maxResults - Máximo de resultados (default: 20)
   * @param {number} options.maxDistance - Distancia máxima en pasillos (default: 50)
   * @param {number} options.maxUtilization - Utilization máxima permitida (default: 0.8 = 80%)
   * @param {string} options.binType - Filtrar por tipo de bin (opcional)
   * @returns {Array} Array de bins ordenadas por proximidad y luego por utilization
   */
  findNearestAvailableBins(floor, currentAisle, options = {}) {
    const {
      maxResults = options.maxResults || 20,
      maxDistance = 50,
      maxUtilization = 0.8,
      binType = null
    } = options;

    const availableBins = this.dataCache['available_bins_for_search'];
    if (!availableBins) {
      console.warn('[StowMapDataService] available_bins_for_search no está cargado');
      return [];
    }

    const floorData = availableBins[floor];
    if (!floorData || !floorData.bins) {
      console.warn(`[StowMapDataService] No hay datos para el piso ${floor}`);
      return [];
    }

    // Filtrar y calcular distancias
    const binsWithDistance = floorData.bins
      .filter(bin => {
        // Filtrar por utilization máxima
        if (bin.u > maxUtilization) return false;
        
        // Filtrar por tipo de bin si se especifica
        if (binType && bin.bt !== binType) return false;
        
        // Calcular distancia
        const distance = Math.abs(bin.a - currentAisle);
        return distance <= maxDistance;
      })
      .map(bin => {
        const distance = Math.abs(bin.a - currentAisle);
        return {
          ...bin,
          distance,
          // Expandir campos abreviados para uso
          bin_id: bin.b,
          bay_id: bin.bay,
          mod: bin.m,
          aisle_number: bin.a,
          utilization: bin.u,
          bin_type: bin.bt,
          shelf: bin.s || null,
          total_units: bin.tu || 0
        };
      })
      .sort((a, b) => {
        // Ordenar primero por distancia, luego por utilization
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        return a.utilization - b.utilization;
      })
      .slice(0, maxResults);

    return binsWithDistance;
  }

  /**
   * Busca bins disponibles con menor fullness en un piso
   * @param {number} floor - Número de piso (1-5)
   * @param {Object} options - Opciones de búsqueda
   * @param {number} options.maxResults - Máximo de resultados (default: 20)
   * @param {number} options.maxUtilization - Utilization máxima permitida (default: 0.8)
   * @returns {Array} Array de bins ordenadas por utilization (menor primero)
   */
  findLowestFullnessBins(floor, options = {}) {
    const {
      maxResults = options.maxResults || 20,
      maxUtilization = 0.8
    } = options;

    const availableBins = this.dataCache['available_bins_for_search'];
    if (!availableBins) {
      console.warn('[StowMapDataService] available_bins_for_search no está cargado');
      return [];
    }

    const floorData = availableBins[floor];
    if (!floorData || !floorData.bins) {
      return [];
    }

    // Los bins ya están ordenados por utilization (menor primero)
    return floorData.bins
      .filter(bin => bin.u <= maxUtilization)
      .slice(0, maxResults)
      .map(bin => ({
        ...bin,
        bin_id: bin.b,
        bay_id: bin.bay,
        mod: bin.m,
        aisle_number: bin.a,
        utilization: bin.u,
        bin_type: bin.bt,
        shelf: bin.s || null,
        total_units: bin.tu || 0
      }));
  }

  /**
   * Obtiene datos de bins disponibles para un piso
   * @param {number} floor - Número de piso (1-5)
   * @returns {Object|null} Datos del piso o null si no existe
   */
  getAvailableBinsByFloor(floor) {
    const availableBins = this.dataCache['available_bins_for_search'];
    if (!availableBins) return null;
    return availableBins[floor] || null;
  }
}

// Crear y exportar instancia singleton
const stowMapDataService = new StowMapDataService();

// Hacer disponible globalmente INMEDIATAMENTE
window.StowMapDataService = stowMapDataService;

console.log('[StowMapDataService] Servicio cargado y disponible globalmente');

