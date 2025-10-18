/**
 * EstadisticasDataService.js
 * Servicio de datos específico para estadísticas
 * ACTUALIZADO: Usa AnalyticsJSONService para leer JSONs pre-procesados (no más DB)
 */

import { AnalyticsJSONService } from "./AnalyticsJSONService.js";

export class EstadisticasDataService {
  constructor() {
    this.errors = []; // Mantener para compatibilidad
    this.lastUpdateTime = null;
    this.isLoading = false;
    this.listeners = [];

    // NUEVO: Servicio de analytics optimizado (JSONs pre-procesados)
    this.analyticsJSONService = new AnalyticsJSONService();
    this.currentDateRange = 0; // 0 = Hoy (por defecto)
    this.currentAnalyticsData = null; // Datos combinados y procesados

    console.log("📊 EstadisticasDataService inicializado (versión optimizada)");
  }

  /**
   * Inicializa el servicio obteniendo configuración del sistema principal
   */
  async init() {
    try {
      console.log("🔧 Inicializando EstadisticasDataService...");

      // Obtener configuración del sistema principal si está disponible
      if (window.inboundScope && window.inboundScope.dataService) {
        const mainDataService = window.inboundScope.dataService;
        this.dataPaths = mainDataService.dataPaths || [];
        this.currentDataPath = mainDataService.currentDataPath;
        console.log("✅ Configuración obtenida del DataService principal");
      } else {
        // Fallback: obtener configuración directamente
        await this.loadConfig();
      }

      // NUEVO: Inicializar servicio de datos históricos
      console.log("🔧 Inicializando servicio de datos históricos...");
      const historicalInitialized = await this.historicalDataService.init();
      if (historicalInitialized) {
        console.log("✅ Servicio de datos históricos inicializado");
      } else {
        console.warn("⚠️ Servicio de datos históricos no disponible");
      }

      // Establecer rango de fechas por defecto (Hoy = 0)
      this.currentDateRange = 0;

      console.log("📁 Rutas de datos configuradas:", this.dataPaths);
      return true;
    } catch (error) {
      console.error("❌ Error inicializando EstadisticasDataService:", error);
      return false;
    }
  }

  /**
   * Carga configuración directamente si no está disponible el servicio principal
   */
  async loadConfig() {
    try {
      const config = await window.api.getConfig();
      if (config && config.data_paths) {
        this.dataPaths = config.data_paths;
        console.log("✅ Configuración cargada directamente");
      } else {
        console.warn(
          "⚠️ No se pudo cargar configuración, usando rutas por defecto"
        );
        this.dataPaths = [];
      }
    } catch (error) {
      console.warn("⚠️ Error cargando configuración:", error);
      this.dataPaths = [];
    }
  }

