/**
 * StatsDataService.js
 * Servicio de datos simplificado para la aplicación de stats
 * Reutiliza la lógica de estadísticas pero simplificada
 */

export class StatsDataService {
  constructor() {
    this.errors = [];
    this.dataPaths = [];
    this.currentDataPath = null;
    this.lastUpdateTime = null;

    console.log("📊 StatsDataService inicializado");
  }

  /**
   * Inicializa el servicio de datos
   */
  async init() {
    console.log("🔧 Inicializando StatsDataService...");

    try {
      // Cargar configuración de rutas
      await this.loadConfig();

      // Cargar datos iniciales
      const success = await this.loadData();

      if (success) {
        console.log("✅ StatsDataService inicializado correctamente");
        return true;
      } else {
        console.warn("⚠️ StatsDataService inicializado con datos de prueba");
        this.loadMockData();
        return true;
      }
    } catch (error) {
      console.error("❌ Error inicializando StatsDataService:", error);
      this.loadMockData();
      return false;
    }
  }

  /**
   * Carga la configuración de rutas de datos
   */
  async loadConfig() {
    try {
      // Intentar usar el servicio principal si está disponible
      if (
        window.inboundScope &&
        window.inboundScope.dataService &&
        window.inboundScope.dataService.dataPaths
      ) {
        this.dataPaths = [...window.inboundScope.dataService.dataPaths];
        console.log(
          "📁 Rutas obtenidas del servicio principal:",
          this.dataPaths.length
        );
        return;
      }

      // Cargar configuración directamente
      const config = await window.api.readJson("./config/config.json");
      if (config && config.data_paths) {
        this.dataPaths = config.data_paths;
        console.log(
          "📁 Rutas cargadas desde configuración:",
          this.dataPaths.length
        );
      } else {
        throw new Error("No se encontraron rutas en la configuración");
      }
    } catch (error) {
      console.warn("⚠️ Error cargando configuración:", error);
      // Rutas por defecto
      this.dataPaths = [
        "C:\\FeedbackTracker\\data",
        "D:\\FeedbackTracker\\data",
        "./data",
        "../data",
      ];
      console.log("📁 Usando rutas por defecto:", this.dataPaths.length);
    }
  }

  /**
   * Carga los datos de errores
   */
  async loadData() {
    try {
      console.log("📂 Cargando datos de errores...");

      // PRIORIDAD 1: Intentar usar datos del servicio de feedback-tracker
      if (this.tryLoadFromFeedbackTracker()) {
        return true;
      }

      // PRIORIDAD 2: Intentar usar datos del servicio principal global
      if (this.tryLoadFromGlobalService()) {
        return true;
      }

      // PRIORIDAD 3: Cargar desde archivo directamente
      const result = await this.readDataFile();
      if (result) {
        this.lastUpdateTime = new Date();
        console.log(
          "✅ Datos cargados desde archivo:",
          this.errors.length,
          "registros"
        );
        return true;
      }

      // PRIORIDAD 4: Usar datos de prueba
      console.warn(
        "⚠️ No se pudieron cargar datos reales, usando datos de prueba"
      );
      this.loadMockData();
      return true;
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      this.loadMockData();
      return true;
    }
  }

  /**
   * Intenta cargar datos del servicio de feedback-tracker específicamente
   */
  tryLoadFromFeedbackTracker() {
    // Buscar el servicio de feedback-tracker en múltiples ubicaciones posibles
    const possibleSources = [
      // Servicio específico de feedback-tracker
      window.feedbackTrackerDataService,
      window.feedbackTracker?.dataService,

      // Servicio global que puede contener datos de feedback-tracker
      window.inboundScope?.feedbackTracker?.dataService,
      window.inboundScope?.dataServices?.feedbackTracker,

      // Datos directos en window
      window.feedbackTrackerData,
      window.errorsData,
    ];

    for (const source of possibleSources) {
      if (source && source.errors && source.errors.length > 0) {
        this.errors = [...source.errors];
        this.lastUpdateTime = new Date();
        console.log(
          "✅ Datos obtenidos de feedback-tracker:",
          this.errors.length,
          "registros"
        );
        return true;
      }
    }

    // Buscar datos directamente en variables globales
    if (
      window.currentErrorsData &&
      Array.isArray(window.currentErrorsData) &&
      window.currentErrorsData.length > 0
    ) {
      this.errors = [...window.currentErrorsData];
      this.lastUpdateTime = new Date();
      console.log(
        "✅ Datos obtenidos de variable global:",
        this.errors.length,
        "registros"
      );
      return true;
    }

    return false;
  }

