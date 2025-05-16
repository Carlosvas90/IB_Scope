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
      this.fileNames = appConfig.fileNames || { errors: "error_tracker.json" };

      console.log(
        "DataService: Rutas de datos establecidas desde ConfigService:",
        this.dataPaths
      );
      console.log(
        "DataService: Nombres de archivo establecidos desde ConfigService:",
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
   * Construye la ruta completa para un archivo
   * @param {string} fileName - Nombre del archivo
   * @param {string} dataPath - Ruta base de datos (opcional)
   * @returns {string} Ruta completa
   */
  buildFilePath(fileName, dataPath = null) {
    const basePath = dataPath || this.currentDataPath || this.dataPaths[0];
    // Si basePath termina siendo undefined (p.ej. this.dataPaths está vacío y currentDataPath es null)
    // fileService.buildFilePath lanzará un error, lo cual es el comportamiento deseado.
    return this.fileService.buildFilePath(basePath, fileName);
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

    const result = await this.fileService.tryReadJsonFromPaths(
      orderedPaths,
      fileName
    );

    if (result.success) {
      console.log(
        `DataService.tryReadFile: Éxito. '${fileName}' leído desde '${result.pathUsed}'. Actualizando currentDataPath.`
      );
      this.currentDataPath = result.pathUsed;
    } else {
      console.warn(
        `DataService.tryReadFile: Falló la lectura de '${fileName}' desde todas las rutas. Error: ${result.error}`
      );
    }

    console.timeEnd(`DataService:TryReadFile:${fileName}`);
    return result; // Devuelve el resultado de FileService ({success, data, error, pathUsed?})
  }

  /**
   * Actualiza los datos desde el archivo JSON
   */
  async refreshData() {
    await this.ensureInitialized();
    if (this.isRefreshing) return false;

    console.log(
      "%cDataService.refreshData: INICIANDO refreshData",
      "color: green; font-weight: bold;"
    );

    try {
      this.isRefreshing = true;
      console.log(
        "DataService.refreshData: Intentando cargar datos desde el archivo..."
      );

      try {
        console.log(
          "%cDataService.refreshData: ANTES de llamar a this.tryReadFile",
          "color: orange; font-weight: bold;"
        );
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
        console.error(
          "%cDataService.refreshData: ERROR CAPTURADO en try-catch interno (leyendo archivo)",
          "color: red; font-weight: bold;",
          readError
        );
        // Si falla la lectura, usar datos de ejemplo para desarrollo
        console.log(
          "%cDataService.refreshData: Llamando a createSampleData() debido al error de lectura.",
          "color: red; font-style: italic;"
        );
        this.createSampleData();
        this.isRefreshing = false;
        return false;
      }
    } catch (error) {
      console.error(
        "%cDataService.refreshData: ERROR CAPTURADO en try-catch externo",
        "color: red; font-weight: bold;",
        error
      );
      this.isRefreshing = false;
      return false;
    }
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
    await this.ensureInitialized();
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
      const result = await this.fileService.trySaveJsonToPaths(
        orderedPaths,
        this.fileNames.errors,
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

    // Limpiar callbacks
    // this.refreshListeners = []; // Ya no existe
  }
}
