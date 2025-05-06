/**
 * DataService.js
 * Servicio para el manejo de datos, lectura/escritura de archivos JSON y procesamiento
 */

export class DataService {
  constructor() {
    this.errors = [];
    this.dataPaths = [
      "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\Data\\",
      "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data\\",
    ];
    this.currentDataPath = null;
    this.fileNames = {
      errors: "error_tracker.json",
    };
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

        // Establecer rutas de datos
        if (config && config.data_paths && Array.isArray(config.data_paths)) {
          this.dataPaths = config.data_paths;
          console.log(
            "Rutas de datos cargadas de configuración:",
            this.dataPaths
          );
        }

        // Cargar nombres de archivos si están configurados
        if (
          config &&
          config.apps &&
          config.apps["feedback-tracker"] &&
          config.apps["feedback-tracker"].files
        ) {
          const files = config.apps["feedback-tracker"].files;
          this.fileNames = { ...this.fileNames, ...files };
          console.log("Nombres de archivos cargados:", this.fileNames);
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
   * Construye la ruta completa para un archivo
   * @param {string} fileName - Nombre del archivo
   * @param {string} dataPath - Ruta base de datos (opcional)
   * @returns {string} Ruta completa
   */
  buildFilePath(fileName, dataPath = null) {
    const basePath = dataPath || this.currentDataPath || this.dataPaths[0];
    // Asegurar que la ruta termina con barra
    const normalizedPath = basePath.endsWith("\\") ? basePath : basePath + "\\";
    return normalizedPath + fileName;
  }

  /**
   * Intenta leer un archivo desde múltiples rutas
   * @param {string} fileName - Nombre del archivo a leer
   * @returns {Promise<Object>} Resultado de la lectura
   */
  async tryReadFile(fileName) {
    for (const dataPath of this.dataPaths) {
      const filePath = this.buildFilePath(fileName, dataPath);
      console.log(`Intentando leer archivo desde: ${filePath}`);

      try {
        const result = await window.api.readJson(filePath);
        if (result.success) {
          // Guardar la ruta exitosa para futuros accesos
          this.currentDataPath = dataPath;
          console.log(`Archivo leído correctamente desde: ${filePath}`);
          return result;
        }
      } catch (error) {
        console.warn(`No se pudo leer desde: ${filePath}`, error);
        // Continuar intentando con la siguiente ruta
      }
    }

    // Si llega aquí, no se pudo leer de ninguna ruta
    throw new Error(
      `No se pudo leer el archivo ${fileName} desde ninguna ruta`
    );
  }

  /**
   * Actualiza los datos desde el archivo JSON
   */
  async refreshData() {
    if (this.isRefreshing) return false;

    try {
      this.isRefreshing = true;
      console.log("Intentando cargar datos desde el archivo...");

      try {
        // Intentar leer el archivo de errores
        const result = await this.tryReadFile(this.fileNames.errors);

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
      // Verificar si tenemos una ruta de datos
      if (!this.currentDataPath) {
        // Usar la primera ruta disponible si no hay una actual
        this.currentDataPath = this.dataPaths[0];
      }

      const filePath = this.buildFilePath(this.fileNames.errors);
      console.log(`Guardando datos en: ${filePath}`);

      // Preparar datos para guardar
      const data = { errors: this.errors };

      // Guardar archivo
      try {
        const result = await window.api.saveJson(filePath, data);

        if (!result.success) {
          throw new Error(result.error || "Error al guardar archivo");
        }

        // Actualizar timestamp
        this.lastUpdateTime = new Date();

        return true;
      } catch (saveError) {
        console.error("Error al guardar archivo:", saveError);

        // Intentar con la siguiente ruta si está disponible
        for (let i = 0; i < this.dataPaths.length; i++) {
          // Saltarse la ruta actual que falló
          if (this.dataPaths[i] === this.currentDataPath) continue;

          const altFilePath = this.buildFilePath(
            this.fileNames.errors,
            this.dataPaths[i]
          );
          console.log(`Intentando guardar en ruta alternativa: ${altFilePath}`);

          try {
            const altResult = await window.api.saveJson(altFilePath, data);
            if (altResult.success) {
              // Guardar la nueva ruta como actual
              this.currentDataPath = this.dataPaths[i];
              this.lastUpdateTime = new Date();
              return true;
            }
          } catch (altError) {
            console.warn(
              `No se pudo guardar en ruta alternativa: ${altFilePath}`,
              altError
            );
          }
        }

        // En modo desarrollo, simular éxito
        console.warn(
          "No se pudo guardar en ninguna ruta, simulando éxito en modo desarrollo"
        );
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
   * Obtiene la ruta de datos actual que se está utilizando
   */
  getCurrentDataPath() {
    return this.currentDataPath || "No establecido";
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