  /**
   * Espera a que inboundScope esté disponible (máximo 5 segundos)
   */
  async waitForInboundScope(timeout = 5000) {
    return new Promise((resolve) => {
      if (window.inboundScope && window.inboundScope.dataService) {
        resolve(true);
        return;
      }

      let elapsed = 0;
      const interval = 100;

      const checkInterval = setInterval(() => {
        elapsed += interval;

        if (window.inboundScope && window.inboundScope.dataService) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (elapsed >= timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, interval);
    });
  }

  /**
   * Carga los datos de errores
   */
  async loadData() {
    if (this.isLoading) {
      console.log("⏳ Ya hay una carga en progreso...");
      return false;
    }

    this.isLoading = true;
    console.log("📥 Iniciando carga de datos para estadísticas...");

    try {
      // Esperar a que inboundScope esté disponible
      console.log("⏳ Esperando a que inboundScope esté disponible...");
      const scopeAvailable = await this.waitForInboundScope();

      // Intentar obtener datos del servicio principal primero (más rápido)
      if (
        scopeAvailable &&
        window.inboundScope &&
        window.inboundScope.dataService
      ) {
        const mainDataService = window.inboundScope.dataService;

        try {
          // Asegurar que el servicio principal esté inicializado
          await mainDataService.ensureInitialized();

          if (mainDataService.errors.length > 0) {
            console.log("🚀 Usando datos del servicio principal (caché)");
            this.errors = [...mainDataService.errors];
            this.lastUpdateTime = mainDataService.lastUpdateTime;
            this.notifyListeners();
            return true;
          } else {
            // Intentar cargar datos en el servicio principal
            console.log(
              "📥 Intentando cargar datos en el servicio principal..."
            );
            const loaded = await mainDataService.loadInitialData();
            if (loaded && mainDataService.errors.length > 0) {
              console.log("🚀 Datos cargados en el servicio principal");
              this.errors = [...mainDataService.errors];
              this.lastUpdateTime = mainDataService.lastUpdateTime;
              this.notifyListeners();
              return true;
            }
          }
        } catch (error) {
          console.warn("⚠️ Error con el servicio principal:", error);
          // Continuar con carga directa
        }
      }

      // Si no hay datos en el servicio principal, cargar directamente
      console.log("📂 Cargando datos directamente desde archivo...");
      const result = await this.readDataFile();

      if (result.success) {
        this.errors = result.data.errors || [];
        this.lastUpdateTime = new Date();
        this.normalizeData();
        this.notifyListeners();
        console.log(`✅ Datos cargados: ${this.errors.length} registros`);
        return true;
      } else {
        console.error("❌ Error cargando datos:", result.error);
        return false;
      }
    } catch (error) {
      console.error("❌ Error en loadData:", error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Lee el archivo de datos desde las rutas configuradas
   */
  async readDataFile() {
    // Intentar primero con la ruta actual si está disponible (más eficiente)
    if (this.currentDataPath) {
      try {
        console.log(
          `🎯 Intentando leer desde ruta actual: ${this.currentDataPath}`
        );
        const filePath = `${this.currentDataPath}/${this.fileName}`;
        const data = await window.api.readJson(filePath);

        if (data) {
          console.log(
            `✅ Archivo leído exitosamente desde ruta actual: ${this.currentDataPath}`
          );
          return { success: true, data };
        }
      } catch (error) {
        console.warn(
          `⚠️ Error leyendo desde ruta actual ${this.currentDataPath}:`,
          error.message
        );
        // Continuar con el resto de rutas
      }
    }

    // Intentar con todas las rutas configuradas
    for (const dataPath of this.dataPaths) {
      // Saltar la ruta actual si ya se intentó
      if (dataPath === this.currentDataPath) {
        continue;
      }

      try {
        console.log(`🔍 Intentando leer desde: ${dataPath}`);
        const filePath = `${dataPath}/${this.fileName}`;
        const data = await window.api.readJson(filePath);

        if (data) {
          console.log(`✅ Archivo leído exitosamente desde: ${dataPath}`);
          this.currentDataPath = dataPath;
          return { success: true, data };
        }
      } catch (error) {
        console.warn(`⚠️ Error leyendo desde ${dataPath}:`, error.message);
        continue;
      }
    }

    return {
      success: false,
      error: "No se pudo leer el archivo desde ninguna ruta configurada",
    };
  }

  /**
   * Normaliza los datos para asegurar consistencia
   */
  normalizeData() {
    this.errors.forEach((error) => {
      // Normalizar feedback_status
      error.feedback_status = (
        error.feedback_status || "pending"
      ).toLowerCase();

      // Asegurar que quantity existe
      error.quantity = error.quantity || 1;

      // Normalizar occurrences
      if (!Array.isArray(error.occurrences)) {
        error.occurrences = [{ date: error.date, time: error.time }];
      }

      // Asegurar campos de feedback
      error.feedback_user = error.feedback_user || "";
      error.feedback_comment = error.feedback_comment || "";
      error.times_notified = error.times_notified || 0;
    });

    console.log("🔧 Datos normalizados");
  }

  /**
   * Obtiene estadísticas básicas
   */
  getBasicStats() {
    const stats = {
      total: 0,
      totalLines: this.errors.length,
      pending: 0,
      done: 0,
      byUser: {},
      byViolation: {},
      byAsin: {},
      byDate: {},
    };

    this.errors.forEach((error) => {
      const quantity = error.quantity || 1;
      stats.total += quantity;

      if (error.feedback_status === "done") {
        stats.done += quantity;
      } else {
        stats.pending += quantity;
      }

      // Por usuario
      stats.byUser[error.user_id] =
        (stats.byUser[error.user_id] || 0) + quantity;

      // Por violación
      stats.byViolation[error.violation] =
        (stats.byViolation[error.violation] || 0) + quantity;

      // Por ASIN
      stats.byAsin[error.asin] = (stats.byAsin[error.asin] || 0) + quantity;

      // Por fecha
      stats.byDate[error.date] = (stats.byDate[error.date] || 0) + quantity;
    });

    return stats;
  }

  /**
   * Filtra errores por rango de fechas
   */
  filterByDateRange(days = 30) {
    if (days === 0) {
      // Solo hoy
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "/");
      return this.errors.filter((error) => error.date === today);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.errors.filter((error) => {
      const errorDate = new Date(error.date.replace(/\//g, "-"));
      return errorDate >= cutoffDate;
    });
  }

  /**
   * Registra un listener para cambios en los datos
   */
  onDataUpdate(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notifica a todos los listeners
   */
  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.errors);
      } catch (error) {
        console.error("Error en listener:", error);
      }
    });
  }

  /**
   * Obtiene la fecha de última actualización formateada
   */
  getLastUpdateFormatted() {
    if (!this.lastUpdateTime) return "Nunca";
    return this.lastUpdateTime.toLocaleString();
  }

  /**
   * Refresca los datos
   */
  async refresh() {
    console.log("🔄 Refrescando datos de estadísticas...");

    // Si hay un rango de fechas específico seleccionado, usar loadHistoricalData
    if (this.currentDateRange && this.currentDateRange > 0) {
      console.log(
        `📅 Refrescando con rango histórico: ${this.currentDateRange} días`
      );
      return await this.loadHistoricalData(this.currentDateRange);
    }

    // Si es "Hoy" (rango 0), usar loadData normal
    return await this.loadData();
  }

  /**
   * NUEVO: Cambia el rango de fechas y carga datos históricos si es necesario
   */
  async changeDateRange(newRange) {
    console.log(
      "🔧 VERSIÓN ACTUALIZADA - EstadisticasDataService.changeDateRange"
    );
    if (newRange === this.currentDateRange) {
      console.log("📅 Rango de fechas sin cambios");
      return true;
    }

    if (this.isLoading) {
      console.log("⏳ Ya hay una carga en progreso, esperando...");
      return false;
    }

    console.log(`📅 Cambiando rango de fechas a: ${newRange} días`);
    this.currentDateRange = newRange;

    // Si es rango 0 (hoy), cargar solo datos actuales
    if (newRange === 0) {
      console.log("📅 Cargando solo datos de hoy...");
      return await this.loadData();
    }

    // Para rangos históricos, cargar datos de la base de datos
    console.log("📅 Cargando datos históricos...");
    return await this.loadHistoricalData(newRange);
  }

  /**
   * NUEVO: Carga datos históricos desde la base de datos
   */
  async loadHistoricalData(dateRange) {
    console.log(
      "🔧 VERSIÓN ACTUALIZADA - EstadisticasDataService.loadHistoricalData"
    );
    if (this.isLoading) {
      console.log("⏳ Ya hay una carga en progreso...");
      return false;
    }

    this.isLoading = true;
    console.log(`📥 Cargando datos históricos para ${dateRange} días...`);

    try {
      // Si es rango 0 (hoy), solo cargar datos actuales
      if (dateRange === 0) {
        console.log("📅 Rango 0: Cargando solo datos actuales de hoy");
        return await this.loadData();
      }

      // Verificar si el servicio histórico está disponible
      const isHistoricalAvailable =
        await this.historicalDataService.isDatabaseAvailable();

      if (!isHistoricalAvailable) {
        console.warn(
          "⚠️ Servicio de datos históricos no disponible, cargando solo datos actuales"
        );
        return await this.loadData();
      }

      // Obtener datos históricos del DB (excluyendo hoy)
      this.historicalData = await this.historicalDataService.getHistoricalData(
        dateRange
      );

      // Cargar datos actuales del JSON (solo hoy)
      const currentDataLoaded = await this.loadData();

      if (currentDataLoaded) {
        // Combinar datos históricos (DB) con datos actuales (JSON de hoy)
        this.errors = this.historicalDataService.combineWithCurrentData(
          this.historicalData,
          this.errors
        );

        this.lastUpdateTime = new Date();
        this.normalizeData();
        this.notifyListeners();

        console.log(
          `✅ Datos combinados cargados: ${
            this.historicalData.errorTracking.length
          } históricos + ${
            this.errors.filter((e) => !e.isHistorical).length
          } actuales = ${this.errors.length} total`
        );

        // Log de verificación
        console.log("📊 Resumen de datos cargados:");
        console.log(
          `- Históricos (DB): ${this.historicalData.errorTracking.length} registros`
        );
        console.log(
          `- Actuales (JSON): ${
            this.errors.filter((e) => !e.isHistorical).length
          } registros`
        );
        console.log(`- Total combinado: ${this.errors.length} registros`);

        return true;
      } else {
        // Si no se pueden cargar datos actuales, usar solo históricos
        this.errors = this.historicalData.errorTracking;
        this.lastUpdateTime = new Date();
        this.normalizeData();
        this.notifyListeners();

        console.log(
          `✅ Solo datos históricos cargados: ${this.errors.length} registros`
        );
        return true;
      }
    } catch (error) {
      console.error("❌ Error cargando datos históricos:", error);
      console.error("❌ Tipo de error:", error.constructor.name);
      console.error("❌ Mensaje:", error.message);
      console.error("❌ Stack:", error.stack);

      // Fallback a datos actuales
      console.log("🔄 Fallback a datos actuales...");
      this.isLoading = false; // Resetear flag antes del fallback

      try {
        return await this.loadData();
      } catch (fallbackError) {
        console.error("❌ Error en fallback a datos actuales:", fallbackError);
        this.isLoading = false;
        return false;
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * NUEVO: Obtiene estadísticas de la base de datos
   */
  async getDatabaseStats() {
    try {
      return await this.historicalDataService.getDatabaseStats();
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas de DB:", error);
      return null;
    }
  }

  /**
   * NUEVO: Obtiene las fechas disponibles en la base de datos
   */
  async getAvailableDates() {
    try {
      return await this.historicalDataService.getAvailableDates();
    } catch (error) {
      console.error("❌ Error obteniendo fechas disponibles:", error);
      return [];
    }
  }

  /**
   * NUEVO: Obtiene opciones de rango de fechas disponibles
   */
  getAvailableDateRanges() {
    return this.historicalDataService.getAvailableDateRanges();
  }

  /**
   * NUEVO: Verifica si los datos históricos están disponibles
   */
  async isHistoricalDataAvailable() {
    return await this.historicalDataService.isDatabaseAvailable();
  }

  /**
   * NUEVO: Obtiene el rango de fechas actual
   */
  getCurrentDateRange() {
    return this.currentDateRange;
  }

  /**
   * NUEVO: Cierra el servicio
   */
  async close() {
    console.log("🔌 Cerrando EstadisticasDataService...");

    if (this.historicalDataService) {
      await this.historicalDataService.close();
    }

    console.log("✅ EstadisticasDataService cerrado");
  }
}
