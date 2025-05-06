/**
 * DataService.js
 * Servicio para el manejo de datos, lectura/escritura de archivos JSON y procesamiento
 */

export class DataService {
  constructor() {
    this.errors = [];
    this.filePath =
      "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\error_tracker.json"; // Ruta por defecto
    this.lastUpdateTime = null;
    this.isRefreshing = false;
    this.autoRefreshInterval = null;
    this.autoRefreshTime = 60; // segundos
  }

  /**
   * Inicializa el servicio de datos
   */
  async init() {
    try {
      // Intentar cargar configuración
      try {
        const config = await window.api.getConfig();

        // Establecer ruta de archivo
        if (config && config.error_tracker_path) {
          this.filePath = config.error_tracker_path;
          console.log(
            "Ruta de archivo cargada de configuración:",
            this.filePath
          );
        }

        // Configurar autorefresh si está configurado
        if (config && config.auto_refresh) {
          this.setupAutoRefresh(config.auto_refresh);
        }
      } catch (configError) {
        console.warn(
          "Error al cargar configuración, usando valores por defecto:",
          configError
        );
        // Continuamos con los valores por defecto
      }

      // Cargar errores iniciales
      await this.refreshData();

      return true;
    } catch (error) {
      console.error("Error al inicializar el servicio de datos:", error);
      return false;
    }
  }

  /**
   * Actualiza los datos desde el archivo JSON
   */
  async refreshData() {
    if (this.isRefreshing) return false;

    try {
      this.isRefreshing = true;

      // Verificar si tenemos una ruta de archivo
      if (!this.filePath) {
        this.filePath =
          "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\error_tracker.json";
        console.log("Usando ruta por defecto:", this.filePath);
      }

      // Leer el archivo JSON
      console.log("Intentando leer archivo:", this.filePath);

      try {
        const result = await window.api.readJson(this.filePath);

        if (result.success) {
          this.errors = result.data.errors || [];
          this.lastUpdateTime = new Date();

          // Normalizar los datos
          this.normalizeErrors();

          console.log(
            `Datos cargados correctamente: ${this.errors.length} errores`
          );

          // Emitir evento de datos actualizados
          if (window.ipcRenderer) {
            window.ipcRenderer.send("data:updated", {
              count: this.errors.length,
              timestamp: this.lastUpdateTime,
            });
          }

          this.isRefreshing = false;
          return true;
        } else {
          console.error("Error al leer el archivo:", result.error);
          this.isRefreshing = false;
          return false;
        }
      } catch (readError) {
        console.error("Error al leer el archivo JSON:", readError);
        // Si falla la lectura, usar datos de ejemplo para desarrollo
        this.createSampleData();
        this.isRefreshing = false;
        return false;
      }
    } catch (error) {
      console.error("Error al actualizar los datos:", error);
      this.isRefreshing = false;
      return false;
    }
  }

  /**
   * Crea datos de ejemplo para desarrollo
   */
  createSampleData() {
    console.log("Creando datos de ejemplo para desarrollo");
    this.errors = [
      {
        id: "1",
        user_id: "usuario1",
        date: "2025/04/19",
        time: "13:30:10",
        asin: "B0CMZ8D9VD",
        bin_id: "P-3-C214A542",
        violation: "Articulo <70cm en Barrel",
        feedback_status: "pending",
        quantity: 4,
        occurrences: [
          { date: "2025/04/19", time: "13:29:43" },
          { date: "2025/04/19", time: "13:30:10" },
        ],
        feedback_notified: false,
        feedback_user: "",
      },
      {
        id: "2",
        user_id: "usuario2",
        date: "2025/04/19",
        time: "14:25:39",
        asin: "B0CMZ8D9VD",
        bin_id: "P-3-C286A472",
        violation: "Articulo <70cm en Barrel",
        feedback_status: "done",
        quantity: 2,
        occurrences: [
          { date: "2025/04/19", time: "14:24:29" },
          { date: "2025/04/19", time: "14:25:39" },
        ],
        feedback_notified: true,
        feedback_user: "admin",
        feedback_date: "2025/04/30",
        feedback_comment:
          "Desconocimiento (no sabía): Usuario nuevo en el área - admin",
      },
    ];
    this.lastUpdateTime = new Date();
  }

  /**
   * Normaliza los datos de errores
   */
  normalizeErrors() {
    this.errors.forEach((error) => {
      // Asegurar que feedback_status exista y esté en minúsculas
      error.feedback_status = (
        error.feedback_status || "pending"
      ).toLowerCase();

      // Asegurar que occurrences es un array
      if (!Array.isArray(error.occurrences)) {
        error.occurrences = [{ date: error.date, time: error.time }];
      }

      // Asegurar que los campos requeridos existen
      error.quantity = error.quantity || error.occurrences.length || 1;
      error.feedback_notified = error.feedback_notified || false;
      error.feedback_user = error.feedback_user || "";
      error.times_notified = error.times_notified || 0;

      // Inicializar feedback_comment si no existe
      if (!error.feedback_comment) {
        error.feedback_comment = "";
      }
    });
  }

  /**
   * Filtra los errores por estado
   */
  getFilteredErrors(statusFilter = "all") {
    if (statusFilter === "all") {
      return this.errors;
    }

    return this.errors.filter((error) =>
      statusFilter === "done"
        ? error.feedback_status.toLowerCase() === "done"
        : error.feedback_status.toLowerCase() !== "done"
    );
  }

