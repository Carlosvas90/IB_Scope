/**
 * EstadisticasDataService.js
 * Servicio de datos específico para estadísticas que reutiliza la lógica del DataService principal
 */

export class EstadisticasDataService {
  constructor() {
    this.errors = [];
    this.lastUpdateTime = null;
    this.isLoading = false;
    this.listeners = [];

    // Configuración de rutas (reutilizar del sistema principal)
    this.dataPaths = [];
    this.fileName = "error_tracker.json";
    this.currentDataPath = null;

    console.log("📊 EstadisticasDataService inicializado");
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
      // Intentar obtener datos del servicio principal primero (más rápido)
      if (
        window.inboundScope &&
        window.inboundScope.dataService &&
        window.inboundScope.dataService.errors.length > 0
      ) {
        console.log("🚀 Usando datos del servicio principal (caché)");
        this.errors = [...window.inboundScope.dataService.errors];
        this.lastUpdateTime = window.inboundScope.dataService.lastUpdateTime;
        this.notifyListeners();
        return true;
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
    for (const dataPath of this.dataPaths) {
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
      error: "No se pudo leer el archivo desde ninguna ruta",
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
    return await this.loadData();
  }
}
