/**
 * InventoryDataService - Servicio simplificado que usa el DataService compartido
 * Utiliza exactamente la misma fuente de datos que feedback-tracker
 */

class InventoryDataService {
  constructor() {
    this.sharedDataService = null;
    this.isInitialized = false;
    this.dpmoData = null;
    this.lastDpmoUpdate = null;
  }

  /**
   * Inicializa el servicio obteniendo referencia al DataService compartido
   */
  init() {
    try {
      // Usar el mismo DataService que usa feedback-tracker
      if (window.inboundScope && window.inboundScope.dataService) {
        this.sharedDataService = window.inboundScope.dataService;
        this.isInitialized = true;
        console.log(
          "InventoryDataService: Conectado al DataService compartido"
        );
        return true;
      } else {
        console.warn(
          "InventoryDataService: DataService compartido no disponible"
        );
        return false;
      }
    } catch (error) {
      console.error("InventoryDataService: Error en inicialización:", error);
      return false;
    }
  }

  /**
   * Carga los datos usando el DataService compartido
   * @returns {Promise<Object>} Resultado con datos o error
   */
  async loadTodayData() {
    if (!this.isInitialized) {
      const initSuccess = this.init();
      if (!initSuccess) {
        return {
          success: false,
          error: "No se pudo conectar al DataService compartido",
        };
      }
    }

    try {
      console.log(
        "InventoryDataService: Cargando datos desde DataService compartido..."
      );

      // Siempre intentar refrescar los datos primero para asegurar que tenemos los más recientes
      console.log("InventoryDataService: Forzando actualización de datos...");
      const refreshResult = await this.sharedDataService.refreshData(true);

      if (refreshResult.success || refreshResult.status === "no_errors_found") {
        // Analizar los datos para depuración
        const errors = this.sharedDataService.errors || [];

        // Mostrar los estados únicos que existen
        const uniqueStatuses = [...new Set(errors.map((e) => e.status))];
        console.log(
          "InventoryDataService: Estados únicos encontrados:",
          uniqueStatuses
        );

        // Consideramos resueltos usando múltiples criterios
        const resolvedCount = errors.filter(
          (e) =>
            // Propiedad principal del sistema
            e.feedback_status === "done" ||
            e.feedback_status === "completed" ||
            // Status alternativos por compatibilidad
            e.status === "done" ||
            e.status === "completed" ||
            e.status === 1 ||
            e.status === "1" ||
            // Propiedades adicionales
            e.resolved === true ||
            e.resolved === "true" ||
            e.resolved === 1 ||
            e.resolved === "1" ||
            e.is_resolved === true ||
            e.is_resolved === "true" ||
            e.is_resolved === 1 ||
            e.is_resolved === "1" ||
            // Fechas de resolución (incluyendo feedback_date)
            (e.feedback_date && e.feedback_date !== "") ||
            (e.done_date && e.done_date !== "") ||
            (e.resolved_date && e.resolved_date !== "")
        ).length;
        const pendingCount = errors.length - resolvedCount;

        console.log(
          `InventoryDataService: Datos actualizados (${errors.length} errores, ${pendingCount} pendientes, ${resolvedCount} resueltos)`
        );

        return {
          success: true,
          data: errors,
          lastUpdate: this.sharedDataService.lastUpdateTime || new Date(),
        };
      } else if (
        this.sharedDataService.errors &&
        this.sharedDataService.errors.length > 0
      ) {
        // Si falló la actualización pero hay datos previos, usarlos
        console.log(
          `InventoryDataService: Usando datos previos (${this.sharedDataService.errors.length} errores)`
        );
        return {
          success: true,
          data: this.sharedDataService.errors,
          lastUpdate: this.sharedDataService.lastUpdateTime || new Date(),
        };
      } else if (refreshResult.status === "no_errors_found") {
        console.log("InventoryDataService: No hay errores para hoy");
        return {
          success: true,
          data: [],
          lastUpdate: new Date(),
          message: "No hay errores registrados para hoy",
        };
      } else {
        return {
          success: false,
          error: `Error al cargar datos: ${
            refreshResult.status || "desconocido"
          }`,
        };
      }
    } catch (error) {
      console.error("InventoryDataService: Error al cargar datos:", error);
      return {
        success: false,
        error: error.message || "Error desconocido al cargar datos",
      };
    }
  }

  /**
   * Obtiene los datos actuales del servicio compartido
   * @returns {Array} Array de errores
   */
  getCurrentData() {
    if (!this.isInitialized || !this.sharedDataService) {
      return [];
    }
    return this.sharedDataService.errors || [];
  }

  /**
   * Obtiene la fecha de última actualización
   * @returns {Date|null} Fecha de última actualización
   */
  getLastUpdate() {
    if (!this.isInitialized || !this.sharedDataService) {
      return null;
    }
    return this.sharedDataService.lastUpdateTime;
  }

