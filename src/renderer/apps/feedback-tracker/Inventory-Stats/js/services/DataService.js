/**
 * InventoryDataService - Servicio simplificado que usa el DataService compartido
 * Utiliza exactamente la misma fuente de datos que feedback-tracker
 */

class InventoryDataService {
  constructor() {
    this.sharedDataService = null;
    this.isInitialized = false;
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

      // Si ya hay datos cargados en el servicio compartido, usarlos
      if (
        this.sharedDataService.errors &&
        this.sharedDataService.errors.length > 0
      ) {
        console.log(
          `InventoryDataService: Usando datos ya cargados (${this.sharedDataService.errors.length} errores)`
        );
        return {
          success: true,
          data: this.sharedDataService.errors,
          lastUpdate: this.sharedDataService.lastUpdateTime || new Date(),
        };
      }

      // Si no hay datos, intentar cargar
      const result = await this.sharedDataService.refreshData(true);

      if (result.success) {
        console.log(
          `InventoryDataService: Datos cargados exitosamente (${this.sharedDataService.errors.length} errores)`
        );
        return {
          success: true,
          data: this.sharedDataService.errors || [],
          lastUpdate: this.sharedDataService.lastUpdateTime || new Date(),
        };
      } else if (result.status === "no_errors_found") {
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
          error: `Error al cargar datos: ${result.status}`,
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