  /**
   * Intenta cargar datos del servicio principal global
   */
  tryLoadFromGlobalService() {
    if (
      window.inboundScope &&
      window.inboundScope.dataService &&
      window.inboundScope.dataService.errors &&
      window.inboundScope.dataService.errors.length > 0
    ) {
      this.errors = [...window.inboundScope.dataService.errors];
      this.lastUpdateTime = new Date();
      console.log(
        "✅ Datos obtenidos del servicio principal:",
        this.errors.length,
        "registros"
      );
      return true;
    }
    return false;
  }

  /**
   * Lee el archivo de datos más reciente
   */
  async readDataFile() {
    const today = new Date();
    const dateFormats = [
      this.formatDate(today),
      this.formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000)), // Ayer
      this.formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)), // Anteayer
    ];

    for (const path of this.dataPaths) {
      for (const dateStr of dateFormats) {
        const fileName = `error_tracker_${dateStr}.json`;
        const fullPath = `${path}/${fileName}`;

        try {
          console.log(`🎯 Intentando leer: ${fullPath}`);
          const data = await window.api.readJson(fullPath);

          if (data && Array.isArray(data)) {
            this.errors = data;
            this.currentDataPath = path;
            console.log(
              `✅ Archivo leído exitosamente: ${this.errors.length} registros`
            );
            return true;
          }
        } catch (error) {
          console.log(`⚠️ No se pudo leer: ${fullPath}`);
          continue;
        }
      }
    }

    return false;
  }

  /**
   * Formatea una fecha para el nombre del archivo
   */
  formatDate(date) {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  }

  /**
   * Carga datos de prueba si no se pueden cargar datos reales
   */
  loadMockData() {
    console.log("📝 Cargando datos de prueba...");

    this.errors = [
      {
        id: 1,
        violation: "Missing Required Field",
        quantity: 15,
        feedback_status: "pending",
        created_date: new Date().toISOString(),
        user_id: "testuser1",
      },
      {
        id: 2,
        violation: "Invalid Format",
        quantity: 8,
        feedback_status: "done",
        created_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        user_id: "testuser2",
      },
      {
        id: 3,
        violation: "Duplicate Entry",
        quantity: 23,
        feedback_status: "pending",
        created_date: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        user_id: "testuser1",
      },
    ];

    this.lastUpdateTime = new Date();
    console.log(
      "✅ Datos de prueba cargados:",
      this.errors.length,
      "registros"
    );
  }

  /**
   * Refresca los datos
   */
  async refresh() {
    console.log("🔄 Refrescando datos...");

    // Limpiar datos actuales
    this.errors = [];
    this.lastUpdateTime = null;

    // Recargar configuración
    await this.loadConfig();

    // Cargar datos frescos
    return await this.loadData();
  }

  /**
   * Obtiene estadísticas básicas de los errores
   */
  getBasicStats(dateRange = 30) {
    const now = new Date();
    const startDate =
      dateRange === 0
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) // Hoy
        : new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000); // Hace X días

    // Filtrar errores por rango de fecha
    const filteredErrors = this.errors.filter((error) => {
      const errorDate = new Date(
        error.created_date || error.date || error.timestamp
      );
      return errorDate >= startDate;
    });

    // Calcular estadísticas
    const totalErrors = filteredErrors.reduce(
      (sum, error) => sum + (error.quantity || 1),
      0
    );
    const totalLines = filteredErrors.length;

    // Determinar errores resueltos usando múltiples criterios
    const resolvedErrors = filteredErrors.filter((error) => {
      return (
        error.feedback_status === "done" ||
        error.status === "done" ||
        error.status === "resolved" ||
        error.resolved === true ||
        error.is_resolved === true ||
        error.done_date ||
        error.resolved_date
      );
    });

    const resolvedQuantity = resolvedErrors.reduce(
      (sum, error) => sum + (error.quantity || 1),
      0
    );
    const pendingQuantity = totalErrors - resolvedQuantity;

    const resolutionRate =
      totalErrors > 0 ? (resolvedQuantity / totalErrors) * 100 : 0;
    const dailyAverage = dateRange > 0 ? totalErrors / dateRange : totalErrors;

    return {
      totalErrors,
      totalLines,
      resolvedErrors: resolvedQuantity,
      pendingErrors: pendingQuantity,
      resolutionRate,
      dailyAverage,
    };
  }
}