  /**
   * Verifica si hay datos disponibles
   * @returns {boolean} True si hay datos
   */
  hasData() {
    const data = this.getCurrentData();
    return data.length > 0;
  }

  /**
   * Carga los datos de DPMO desde un archivo separado
   * @returns {Promise<Object>} Resultado con datos o error
   */
  async loadDPMOData() {
    if (!this.isInitialized) {
      const initSuccess = this.init();
      if (!initSuccess) {
        return {
          success: false,
          error: "No se pudo conectar al DataService compartido",
        };
      }
    }

    try {
      console.log("InventoryDataService: Cargando datos DPMO...");

      // Obtener la fecha actual en formato DDMMYYYY (igual que el formato del ejemplo)
      const today = new Date();
      const day = String(today.getDate()).padStart(2, "0");
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const year = today.getFullYear();

      // Construir el nombre del archivo (formato: Errors_DPMO_DDMMYYYY.json)
      const dpmoFileName = `Errors_DPMO_${day}${month}${year}.json`;

      console.log(
        `InventoryDataService: Intentando leer archivo: ${dpmoFileName}`
      );

      // Usar la API de Electron para leer el archivo
      if (!window.api || !window.api.readJson) {
        throw new Error("API de Electron no disponible");
      }

      // Obtenemos las rutas de datos del DataService compartido (igual que para los errores)
      const dataPaths = this.sharedDataService?.dataPaths || [];
      const currentDataPath = this.sharedDataService?.currentDataPath || null;

      console.log(
        "InventoryDataService: Rutas de datos disponibles:",
        dataPaths
      );
      console.log("InventoryDataService: Ruta actual:", currentDataPath);

      // Ordenar las rutas para intentar primero la ruta actual
      const orderedPaths = [];
      if (currentDataPath) {
        orderedPaths.push(currentDataPath);
      }

      dataPaths.forEach((path) => {
        if (path && !orderedPaths.includes(path)) {
          orderedPaths.push(path);
        }
      });

      if (orderedPaths.length === 0) {
        console.warn(
          "InventoryDataService: No hay rutas de datos configuradas"
        );
        return {
          success: false,
          error: "No hay rutas de datos configuradas",
        };
      }

      console.log(
        "InventoryDataService: Intentando leer desde rutas:",
        orderedPaths
      );

      // Intentar leer el archivo desde cada ruta
      let result = null;
      let pathUsed = null;

      for (const dirPath of orderedPaths) {
        try {
          // Construir ruta completa
          const fullPath = `${dirPath}${dpmoFileName}`;
          console.log(
            `InventoryDataService: Intentando leer desde: ${fullPath}`
          );

          const fileResult = await window.api.readJson(fullPath);
          if (fileResult.success) {
            result = fileResult;
            pathUsed = dirPath;
            break;
          }
        } catch (error) {
          console.warn(`Error al leer desde ${dirPath}:`, error);
          // Continuar con la siguiente ruta
        }
      }

      if (result && result.success) {
        console.log(
          `InventoryDataService: Datos DPMO cargados exitosamente desde ${pathUsed}${dpmoFileName}`,
          result.data
        );
        this.dpmoData = result.data;
        this.lastDpmoUpdate = new Date();
        return {
          success: true,
          data: this.dpmoData,
          lastUpdate: this.lastDpmoUpdate,
        };
      } else {
        console.warn(
          "InventoryDataService: No se encontraron datos DPMO en ninguna ruta"
        );
        return {
          success: false,
          error: "No se encontraron datos DPMO",
        };
      }
    } catch (error) {
      console.error("InventoryDataService: Error al cargar datos DPMO:", error);
      return {
        success: false,
        error: error.message || "Error desconocido al cargar datos DPMO",
      };
    }
  }

  /**
   * Obtiene los datos DPMO actuales
   * @returns {Object|null} Datos DPMO o null si no hay datos
   */
  getCurrentDPMOData() {
    return this.dpmoData;
  }

  /**
   * Obtiene estadísticas básicas de los datos
   * @returns {Object} Estadísticas básicas
   */
  getBasicStats() {
    const errors = this.getCurrentData();

    if (errors.length === 0) {
      return {
        total: 0,
        pending: 0,
        resolved: 0,
        dataAvailable: false,
      };
    }

    const stats = {
      total: errors.length,
      pending: 0,
      resolved: 0,
      dataAvailable: true,
    };

    // Contar por estado
    errors.forEach((error) => {
      if (error.status === "done") {
        stats.resolved++;
      } else {
        stats.pending++;
      }
    });

    return stats;
  }
}

// Exportar la clase como módulo ES6
export { InventoryDataService };