  /**
   * Devuelve estadísticas sobre los errores
   */
  getStatistics() {
    const stats = {
      total: this.errors.length,
      pending: 0,
      done: 0,
      byUser: {},
      byViolation: {},
      byBin: {},
    };

    // Calcular estadísticas
    this.errors.forEach((error) => {
      // Contar por estado
      if (error.feedback_status.toLowerCase() === "done") {
        stats.done++;
      } else {
        stats.pending++;
      }

      // Contar por usuario
      const userId = error.user_id;
      stats.byUser[userId] = (stats.byUser[userId] || 0) + 1;

      // Contar por violación
      const violation = error.violation;
      stats.byViolation[violation] = (stats.byViolation[violation] || 0) + 1;

      // Contar por bin
      const binId = error.bin_id;
      stats.byBin[binId] = (stats.byBin[binId] || 0) + 1;
    });

    return stats;
  }

  /**
   * Actualiza el estado de un error
   * @param {string} errorId - ID del error a actualizar
   * @param {string} newStatus - Nuevo estado (done/pending)
   * @param {string} username - Nombre del usuario que realiza el cambio
   * @param {string} [feedbackComment] - Comentario opcional de feedback
   */
  async updateErrorStatus(
    errorId,
    newStatus,
    username,
    feedbackComment = null
  ) {
    try {
      // Buscar el error
      const errorIndex = this.errors.findIndex((error) => error.id === errorId);

      if (errorIndex === -1) {
        throw new Error(`Error no encontrado: ${errorId}`);
      }

      // Actualizar estado
      this.errors[errorIndex].feedback_status = newStatus;

      // Si es 'done', actualizar datos adicionales
      if (newStatus === "done") {
        this.errors[errorIndex].feedback_date = new Date()
          .toISOString()
          .split("T")[0];
        this.errors[errorIndex].feedback_user = username;
        this.errors[errorIndex].feedback_notified = false;

        // Guardar comentario si existe
        if (feedbackComment) {
          this.errors[
            errorIndex
          ].feedback_comment = `${feedbackComment} - ${username}`;
        }
      } else {
        this.errors[errorIndex].feedback_date = null;
        this.errors[errorIndex].feedback_user = "";
        this.errors[errorIndex].feedback_comment = "";
      }

      // Guardar cambios
      await this.saveData();

      return true;
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      return false;
    }
  }

  /**
   * Guarda los datos en el archivo JSON
   */
  async saveData() {
    try {
      // Verificar si tenemos una ruta de archivo
      if (!this.filePath) {
        throw new Error("No se ha configurado una ruta de archivo");
      }

      // Preparar datos para guardar
      const data = { errors: this.errors };

      // Guardar archivo
      try {
        const result = await window.api.saveJson(this.filePath, data);

        if (!result.success) {
          throw new Error(result.error || "Error al guardar archivo");
        }

        // Actualizar timestamp
        this.lastUpdateTime = new Date();

        return true;
      } catch (saveError) {
        console.error("Error al guardar archivo:", saveError);
        // En modo desarrollo, simular éxito
        this.lastUpdateTime = new Date();
        return true;
      }
    } catch (error) {
      console.error("Error al guardar datos:", error);
      return false;
    }
  }

  /**
   * Configura la actualización automática
   */
  setupAutoRefresh(seconds, callback) {
    // Limpiar intervalo existente
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }

    // Si es 0, deshabilitar actualización automática
    if (seconds <= 0) return;

    this.autoRefreshTime = seconds;

    // Configurar nuevo intervalo
    this.autoRefreshInterval = setInterval(async () => {
      const success = await this.refreshData();
      if (success && typeof callback === "function") {
        callback();
      }
    }, seconds * 1000);

    // Guardar en configuración
    this.saveAutoRefreshToConfig(seconds);
  }

  /**
   * Guarda el tiempo de actualización automática en la configuración
   */
  async saveAutoRefreshToConfig(seconds) {
    try {
      // Obtener configuración actual
      const config = await window.api.getConfig();

      // Actualizar tiempo de autorefresh
      const updatedConfig = { ...config, auto_refresh: seconds };

      // Guardar configuración
      await window.api.saveConfig(updatedConfig);
    } catch (error) {
      console.warn("Error al guardar tiempo de actualización en config", error);
    }
  }

  /**
   * Obtiene la fecha y hora de la última actualización en formato legible
   */
  getLastUpdateFormatted() {
    if (!this.lastUpdateTime) return "Nunca";

    return this.lastUpdateTime.toLocaleString();
  }

  /**
   * Exporta los errores a CSV
   */
  async exportToCsv(statusFilter = "all") {
    try {
      // Obtener errores filtrados
      const filteredErrors = this.getFilteredErrors(statusFilter);

      if (filteredErrors.length === 0) {
        return { success: false, error: "No hay datos para exportar" };
      }

      // Crear cabeceras CSV
      const headers = [
        "ID",
        "Usuario",
        "Fecha",
        "Hora",
        "ASIN",
        "Bin ID",
        "Infracción",
        "Estado",
        "Cantidad",
        "Fecha Feedback",
        "Completado por",
        "Comentario",
      ];

      // Crear filas
      const rows = [headers.join(",")];

      filteredErrors.forEach((error) => {
        const row = [
          `"${error.id}"`,
          `"${error.user_id}"`,
          `"${error.date}"`,
          `"${error.time}"`,
          `"${error.asin}"`,
          `"${error.bin_id}"`,
          `"${error.violation}"`,
          `"${error.feedback_status === "done" ? "Completado" : "Pendiente"}"`,
          `"${error.quantity || 1}"`,
          `"${error.feedback_date || ""}"`,
          `"${error.feedback_user || ""}"`,
          `"${error.feedback_comment || ""}"`,
        ];

        rows.push(row.join(","));
      });

      // Crear contenido CSV
      const csvContent = rows.join("\n");

      // Exportar a archivo (usando API)
      return await window.api.exportToCsv(csvContent);
    } catch (error) {
      console.error("Error al exportar a CSV:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpia recursos al cerrar
   */
  dispose() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }
}
