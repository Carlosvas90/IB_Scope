/**
 * EstadisticasDataService.js (NUEVA VERSIÓN)
 * Servicio de datos para estadísticas usando JSONs pre-procesados
 * Reemplazo completo del servicio anterior que usaba DB
 */

import { AnalyticsJSONService } from "./AnalyticsJSONService.js";

export class EstadisticasDataService {
  constructor() {
    // Servicio principal (JSONs pre-procesados)
    this.analyticsJSONService = new AnalyticsJSONService();

    // Datos actuales
    this.currentAnalyticsData = null;
    this.currentDateRange = 0; // 0 = Hoy (por defecto)
    this.lastUpdateTime = null;

    // Estado
    this.isLoading = false;
    this.listeners = [];

    // Mantener por compatibilidad (deprecated)
    this.errors = [];

    console.log("📊 EstadisticasDataService inicializado (versión optimizada)");
  }

  /**
   * Inicializa el servicio
   */
  async init() {
    try {
      console.log("🔧 Inicializando EstadisticasDataService...");

      // Verificar que el servicio de analytics esté disponible
      const isAvailable = await this.analyticsJSONService.isAvailable();

      if (!isAvailable) {
        console.warn("⚠️ Analytics JSONs no disponibles");
        console.warn(
          "   Verifica que analytics_paths esté configurado en config.json"
        );
        return false;
      }

      // Cargar datos del periodo por defecto (Hoy)
      await this.changeDateRange(this.currentDateRange);

      console.log("✅ EstadisticasDataService inicializado correctamente");
      return true;
    } catch (error) {
      console.error("❌ Error inicializando EstadisticasDataService:", error);
      return false;
    }
  }

