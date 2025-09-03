/**
 * DataService.js
 * Servicio para el manejo de datos, lectura/escritura de archivos JSON y procesamiento
 * Versión optimizada para rendimiento
 */

import { CacheService } from "./CacheService.js";
import { AutoRefreshService } from "./AutoRefreshService.js";
import { ErrorDataProcessorService } from "./ErrorDataProcessorService.js";
import { FileService } from "./FileService.js";
import { NotificationService } from "./NotificationService.js";
import { ConfigService } from "./ConfigService.js";

export class DataService {
  constructor() {
    this.errors = [];
    this.cache = {
      processedErrors: null,
      statistics: null,
    };
    this.dataPaths = [];
    this.currentDataPath = null;
    this.fileNames = {};
    this.lastUpdateTime = null;
    this.isRefreshing = false;
    this.cacheService = new CacheService("feedback_tracker_data");
    this.autoRefreshService = new AutoRefreshService();
    this.errorProcessor = new ErrorDataProcessorService();
    this.fileService = new FileService();
    this.notificationService = new NotificationService();
    this.configService = new ConfigService();
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Genera el nombre del archivo de errores con la fecha actual en formato DDMMYYYY
   * @returns {string} Nombre del archivo con formato error_tracker_DDMMYYYY.json
   */
  getErrorTrackerFilename() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();

    const dateString = `${day}${month}${year}`;
    return `error_tracker_${dateString}.json`;
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      if (!this.initializationPromise) {
        console.log(
          "DataService.ensureInitialized: Llamando a init() por primera vez o después de un reinicio."
        );
        this.initializationPromise = this.init();
      }
      try {
        await this.initializationPromise;
      } catch (error) {
        console.error(
          "DataService.ensureInitialized: Error durante la inicialización controlada.",
          error
        );
        this.isInitialized = false;
        this.initializationPromise = null;
      }
    }
  }

  /**
   * Inicializa el servicio de datos
   */
  async init() {
    if (this.isInitialized) {
      console.log("DataService.init: Ya inicializado.");
      return true;
    }
    if (this.initializationPromise && !this.isInitialized) {
      console.log(
        "DataService.init: Inicialización ya en progreso, esperando..."
      );
      await this.initializationPromise;
      return this.isInitialized;
    }

    console.log("DataService.init: Iniciando inicialización...");
    console.time("DataService:Init");
    try {
      // Cargar configuración usando ConfigService
      const appConfig = await this.configService.loadAppConfig();

      // Aplicar configuración cargada
      this.dataPaths = appConfig.dataPaths || [];

      // Usar el nombre base del archivo de errores, pero el nombre real se generará dinámicamente
      this.fileNames = appConfig.fileNames || { errors: "error_tracker.json" };

      // Guardar el nombre base para referencia
      this.errorFileBaseName = this.fileNames.errors;

      // Actualizar el nombre del archivo con la fecha actual
      this.fileNames.errors = this.getErrorTrackerFilename();

      console.log(
        "DataService: Rutas de datos establecidas desde ConfigService:",
        this.dataPaths
      );
      console.log(
        "DataService: Nombres de archivo establecidos desde ConfigService (con fecha actual):",
        this.fileNames
      );

      // Configurar autorefresh si está configurado
      if (appConfig.autoRefreshSeconds && appConfig.autoRefreshSeconds > 0) {
        this.autoRefreshService.configure(
          appConfig.autoRefreshSeconds,
          this.refreshData.bind(this),
          window.api.saveConfig
        );
        console.log(
          `DataService: Auto-refresh configurado para ${appConfig.autoRefreshSeconds} segundos.`
        );
      } else {
        console.log(
          "DataService: Auto-refresh no configurado o valor inválido desde ConfigService. Auto-refresh deshabilitado."
        );
      }

      // La lógica de fallback para dataPaths y fileNames ahora está en ConfigService.
      // El console.warn sobre usar rutas de fallback también se movió a ConfigService.

      console.log("DataService.init: Inicialización completada.");
      console.timeEnd("DataService:Init");
      this.isInitialized = true;
      this.initializationPromise = null;
      return true;
    } catch (error) {
      console.error(
        "DataService.init: Error al inicializar el servicio de datos (posiblemente desde ConfigService o aplicando config):",
        error
      );
      // En caso de error durante la carga de configuración crítica, DataService podría quedar en un estado inoperable.
      // Aseguramos que dataPaths y fileNames tengan al menos un valor usable para evitar errores en cascada,
      // aunque ConfigService ya debería proveer fallbacks.
      this.dataPaths = this.dataPaths || [];
      this.fileNames = this.fileNames || { errors: "error_tracker.json" };

      console.timeEnd("DataService:Init");
      this.isInitialized = false;
      this.initializationPromise = null;
      return false;
    }
  }

  /**
   * Carga datos iniciales con soporte para caché
   */
  async loadInitialData() {
    await this.ensureInitialized();
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
   * Intenta leer un archivo desde múltiples rutas
   * @param {string} fileName - Nombre del archivo a leer
   * @returns {Promise<Object>} Resultado de la lectura
   */
  async tryReadFile(fileName) {
    await this.ensureInitialized();
    console.log(
      `%cDataService.tryReadFile: Iniciando intento de lectura múltiple para ${fileName} via FileService`,
      "color: blue; font-weight: bold;"
    );
    console.time(`DataService:TryReadFile:${fileName}`);

    const orderedPaths = [];
    if (this.currentDataPath) {
      orderedPaths.push(this.currentDataPath);
    }
    if (this.dataPaths && this.dataPaths.length > 0) {
      this.dataPaths.forEach((dp) => {
        if (dp && !orderedPaths.includes(dp)) {
          orderedPaths.push(dp);
        }
      });
    }

    if (orderedPaths.length === 0) {
      const errorMsg = `DataService.tryReadFile: No hay rutas de datos (currentDataPath o dataPaths) configuradas para leer '${fileName}'.`;
      console.error(errorMsg);
      console.timeEnd(`DataService:TryReadFile:${fileName}`);
      return { success: false, error: errorMsg, data: null };
    }

    console.log(
      `DataService.tryReadFile: Rutas ordenadas para intento: ${JSON.stringify(
        orderedPaths
      )}`
    );

    // Si el archivo solicitado es el de errores, usar el nombre con fecha actual
    let fileNameToUse = fileName;
    if (
      fileName === this.errorFileBaseName ||
      fileName === "error_tracker.json"
    ) {
      fileNameToUse = this.getErrorTrackerFilename();
      console.log(
        `DataService.tryReadFile: Usando nombre de archivo con fecha actual: ${fileNameToUse}`
      );
    }

    const result = await this.fileService.tryReadJsonFromPaths(
      orderedPaths,
      fileNameToUse
    );

    if (result.success) {
      console.log(
        `DataService.tryReadFile: Éxito. '${fileNameToUse}' leído desde '${result.pathUsed}'. Actualizando currentDataPath.`
      );
      this.currentDataPath = result.pathUsed;
    } else {
      console.warn(
        `DataService.tryReadFile: Falló la lectura de '${fileNameToUse}' desde todas las rutas. Error: ${result.error}`
      );
    }

    console.timeEnd(`DataService:TryReadFile:${fileName}`);
    return result; // Devuelve el resultado de FileService ({success, data, error, pathUsed?})
  }

  _processSuccessfullyLoadedData(rawErrorData) {
    console.log(
      "DataService._processSuccessfullyLoadedData: Procesando datos cargados exitosamente."
    );
    this.errors = rawErrorData || [];
    this.lastUpdateTime = new Date();

    // Normalizar los datos
    this.normalizeErrors();

    // Invalidar caché interna de resultados procesados
    this.invalidateCache();

    // Guardar en caché de localStorage
    this.saveToCache();

    console.log(
      `DataService: Datos procesados y cacheados. ${this.errors.length} errores.`
    );

    // Emitir evento de datos actualizados
    this.notifyDataUpdated();
  }

  /**
   * Actualiza los datos desde el archivo JSON
   */
  async refreshData() {
    await this.ensureInitialized();
    if (this.isRefreshing) {
      console.warn(
        "DataService.refreshData: Ya hay una actualización en progreso. Omitiendo."
      );
      return false;
    }

    console.log(
      "%cDataService.refreshData: INICIANDO refreshData",
      "color: green; font-weight: bold;"
    );

    let success = false;
    try {
      this.isRefreshing = true;
      console.log(
        "DataService.refreshData: Intentando cargar datos desde el archivo..."
      );

      // Actualizar el nombre del archivo con la fecha actual antes de intentar leerlo
      this.fileNames.errors = this.getErrorTrackerFilename();
      console.log(
        `DataService.refreshData: Usando nombre de archivo actualizado: ${this.fileNames.errors}`
      );

      const result = await this.tryReadFile(this.fileNames.errors);

      if (result.success) {
        this._processSuccessfullyLoadedData(result.data.errors);
        success = true;
      } else {
        console.error(
          "DataService.refreshData: Error al leer el archivo (reportado por tryReadFile):",
          result.error
        );
        // No se cargaron datos de archivo, no se llama a createSampleData aquí,
        // se deja que el estado actual persista o se maneje por una carga inicial fallida si es el caso.
        // Si la intención es cargar datos de ejemplo SIEMPRE que falle la lectura, se movería createSampleData aquí.
        // Por ahora, createSampleData se llama en el CATCH si tryReadFile u _processSuccessfullyLoadedData fallan.
        success = false;
      }
    } catch (error) {
      console.error(
        "%cDataService.refreshData: ERROR CAPTURADO durante refreshData (lectura o procesamiento).",
        "color: red; font-weight: bold;",
        error
      );
      // Si falla la lectura o el procesamiento posterior, usar datos de ejemplo para desarrollo
      console.log(
        "%cDataService.refreshData: Llamando a createSampleData() debido al error.",
        "color: red; font-style: italic;"
      );
      this.createSampleData();
      this.notifyDataUpdated(); // Notificar que se han cargado datos (de ejemplo en este caso)
      success = false;
    } finally {
      this.isRefreshing = false;
      console.log(`DataService.refreshData: Finalizado. Éxito: ${success}`);
    }
    return success;
  }

  /**
   * Notifica que los datos han sido actualizados
   * @param {boolean} fromCache - Si los datos vienen de caché
   */
  notifyDataUpdated(fromCache = false) {
    const eventData = {
      errors: this.errors, // Para los listeners locales
      timestamp: this.lastUpdateTime, // Para los listeners locales y para IPC
      count: this.errors.length, // Para IPC
      fromCache: fromCache, // Para IPC
    };
    this.notificationService.notify(eventData);
  }

  /**
   * Registra un callback para notificaciones de actualización
   * @param {Function} callback - Función a llamar cuando los datos se actualicen
   */
  onRefresh(callback) {
    this.notificationService.subscribe(callback);
  }

  /**
   * Elimina un callback registrado
   * @param {Function} callback - Función a eliminar
   */
  offRefresh(callback) {
    this.notificationService.unsubscribe(callback);
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
      "%cDataService: Creando datos de ejemplo para desarrollo usando ErrorDataProcessorService",
      "color: purple; font-style: italic; font-weight: bold;"
    );
    this.errors = this.errorProcessor.generateSampleData();
    this.lastUpdateTime = new Date();

    // Invalidar caché interna de resultados procesados
    this.invalidateCache();
    // Nota: createSampleData por sí mismo no guarda en localStorage ni notifica.
    // La notificación ahora se hace en el llamador (refreshData) si es necesario.
  }

  /**
   * Normaliza los datos de errores
   */
  normalizeErrors() {
    this.errorProcessor.normalize(this.errors);
  }

  /**
   * Filtra los errores por estado y turno, y los ordena por hora (ascendente)
   * @param {string} statusFilter - Filtro de estado ("all", "pending", "done")
   * @param {string} shiftFilter - Filtro de turno ("day", "early", "late")
   * @returns {Array<Object>} Errores filtrados y ordenados
   */
  getFilteredErrors(statusFilter = "all", shiftFilter = "day") {
    console.time("GetFilteredErrors");

    // Crear una clave compuesta para la caché
    const cacheKey = `${statusFilter}_${shiftFilter}`;

    // Usar caché si está disponible
    if (this.cache.processedErrors && this.cache.processedErrors[cacheKey]) {
      console.timeEnd("GetFilteredErrors");
      return this.cache.processedErrors[cacheKey];
    }

    const result = this.errorProcessor.filterAndSort(
      this.errors,
      statusFilter,
      shiftFilter
    );

    // Almacenar en caché
    if (!this.cache.processedErrors) {
      this.cache.processedErrors = {};
    }
    this.cache.processedErrors[cacheKey] = result;

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
   * @param {Object} [feedbackData] - Datos de feedback con motivo y comentario separados
   */
  async updateErrorStatus(errorId, newStatus, username, feedbackData = null) {
    await this.ensureInitialized();
    try {
      const success = this.errorProcessor.updateDetails(
        this.errors,
        errorId,
        newStatus,
        username,
        feedbackData
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
    await this.ensureInitialized();
    console.time("DataService:SaveData");
    console.log(
      "%cDataService.saveData: Iniciando intento de guardado múltiple via FileService",
      "color: magenta; font-weight: bold;"
    );

    const dataToSave = { errors: this.errors };

    const orderedPaths = [];
    if (this.currentDataPath) {
      orderedPaths.push(this.currentDataPath);
    }
    if (this.dataPaths && this.dataPaths.length > 0) {
      this.dataPaths.forEach((dp) => {
        if (dp && !orderedPaths.includes(dp)) {
          orderedPaths.push(dp);
        }
      });
    }

    if (orderedPaths.length === 0) {
      const errorMsg =
        "DataService.saveData: No hay rutas de datos (currentDataPath o dataPaths) configuradas para guardar.";
      console.error(errorMsg);
      console.timeEnd("DataService:SaveData");
      // Devolver false es consistente con el comportamiento anterior en caso de fallo total.
      return false;
    }

    console.log(
      `DataService.saveData: Rutas ordenadas para intento de guardado: ${JSON.stringify(
        orderedPaths
      )}`
    );

    try {
      // Asegurar que siempre usamos el nombre de archivo con la fecha actual
      const errorFileName = this.getErrorTrackerFilename();

      // Actualizar el nombre en fileNames para mantener consistencia
      this.fileNames.errors = errorFileName;

      console.log(
        `DataService.saveData: Guardando con nombre de archivo: ${errorFileName}`
      );

      const result = await this.fileService.trySaveJsonToPaths(
        orderedPaths,
        errorFileName,
        dataToSave
      );

      if (result.success) {
        console.log(
          `DataService.saveData: Éxito. Datos guardados en '${result.pathUsed}'. Actualizando currentDataPath.`
        );
        this.currentDataPath = result.pathUsed;
        this.lastUpdateTime = new Date();
        this.saveToCache();
        console.timeEnd("DataService:SaveData");
        return true;
      } else {
        const finalErrorMsg = `DataService.saveData: No se pudo guardar en ninguna ruta. Error de FileService: ${result.error}`;
        console.error(finalErrorMsg);
        console.timeEnd("DataService:SaveData");
        return false;
      }
    } catch (error) {
      // Captura de errores inesperados que puedan ocurrir en la llamada a fileService o en la lógica de DataService misma.
      console.error(
        "DataService.saveData: Error general inesperado durante el proceso de guardado:",
        error
      );
      console.timeEnd("DataService:SaveData");
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
      await this.ensureInitialized();
      // Obtener errores filtrados
      const filteredErrors = this.getFilteredErrors(statusFilter);

      if (!filteredErrors || filteredErrors.length === 0) {
        console.log(
          "DataService.exportToCsv: No hay datos filtrados para exportar."
        );
        return { success: false, error: "No hay datos para exportar" };
      }

      // Generar contenido CSV usando ErrorDataProcessorService
      const csvContent = this.errorProcessor.generateCsvContent(filteredErrors);

      if (
        csvContent === "" ||
        csvContent === null ||
        typeof csvContent === "undefined"
      ) {
        console.log(
          "DataService.exportToCsv: ErrorDataProcessorService no generó contenido CSV (o estaba vacío)."
        );
        return {
          success: false,
          error: "No se pudo generar el contenido CSV o estaba vacío",
        };
      }

      // Exportar a archivo (usando FileService)
      console.log(
        "DataService.exportToCsv: Pasando contenido CSV a FileService para exportación."
      );
      return await this.fileService.exportToCsv(csvContent);
    } catch (error) {
      console.error(
        "DataService.exportToCsv: Error durante el proceso de exportación a CSV:",
        error
      );
      return {
        success: false,
        error:
          error.message ||
          "Error desconocido durante la exportación CSV en DataService.",
      };
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
    if (this.notificationService) {
      this.notificationService.dispose();
      this.notificationService = null;
    }

    // this.refreshListeners = []; // Ya no existe
  }
}
