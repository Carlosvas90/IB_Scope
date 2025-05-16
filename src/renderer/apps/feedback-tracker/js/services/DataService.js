/**
 * DataService.js
 * Servicio para el manejo de datos, lectura/escritura de archivos JSON y procesamiento
 * Versión optimizada para rendimiento
 */

import { CacheService } from "./CacheService.js";
import { AutoRefreshService } from "./AutoRefreshService.js";
import { ErrorDataProcessorService } from "./ErrorDataProcessorService.js";
import { FileService } from "./FileService.js";

export class DataService {
  constructor() {
    this.errors = [];
    this.cache = {
      processedErrors: null,
      statistics: null,
    };
    this.dataPaths = [];
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
    this.fileService = new FileService();
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
      // Rutas de datos se determinarán desde config o fallback
      let loadedDataPaths = null;

      // Intentar cargar configuración
      try {
        const config = await window.api.getConfig();
        console.log(
          "DataService: Objeto config RECIBIDO de window.api.getConfig():",
          JSON.stringify(config, null, 2)
        );

        // Establecer rutas de datos desde config
        if (
          config &&
          config.data_paths &&
          Array.isArray(config.data_paths) &&
          config.data_paths.length > 0
        ) {
          loadedDataPaths = config.data_paths;
          console.log(
            "DataService: Rutas de datos cargadas de config.json:",
            loadedDataPaths
          );
        } else {
          console.warn(
            "DataService: 'data_paths' no encontradas o vacías en config.json. Verifique el objeto config recibido arriba."
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

      // Usar rutas cargadas o definir un fallback si no se cargaron de config
      if (loadedDataPaths && loadedDataPaths.length > 0) {
        this.dataPaths = loadedDataPaths;
      } else {
        console.warn(
          "DataService: No se cargaron rutas de datos desde config.json o estaban vacías. this.dataPaths permanecerá vacío."
        );
      }

      console.log(
        "DataService: Rutas de datos finales a utilizar:",
        this.dataPaths
      );

      // Cargar errores iniciales (con caché en localStorage si está disponible)
      // await this.loadInitialData(); // ELIMINADO PARA EVITAR DEADLOCK

      console.log("DataService.init: Inicialización completada.");
      console.timeEnd("DataService:Init");
      this.isInitialized = true;
      this.initializationPromise = null;
      return true;
    } catch (error) {
      console.error(
        "DataService.init: Error al inicializar el servicio de datos:",
        error
      );
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
      `%cDataService.tryReadFile: ================= INICIO LECTURA ${fileName} =================`,
      "color: blue; font-weight: bold;"
    );
    console.log(
      `DataService.tryReadFile: CurrentDataPath: ${
        this.currentDataPath
      }, All dataPaths: ${JSON.stringify(this.dataPaths)}`
    );
    console.time("FileReadAttempt");

    // Si hay una ruta actual exitosa, intentar primero esa
    if (this.currentDataPath) {
      const filePath = this.fileService.buildFilePath(
        this.currentDataPath,
        fileName
      );
      console.log(
        `DataService.tryReadFile: Intentando leer desde ruta actual: ${filePath}`
      );
      try {
        const result = await this.fileService.readJson(filePath);
        console.log(
          `DataService.tryReadFile: Resultado desde ruta actual ${filePath}:`
          // JSON.stringify(result) // FileService ya loguea esto
        );
        if (result && result.success === true) {
          console.timeEnd("FileReadAttempt");
          return result;
        }
      } catch (error) {
        // FileService.readJson ya maneja y loguea la excepción, devolviendo un objeto de error.
        // Aquí solo registramos que el intento falló para esta ruta específica.
        console.warn(
          `DataService.tryReadFile: No se pudo leer desde ruta actual ${filePath} (excepción propagada o resultado de error de FileService):`,
          error // Esto podría ser el objeto de error de FileService o una excepción si algo más falló.
        );
      }
    }

    // Intentar todas las rutas
    console.log("DataService.tryReadFile: Iterando sobre dataPaths...");
    if (!this.dataPaths || this.dataPaths.length === 0) {
      console.warn(
        "DataService.tryReadFile: No hay dataPaths configuradas para iterar."
      );
    }

    for (const dataPath of this.dataPaths) {
      if (this.currentDataPath && dataPath === this.currentDataPath) {
        console.log(
          `DataService.tryReadFile: Saltando dataPath ${dataPath} (ya intentada como currentDataPath).`
        );
        continue;
      }

      const filePath = this.fileService.buildFilePath(dataPath, fileName);
      console.log(
        `DataService.tryReadFile: Intentando leer archivo desde (bucle): ${filePath}`
      );
      try {
        const result = await this.fileService.readJson(filePath);
        console.log(
          `DataService.tryReadFile: Resultado desde ${filePath} (bucle):`
          // JSON.stringify(result) // FileService ya loguea esto
        );
        if (result && result.success === true) {
          this.currentDataPath = dataPath;
          console.log(
            `DataService.tryReadFile: Archivo leído correctamente desde ${filePath}. Estableciendo como currentDataPath.`
          );
          console.timeEnd("FileReadAttempt");
          return result;
        }
      } catch (error) {
        console.warn(
          `DataService.tryReadFile: No se pudo leer desde ${filePath} (bucle, excepción propagada o resultado de error de FileService):`,
          error
        );
      }
    }

    console.timeEnd("FileReadAttempt");
    const errorMessage = `DataService.tryReadFile: No se pudo leer el archivo ${fileName} desde ninguna ruta. Rutas configuradas: ${
      this.dataPaths?.join(", ") || "ninguna"
    }`;
    console.error(errorMessage);
    // Devolver un objeto de error consistente con lo que FileService.readJson devolvería en caso de fallo total.
    return { success: false, error: errorMessage, data: null };
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
    console.time("SaveData");
    try {
      // Verificar si tenemos una ruta de datos
      if (
        !this.currentDataPath &&
        this.dataPaths &&
        this.dataPaths.length > 0
      ) {
        // Usar la primera ruta disponible si no hay una actual y hay dataPaths
        this.currentDataPath = this.dataPaths[0];
      } else if (
        !this.currentDataPath &&
        (!this.dataPaths || this.dataPaths.length === 0)
      ) {
        const errorMsg =
          "DataService.saveData: No hay currentDataPath ni dataPaths configuradas para guardar.";
        console.error(errorMsg);
        throw new Error(errorMsg); // Lanzar error si no hay dónde guardar.
      }

      const filePath = this.fileService.buildFilePath(
        this.currentDataPath,
        this.fileNames.errors
      );
      console.log(`Guardando datos en: ${filePath}`);

      // Preparar datos para guardar
      const dataToSave = { errors: this.errors }; // Aseguramos que pasamos el objeto esperado

      // Guardar archivo
      try {
        const result = await this.fileService.saveJson(filePath, dataToSave);

        if (!result.success) {
          // FileService ya loguea el error específico.
          // Lanzamos un error aquí para que el bloque catch externo lo maneje (intento de rutas alternativas).
          throw new Error(
            result.error ||
              "Error desconocido al guardar archivo via FileService"
          );
        }

        // Actualizar timestamp
        this.lastUpdateTime = new Date();

        // Guardar en caché local
        this.saveToCache();

        console.timeEnd("SaveData");
        return true;
      } catch (saveError) {
        console.error(
          "DataService.saveData: Error al guardar archivo en la ruta principal, intentando alternativas:",
          saveError.message
        );

        // Intentar con la siguiente ruta si está disponible
        for (const dataPath of this.dataPaths) {
          // Saltarse la ruta actual que falló
          if (dataPath === this.currentDataPath) continue;

          const altFilePath = this.fileService.buildFilePath(
            dataPath,
            this.fileNames.errors
          );
          console.log(`Intentando guardar en ruta alternativa: ${altFilePath}`);

          try {
            // Reintentar con saveJson del FileService
            const altResult = await this.fileService.saveJson(
              altFilePath,
              dataToSave
            );
            if (altResult.success) {
              // Guardar la nueva ruta como actual
              this.currentDataPath = dataPath;
              this.lastUpdateTime = new Date();

              // Guardar en caché local
              this.saveToCache();

              console.log(
                "DataService.saveData: Guardado exitoso en ruta alternativa."
              );
              console.timeEnd("SaveData");
              return true;
            }
          } catch (altError) {
            // FileService ya loguea errores de saveJson.
            console.warn(
              `DataService.saveData: No se pudo guardar en ruta alternativa ${altFilePath} (excepción o error de FileService):`,
              altError.message
            );
          }
        }

        // Si llegamos aquí, todos los intentos de guardado fallaron.
        const finalErrorMsg =
          "DataService.saveData: No se pudo guardar en ninguna ruta.";
        console.error(finalErrorMsg);
        // No simular éxito, propagar el fallo.
        // this.lastUpdateTime = new Date(); // No actualizar si no se guardó
        // this.saveToCache(); // No guardar en caché si no se guardó en archivo
        console.timeEnd("SaveData");
        // Devolver false o lanzar error. Devolver false es consistente con el comportamiento previo si la simulación de éxito se elimina.
        return false;
      }
    } catch (error) {
      console.error(
        "DataService.saveData: Error general al guardar datos:",
        error.message
      );
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
      await this.ensureInitialized();
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

      // Exportar a archivo (usando FileService)
      return await this.fileService.exportToCsv(csvContent);
    } catch (error) {
      console.error("DataService.exportToCsv: Error al exportar a CSV:", error);
      // FileService.exportToCsv ya devuelve un objeto { success, error },
      // pero si hay una excepción aquí antes de llamarlo, la capturamos.
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

    // Limpiar callbacks
    this.refreshListeners = [];
  }
}