  /**
   * Cambia el rango de fechas y recarga los datos
   */
  async changeDateRange(newRange) {
    if (newRange === this.currentDateRange && this.currentAnalyticsData) {
      console.log("📅 Rango de fechas sin cambios");
      return true;
    }

    if (this.isLoading) {
      console.log("⏳ Ya hay una carga en progreso, esperando...");
      return false;
    }

    this.isLoading = true;
    console.log(`📥 Cargando datos para periodo: ${newRange} días`);

    try {
      // Obtener datos combinados (histórico + hoy) directamente del servicio
      this.currentAnalyticsData =
        await this.analyticsJSONService.getAnalyticsData(newRange);

      // Actualizar estado
      this.currentDateRange = newRange;
      this.lastUpdateTime = new Date();

      // Mantener compatibilidad: Extraer errors si existen
      // (Aunque ya no se usan directamente)
      this.errors = [];

      // Notificar a listeners
      this.notifyListeners();

      console.log(`✅ Datos cargados para ${newRange} días`);
      console.log(
        `   Total incidentes: ${this.currentAnalyticsData.kpis.total_incidents}`
      );
      console.log(
        `   Registros: ${this.currentAnalyticsData.metadata.total_records}`
      );

      return true;
    } catch (error) {
      console.error("❌ Error cambiando rango de fechas:", error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Recarga los datos del periodo actual
   */
  async refresh() {
    console.log("🔄 Refrescando datos...");

    // Limpiar caché para forzar recarga
    this.analyticsJSONService.clearCache();

    // Recargar datos
    const previousRange = this.currentDateRange;
    this.currentDateRange = -1; // Forzar recarga
    return await this.changeDateRange(previousRange);
  }

  // ==================== GETTERS PARA DATOS PROCESADOS ====================

  /**
   * Obtiene los KPIs actuales
   */
  getKPIs() {
    return (
      this.currentAnalyticsData?.kpis || {
        total_incidents: 0,
        pending: 0,
        resolved: 0,
        resolution_rate: 0,
        daily_average: 0,
      }
    );
  }

  /**
   * Obtiene las tendencias (por día y por hora)
   */
  getTrends() {
    return (
      this.currentAnalyticsData?.trends || {
        by_day: [],
        by_hour: [],
      }
    );
  }

  /**
   * Obtiene los datos de distribución
   */
  getDistribution() {
    return (
      this.currentAnalyticsData?.distribution || {
        by_status: [],
      }
    );
  }

  /**
   * Obtiene los top ASINs
   */
  getTopASINs() {
    return this.currentAnalyticsData?.top_asins || [];
  }

  /**
   * Obtiene las top violaciones
   */
  getTopViolations() {
    return this.currentAnalyticsData?.top_violations || [];
  }

  /**
   * Obtiene los top motivos
   */
  getTopMotives() {
    return this.currentAnalyticsData?.top_motives || [];
  }

  /**
   * Obtiene los top offenders (usuarios con más errores)
   */
  getTopOffenders() {
    return this.currentAnalyticsData?.top_offenders || [];
  }

  /**
   * Obtiene los insights automáticos
   */
  getInsights() {
    return this.currentAnalyticsData?.insights || null;
  }

  /**
   * Obtiene los metadatos del periodo actual
   */
  getMetadata() {
    return this.currentAnalyticsData?.metadata || {};
  }

  /**
   * Obtiene todos los datos completos
   */
  getAllData() {
    return this.currentAnalyticsData;
  }

  // ==================== COMPATIBILIDAD CON CÓDIGO ANTIGUO ====================

  /**
   * @deprecated Usar getKPIs() en su lugar
   * Mantener por compatibilidad con código existente
   */
  async loadData() {
    console.warn(
      "⚠️ loadData() está deprecated, usar changeDateRange() en su lugar"
    );
    return await this.changeDateRange(this.currentDateRange);
  }

  /**
   * @deprecated Ya no es necesario con JSONs
   * Mantener por compatibilidad
   */
  async getDatabaseStats() {
    console.warn("⚠️ getDatabaseStats() está deprecated");
    return null;
  }

  /**
   * @deprecated Ya no es necesario con JSONs
   * Mantener por compatibilidad
   */
  async getAvailableDates() {
    console.warn("⚠️ getAvailableDates() está deprecated");
    return [];
  }

  /**
   * @deprecated Ya no es necesario con JSONs
   * Mantener por compatibilidad
   */
  async isHistoricalDataAvailable() {
    console.warn("⚠️ isHistoricalDataAvailable() está deprecated");
    return await this.analyticsJSONService.isAvailable();
  }

  /**
   * Obtiene las opciones de rango de fechas disponibles
   */
  getAvailableDateRanges() {
    return [
      { value: 0, label: "Hoy", days: 0 },
      { value: 3, label: "Últimos 3 días", days: 3 },
      { value: 7, label: "Última semana", days: 7 },
      { value: 30, label: "Último mes", days: 30 },
      { value: 90, label: "Últimos 3 meses", days: 90 },
      { value: 180, label: "Últimos 6 meses", days: 180 },
    ];
  }

  /**
   * Obtiene el rango de fechas actual
   */
  getCurrentDateRange() {
    return this.currentDateRange;
  }

  // ==================== SISTEMA DE EVENTOS ====================

  /**
   * Registra un listener para cambios en los datos
   */
  addListener(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
    }
  }

  /**
   * Elimina un listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  /**
   * Notifica a todos los listeners
   */
  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.currentAnalyticsData);
      } catch (error) {
        console.error("❌ Error en listener:", error);
      }
    });
  }

  // ==================== UTILIDADES ====================

  /**
   * Verifica si hay datos cargados
   */
  hasData() {
    return this.currentAnalyticsData !== null;
  }

  /**
   * Verifica si está cargando
   */
  isLoadingData() {
    return this.isLoading;
  }

  /**
   * Obtiene la última fecha de actualización
   */
  getLastUpdateTime() {
    return this.lastUpdateTime;
  }

  /**
   * Limpia el caché del servicio
   */
  clearCache() {
    this.analyticsJSONService.clearCache();
    console.log("🗑️ Caché limpiado");
  }

  /**
   * Cierra el servicio y libera recursos
   */
  async close() {
    console.log("🔌 Cerrando EstadisticasDataService...");
    this.listeners = [];
    this.currentAnalyticsData = null;
    this.analyticsJSONService.clearCache();
    console.log("✅ EstadisticasDataService cerrado");
  }
}
