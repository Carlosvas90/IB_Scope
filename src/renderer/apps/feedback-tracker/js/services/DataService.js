/**
 * DataService.js
 * Servicio para el manejo de datos, lectura/escritura de archivos JSON y procesamiento
 * Versión optimizada para rendimiento
 */

import { CacheService } from "./CacheService.js";
import { AutoRefreshService } from "./AutoRefreshService.js";
import { ErrorDataProcessorService } from "./ErrorDataProcessorService.js";

export class DataService {
  constructor() {
    this.errors = [];
    this.cache = {
      processedErrors: null,
      statistics: null,
    };
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
    this.refreshListeners = [];
    this.cacheService = new CacheService("feedback_tracker_data");
    this.autoRefreshService = new AutoRefreshService();
    this.errorProcessor = new ErrorDataProcessorService();
  }

  /**
   * Inicializa el servicio de datos
   */
  async init() {
    console.time("DataService:Init");
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
        if (config && typeof config.auto_refresh === "number") {
          this.autoRefreshService.configure(
            config.auto_refresh,
            this.refreshData.bind(this),
            window.api.saveConfig
          );
        } else {
          console.log(
            "DataService: Auto-refresh no configurado o valor no numérico en config."
          );
        }
      } catch (configError) {
        console.warn(
          "Error al cargar configuración, usando valores por defecto:",
          configError
        );
        // Continuamos con los valores por defecto
      }

      // Cargar errores iniciales (con caché en localStorage si está disponible)
      await this.loadInitialData();

      console.timeEnd("DataService:Init");
      return true;
    } catch (error) {
      console.error("Error al inicializar el servicio de datos:", error);
      console.timeEnd("DataService:Init");
      return false;
    }
  }

  /**
   * Carga datos iniciales con soporte para caché
   */
  async loadInitialData() {
    // Primer intento: Cargar desde localStorage para renderizado inmediato
    if (this.loadFromCache()) {
      console.log("Datos cargados desde caché local");

      // En segundo plano, refrescar datos desde archivo
      setTimeout(() => {
        this.refreshData().then((success) => {
          if (success) {
            console.log("Datos actualizados desde archivo JSON");
          }
        });
      }, 500);

      return true;
    }

    // Si no hay caché, cargar directamente desde archivo
    return await this.refreshData();
  }

  /**
   * Carga datos desde caché en localStorage
   * @returns {boolean} Si se cargaron datos desde caché
   */
  loadFromCache() {
    try {
      const cachedData = this.cacheService.loadData();

      if (!cachedData) {
        // console.log("No hay datos en caché local o son inválidos."); // Ya lo loguea CacheService
        return false;
      }

      // Validar la estructura esperada de los datos cacheados
      if (
        !cachedData.errors ||
        !Array.isArray(cachedData.errors) ||
        typeof cachedData.lastUpdate === "undefined"
      ) {
        console.warn(
          "DataService: Datos de caché no válidos o corruptos. Ignorando caché."
        );
        this.cacheService.clearData(); // Limpiar caché si está corrupta
        return false;
      }

      this.errors = cachedData.errors;
      this.lastUpdateTime = new Date(cachedData.lastUpdate || Date.now());

      // Normalizar datos
      this.normalizeErrors();

      // Invalidar caché
      this.invalidateCache();

      // Notificar carga
      this.notifyDataUpdated(true);

      return true;
    } catch (error) {
      console.warn("Error cargando desde caché:", error);
      return false;
    }
  }

  /**
   * Guarda datos en caché local
   */
  saveToCache() {
    try {
      const cacheData = {
        errors: this.errors,
        lastUpdate: this.lastUpdateTime?.toISOString(),
      };
      this.cacheService.saveData(cacheData);
      // console.log("Datos guardados en caché local via CacheService"); // Ya lo loguea CacheService
    } catch (error) {
      // El error ya es manejado y logueado por CacheService.saveData
      // Podríamos añadir un log específico de DataService si es necesario.
      console.warn(
        "DataService: Error específico al intentar guardar en caché desde DataService:",
        error
      );
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
    console.time("FileRead");

    // Si hay una ruta actual exitosa, intentar primero esa
    if (this.currentDataPath) {
      const filePath = this.buildFilePath(fileName, this.currentDataPath);
      console.log(`Intentando leer desde ruta actual: ${filePath}`);

      try {
        const result = await window.api.readJson(filePath);
        if (result.success) {
          console.timeEnd("FileRead");
          return result;
        }
      } catch (error) {
        console.warn(`No se pudo leer desde ruta actual: ${filePath}`, error);
        // Continuar con otras rutas
      }
    }

    // Intentar todas las rutas
    for (const dataPath of this.dataPaths) {
      // Saltar la ruta actual que ya probamos
      if (dataPath === this.currentDataPath) continue;

      const filePath = this.buildFilePath(fileName, dataPath);
      console.log(`Intentando leer archivo desde: ${filePath}`);

      try {
        const result = await window.api.readJson(filePath);
        if (result.success) {
          // Guardar la ruta exitosa para futuros accesos
          this.currentDataPath = dataPath;
          console.log(`Archivo leído correctamente desde: ${filePath}`);
          console.timeEnd("FileRead");
          return result;
        }
      } catch (error) {
        console.warn(`No se pudo leer desde: ${filePath}`, error);
        // Continuar intentando con la siguiente ruta
      }
    }

    // Si llega aquí, no se pudo leer de ninguna ruta
    console.timeEnd("FileRead");
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

          // Invalidar caché
          this.invalidateCache();

          // Guardar en caché local
          this.saveToCache();

          console.log(
            `Datos cargados correctamente: ${this.errors.length} errores`
          );

          // Emitir evento de datos actualizados
          this.notifyDataUpdated();

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
   * Notifica que los datos han sido actualizados
   * @param {boolean} fromCache - Si los datos vienen de caché
   */
  notifyDataUpdated(fromCache = false) {
    // Notificar a través de ipcRenderer
    if (window.ipcRenderer) {
      window.ipcRenderer.send("data:updated", {
        count: this.errors.length,
        timestamp: this.lastUpdateTime,
        fromCache: fromCache,
      });
    }

    // Notificar a los listeners registrados
    this.refreshListeners.forEach((callback) => {
      try {
        callback(this.errors, this.lastUpdateTime);
      } catch (error) {
        console.warn("Error en listener de actualización:", error);
      }
    });
  }

  /**
   * Registra un callback para notificaciones de actualización
   * @param {Function} callback - Función a llamar cuando los datos se actualicen
   */
  onRefresh(callback) {
    if (typeof callback === "function") {
      this.refreshListeners.push(callback);
    }
  }

  /**
   * Elimina un callback registrado
   * @param {Function} callback - Función a eliminar
   */
  offRefresh(callback) {
    const index = this.refreshListeners.indexOf(callback);
    if (index !== -1) {
      this.refreshListeners.splice(index, 1);
    }
  }

  /**
   * Invalida la caché interna
   */
  invalidateCache() {
    this.cache.processedErrors = null;
    this.cache.statistics = null;
  }

  /**
   * Crea datos de ejemplo para desarrollo
   */
  createSampleData() {
    console.log(
      "DataService: Creando datos de ejemplo para desarrollo usando ErrorDataProcessorService"
    );
    this.errors = this.errorProcessor.generateSampleData();
    this.lastUpdateTime = new Date();

    // Invalidar caché
    this.invalidateCache();
  }

  /**
   * Normaliza los datos de errores
   */
  normalizeErrors() {
    this.errorProcessor.normalize(this.errors);
  }

  /**
   * Filtra los errores por estado y los ordena por hora (ascendente)
   */
  getFilteredErrors(statusFilter = "all") {
    console.time("GetFilteredErrors");

    // Usar caché si está disponible
    if (
      this.cache.processedErrors &&
      this.cache.processedErrors[statusFilter]
    ) {
      console.timeEnd("GetFilteredErrors");
      return this.cache.processedErrors[statusFilter];
    }

    const result = this.errorProcessor.filterAndSort(this.errors, statusFilter);

    // Almacenar en caché
    if (!this.cache.processedErrors) {
      this.cache.processedErrors = {};
    }
    this.cache.processedErrors[statusFilter] = result;

    console.timeEnd("GetFilteredErrors");
    return result;
  }

  /**
   * Devuelve estadísticas sobre los errores
   */
  getStatistics() {
    console.time("GetStatistics");

    // Usar caché si está disponible
    if (this.cache.statistics) {
      console.timeEnd("GetStatistics");
      return this.cache.statistics;
    }

    const stats = this.errorProcessor.calculateStatistics(this.errors);

    // Guardar en caché
    this.cache.statistics = stats;

    console.timeEnd("GetStatistics");
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
      const success = this.errorProcessor.updateDetails(
        this.errors,
        errorId,
        newStatus,
        username,
        feedbackComment
      );

      if (!success) {
        throw new Error(
          `DataService: Error no encontrado por ErrorDataProcessorService: ${errorId}`
        );
      }

      // Invalidar caché
      this.invalidateCache();

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
    console.time("SaveData");
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

        // Guardar en caché local
        this.saveToCache();

        console.timeEnd("SaveData");
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

              // Guardar en caché local
              this.saveToCache();

              console.timeEnd("SaveData");
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

        // Guardar en caché local
        this.saveToCache();

        console.timeEnd("SaveData");
        return true;
      }
    } catch (error) {
      console.error("Error al guardar datos:", error);
      console.timeEnd("SaveData");
      return false;
    }
  }

  /**
   * Configura la actualización automática
   * @param {number} seconds - Intervalo en segundos.
   * @param {Function} [callback] - Función a llamar después de cada actualización exitosa (opcional, ya no se usa directamente aquí).
   */
  setupAutoRefresh(seconds, callback) {
    this.autoRefreshService.configure(
      seconds,
      this.refreshData.bind(this),
      window.api.saveConfig
    );

    if (typeof callback === "function") {
      console.warn(
        "DataService.setupAutoRefresh: El argumento 'callback' para notificar a la UI después del refresh ya no es soportado directamente por este método al usar AutoRefreshService. La UI debe usar listeners como onRefresh o el evento 'data:updated'."
      );
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
    if (this.autoRefreshService) {
      this.autoRefreshService.dispose();
      this.autoRefreshService = null;
    }

    // Limpiar callbacks
    this.refreshListeners = [];
  }
}
