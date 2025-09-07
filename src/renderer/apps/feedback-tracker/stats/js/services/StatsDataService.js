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
    this.isLoading = false;
    this.dpmoData = null;

    console.log("📊 StatsDataService inicializado");
  }

  /**
   * Inicializa el servicio de datos
   */
  async init() {
    try {
      await this.loadConfig();

      // Cargar datos iniciales
      const success = await this.loadData();

      if (success) {
        console.log("✅ StatsDataService inicializado correctamente");
        return true;
      } else {
        console.warn("⚠️ StatsDataService inicializado sin datos");
        this.errors = [];
        return true;
      }
    } catch (error) {
      console.error("❌ Error inicializando StatsDataService:", error);
      this.errors = [];
      return false;
    }
  }

  /**
   * Carga la configuración de rutas de datos (copiado de EstadisticasDataService que funciona)
   */
  async loadConfig() {
    try {
      console.log("🔧 Cargando configuración directamente...");

      // CAMBIO: Usar window.api.getConfig() como en EstadisticasDataService
      const config = await window.api.getConfig();

      if (config && config.dataPaths) {
        this.dataPaths = config.dataPaths;
        console.log("📁 Rutas de datos:", this.dataPaths);
      } else {
        throw new Error("No se encontraron rutas de datos en la configuración");
      }
    } catch (error) {
      console.warn("⚠️ Error cargando configuración directamente:", error);

      // Intentar usar el servicio principal como fallback
      if (
        window.inboundScope &&
        window.inboundScope.configService &&
        window.inboundScope.configService.getConfig
      ) {
        try {
          const config = await window.inboundScope.configService.getConfig();
          if (config && config.dataPaths) {
            this.dataPaths = config.dataPaths;
            console.log("📁 Rutas de datos desde servicio:", this.dataPaths);
            return;
          }
        } catch (e) {
          console.warn("⚠️ Error usando servicio de configuración:", e);
        }
      }

      // Rutas por defecto como último recurso
      this.dataPaths = [
        "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\Data\\",
        "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data\\",
      ];
      console.log("📁 Usando rutas por defecto:", this.dataPaths.length);
    }
  }

  /**
   * Carga los datos de errores (copiado de EstadisticasDataService que funciona)
   */
  async loadData() {
    if (this.isLoading) {
      console.log("⏳ Ya hay una carga en progreso...");
      return false;
    }

    this.isLoading = true;
    console.log("📥 Iniciando carga de datos para Stats...");

    let errorsLoaded = false;

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
          if (typeof mainDataService.ensureInitialized === "function") {
            await mainDataService.ensureInitialized();
          }

          if (mainDataService.errors && mainDataService.errors.length > 0) {
            console.log("🚀 Usando datos del servicio principal (caché)");
            this.errors = [...mainDataService.errors];
            this.lastUpdateTime = mainDataService.lastUpdateTime || new Date();
            console.log(
              `✅ Datos obtenidos del servicio principal: ${this.errors.length} registros`
            );
            errorsLoaded = true;
          } else {
            // Intentar cargar datos en el servicio principal
            console.log(
              "📥 Intentando cargar datos en el servicio principal..."
            );

            if (typeof mainDataService.loadInitialData === "function") {
              const loaded = await mainDataService.loadInitialData();
              if (
                loaded &&
                mainDataService.errors &&
                mainDataService.errors.length > 0
              ) {
                console.log("🚀 Datos cargados en el servicio principal");
                this.errors = [...mainDataService.errors];
                this.lastUpdateTime =
                  mainDataService.lastUpdateTime || new Date();
                console.log(
                  `✅ Datos cargados: ${this.errors.length} registros`
                );
                errorsLoaded = true;
              }
            }
          }
        } catch (error) {
          console.warn("⚠️ Error con el servicio principal:", error);
          // Continuar con carga directa
        }
      }

      // Si no hay datos en el servicio principal, cargar directamente
      if (!errorsLoaded) {
        console.log("📂 Cargando datos directamente desde archivo...");
        const result = await this.readDataFile();

        if (result && result.success) {
          this.errors = result.data?.errors || result.data || [];
          this.lastUpdateTime = new Date();
          console.log(
            `✅ Datos cargados directamente: ${this.errors.length} registros`
          );
          errorsLoaded = true;
        } else {
          console.error(
            "❌ Error cargando datos:",
            result?.error || "Sin datos"
          );
          this.errors = [];
        }
      }

      // IMPORTANTE: Cargar datos DPMO independientemente del resultado de la carga de errores
      console.log("📊 Cargando datos DPMO independientemente del resultado...");
      await this.loadDPMOData();

      return errorsLoaded;
    } catch (error) {
      console.error("❌ Error en loadData:", error);
      this.errors = [];
      return false;
    } finally {
      // Siempre intentar cargar DPMO antes de finalizar
      if (this.dpmoData === null) {
        console.log("📊 Último intento de cargar datos DPMO...");
        await this.loadDPMOData();
      }

      this.isLoading = false;
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
   * Intenta cargar datos del servicio de feedback-tracker específicamente
   */
  tryLoadFromFeedbackTracker() {
    console.log("🔍 Buscando datos de feedback-tracker...");

    // Buscar el servicio de feedback-tracker en múltiples ubicaciones posibles
    const possibleSources = [
      {
        name: "window.feedbackTrackerDataService",
        source: window.feedbackTrackerDataService,
      },
      {
        name: "window.feedbackTracker?.dataService",
        source: window.feedbackTracker?.dataService,
      },
      {
        name: "window.inboundScope?.feedbackTracker?.dataService",
        source: window.inboundScope?.feedbackTracker?.dataService,
      },
      {
        name: "window.inboundScope?.dataServices?.feedbackTracker",
        source: window.inboundScope?.dataServices?.feedbackTracker,
      },
      {
        name: "window.feedbackTrackerData",
        source: window.feedbackTrackerData,
      },
      { name: "window.errorsData", source: window.errorsData },
    ];

    for (const { name, source } of possibleSources) {
      console.log(
        `🔍 Verificando ${name}:`,
        source ? "✓ Existe" : "✗ No existe"
      );

      if (source) {
        console.log(
          `  - Tiene errors:`,
          source.errors ? `✓ (${source.errors?.length || 0} registros)` : "✗ No"
        );

        if (source.errors && source.errors.length > 0) {
          this.errors = [...source.errors];
          this.lastUpdateTime = source.lastUpdateTime || new Date();
          console.log(
            `✅ Datos cargados desde ${name}: ${this.errors.length} registros`
          );

          // Mostrar muestra de datos
          if (this.errors.length > 0) {
            console.log("📋 Muestra de datos encontrados:");
            this.errors.slice(0, 2).forEach((error, index) => {
              console.log(
                `  ${index + 1}. ${
                  error.violation || error.error || "Sin descripción"
                } - Cantidad: ${error.quantity || 1}`
              );
            });
          }

          return true;
        }
      }
    }

    // Buscar datos directamente en variables globales
    console.log(
      "🔍 Verificando window.currentErrorsData:",
      window.currentErrorsData ? "✓ Existe" : "✗ No existe"
    );

    if (
      window.currentErrorsData &&
      Array.isArray(window.currentErrorsData) &&
      window.currentErrorsData.length > 0
    ) {
      this.errors = [...window.currentErrorsData];
      this.lastUpdateTime = new Date();
      console.log(
        `✅ Datos cargados desde window.currentErrorsData: ${this.errors.length} registros`
      );
      return true;
    }

    console.log(
      "❌ No se encontraron datos de feedback-tracker en ninguna ubicación"
    );
    return false;
  }

  /**
   * Intenta cargar datos del servicio principal global
   */
  tryLoadFromGlobalService() {
    console.log("🔍 Verificando servicio principal global...");
    console.log(
      "🔍 window.inboundScope:",
      window.inboundScope ? "✓ Existe" : "✗ No existe"
    );

    if (window.inboundScope) {
      console.log(
        "🔍 window.inboundScope.dataService:",
        window.inboundScope.dataService ? "✓ Existe" : "✗ No existe"
      );

      if (window.inboundScope.dataService) {
        console.log(
          "🔍 dataService.errors:",
          window.inboundScope.dataService.errors
            ? `✓ (${
                window.inboundScope.dataService.errors?.length || 0
              } registros)`
            : "✗ No existe"
        );

        if (
          window.inboundScope.dataService.errors &&
          window.inboundScope.dataService.errors.length > 0
        ) {
          this.errors = [...window.inboundScope.dataService.errors];
          this.lastUpdateTime =
            window.inboundScope.dataService.lastUpdateTime || new Date();
          console.log(
            `✅ Datos cargados desde servicio principal: ${this.errors.length} registros`
          );
          return true;
        }
      }
    }

    console.log("❌ No se encontraron datos en el servicio principal global");
    return false;
  }

  /**
   * Lee el archivo de datos más reciente (copiado de EstadisticasDataService)
   */
  async readDataFile() {
    // Intentar primero con la ruta actual si está disponible (más eficiente)
    if (this.currentDataPath) {
      try {
        console.log(
          `🎯 Intentando leer desde ruta actual: ${this.currentDataPath}`
        );

        // Probar diferentes formatos de archivo
        const today = new Date();
        const dateFormats = [
          this.formatDate(today),
          this.formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000)), // Ayer
          this.formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)), // Anteayer
        ];

        for (const dateStr of dateFormats) {
          const fileName = `error_tracker_${dateStr}.json`;
          const filePath = `${this.currentDataPath}/${fileName}`;

          try {
            console.log(`🎯 Intentando leer: ${filePath}`);
            const data = await window.api.readJson(filePath);

            if (data && (Array.isArray(data) || data.errors)) {
              console.log(
                `✅ Archivo leído exitosamente desde ruta actual: ${this.currentDataPath}`
              );
              return {
                success: true,
                data: Array.isArray(data) ? { errors: data } : data,
              };
            }
          } catch (error) {
            console.log(`⚠️ No se pudo leer: ${filePath}`);
            continue;
          }
        }
      } catch (error) {
        console.warn(
          `⚠️ Error leyendo desde ruta actual ${this.currentDataPath}:`,
          error
        );
      }
    }

    // Si no hay ruta actual o falló, probar todas las rutas
    console.log("🔄 Probando todas las rutas disponibles...");

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

          if (data && (Array.isArray(data) || data.errors)) {
            this.currentDataPath = path;
            console.log(`✅ Archivo leído exitosamente: ${fullPath}`);
            return {
              success: true,
              data: Array.isArray(data) ? { errors: data } : data,
            };
          }
        } catch (error) {
          console.log(`⚠️ No se pudo leer: ${fullPath}`);
          continue;
        }
      }
    }

    console.log("❌ No se encontró ningún archivo de datos");
    return { success: false, error: "No se encontró ningún archivo de datos" };
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
   * Recarga completamente los datos (fuerza recarga desde todas las fuentes)
   */
  async reloadData() {
    console.log("🔄 Forzando recarga completa de datos...");

    // Limpiar datos actuales y caché
    this.errors = [];
    this.lastUpdateTime = null;
    this.currentDataPath = null;
    this.isLoading = false; // Resetear estado de carga
    this.dpmoData = null; // Limpiar datos DPMO

    // Recargar configuración desde cero
    await this.loadConfig();

    // Intentar cargar datos desde todas las fuentes posibles
    const success = await this.loadData();

    if (success) {
      console.log(
        `✅ Datos recargados exitosamente: ${this.errors.length} registros`
      );
    } else {
      console.warn("⚠️ No se pudieron recargar datos");
    }

    return success;
  }

  /**
   * Carga los datos de DPMO desde el archivo Errors_DPMO_[Fecha].json
   * Usa FileService para mantener consistencia con la carga de otros archivos
   */
  async loadDPMOData() {
    console.log("📊 Cargando datos de DPMO...");

    // Obtener una instancia de FileService
    // Importamos dinámicamente para evitar problemas de dependencias circulares
    let FileService;
    try {
      console.log("🔍 Verificando disponibilidad de FileService...");
      console.log(
        "🔍 window.inboundScope:",
        window.inboundScope ? "✓ Existe" : "✗ No existe"
      );

      if (window.inboundScope) {
        console.log(
          "🔍 window.inboundScope.fileService:",
          window.inboundScope.fileService ? "✓ Existe" : "✗ No existe"
        );
      }

      if (window.inboundScope && window.inboundScope.fileService) {
        console.log("📁 Usando FileService desde inboundScope");
        FileService = window.inboundScope.fileService;
      } else {
        console.log("📁 Creando nueva instancia de FileService");
        console.log(
          "📁 Intentando importar desde: ../../../js/services/FileService.js"
        );

        try {
          // Importar dinámicamente FileService - corregir ruta
          const module = await import("../../../js/services/FileService.js");
          console.log("📁 Módulo FileService importado:", module);
          FileService = new module.FileService();
          console.log("📁 Nueva instancia de FileService creada");
        } catch (importError) {
          console.error("❌ Error al importar FileService:", importError);
          throw importError;
        }
      }
    } catch (error) {
      console.error("❌ Error al obtener FileService:", error);
      console.log("📁 Intentando método fallback directo...");
      // Fallback a window.api.readJson si no podemos obtener FileService
      return this.loadDPMODataFallback();
    }

    // Probar diferentes formatos de archivo para DPMO
    const today = new Date();
    const dateFormats = [
      this.formatDate(today),
      this.formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000)), // Ayer
      this.formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)), // Anteayer
    ];

    console.log(`🔍 Formatos de fecha a probar: ${dateFormats.join(", ")}`);

    // Generar nombres de archivo para cada formato de fecha
    const fileNames = dateFormats.map(
      (dateStr) => `Errors_DPMO_${dateStr}.json`
    );

    // Añadir nombres alternativos
    const alternativeNames = [
      "Errors_DPMO.json",
      "DPMO.json",
      "dpmo_data.json",
    ];

    // Combinar todos los nombres de archivo a probar
    const allFileNames = [...fileNames, ...alternativeNames];

    console.log(`📋 Nombres de archivo a probar: ${allFileNames.join(", ")}`);

    // Intentar cargar cada nombre de archivo en orden
    for (const fileName of allFileNames) {
      console.log(`🔍 Buscando archivo: ${fileName}`);

      try {
        // Usar tryReadJsonFromPaths para buscar en todas las rutas disponibles
        const result = await FileService.tryReadJsonFromPaths(
          this.dataPaths,
          fileName
        );

        if (result && result.success && result.data && result.data.dpmo) {
          console.log(
            `✅ Archivo DPMO encontrado: ${fileName} en ${result.pathUsed}`
          );

          // Actualizar currentDataPath si se encontró un archivo
          if (result.pathUsed && !this.currentDataPath) {
            this.currentDataPath = result.pathUsed;
            console.log(`✅ Actualizada ruta actual a: ${result.pathUsed}`);
          }

          // Procesar los datos
          this.dpmoData = {
            dpmo: result.data.dpmo,
            totalMovimientos: result.data.total_movimientos || 0,
            totalErrores: result.data.total_errores || 0,
            fecha: result.data.fecha || this.formatDate(new Date()),
            sigma: result.data.sigma || 0,
            calidad: result.data.calidad || "N/A",
            ultimaActualizacion:
              result.data.ultima_actualizacion || new Date().toISOString(),
          };
          return true;
        }
      } catch (error) {
        console.error(`❌ Error al buscar ${fileName}:`, error);
        // Continuar con el siguiente nombre de archivo
      }
    }

    console.warn("⚠️ No se encontró ningún archivo DPMO válido");

    // Si llegamos aquí, no se encontró ningún archivo DPMO
    return this.loadDPMODataFallback();
  }

  /**
   * Método de respaldo para cargar datos DPMO cuando falla FileService
   */
  async loadDPMODataFallback() {
    console.log("📊 Usando método fallback para cargar DPMO...");

    // Probar diferentes formatos de archivo para DPMO
    const today = new Date();
    const dateFormats = [
      this.formatDate(today),
      this.formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000)), // Ayer
      this.formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)), // Anteayer
    ];

    // PASO 1: Intentar con currentDataPath si está disponible
    if (this.currentDataPath) {
      console.log(
        `🔍 Intentando buscar DPMO en ruta actual: ${this.currentDataPath}`
      );

      for (const dateStr of dateFormats) {
        const fileName = `Errors_DPMO_${dateStr}.json`;
        const filePath = `${this.currentDataPath}/${fileName}`;

        try {
          console.log(`🎯 Intentando leer DPMO: ${filePath}`);
          const data = await window.api.readJson(filePath);

          if (data && data.dpmo) {
            this.dpmoData = {
              dpmo: data.dpmo,
              totalMovimientos: data.total_movimientos,
              totalErrores: data.total_errores,
              fecha: data.fecha,
              sigma: data.sigma,
              calidad: data.calidad,
              ultimaActualizacion: data.ultima_actualizacion,
            };

            return true;
          }
        } catch (error) {
          console.log(`⚠️ No se pudo leer DPMO: ${filePath}`);
          continue;
        }
      }
    }

    // PASO 2: Probar en todas las rutas configuradas
    for (const path of this.dataPaths) {
      for (const dateStr of dateFormats) {
        const fileName = `Errors_DPMO_${dateStr}.json`;
        const fullPath = `${path}/${fileName}`;

        try {
          console.log(`🎯 Intentando leer DPMO: ${fullPath}`);
          const data = await window.api.readJson(fullPath);

          if (data && data.dpmo) {
            this.dpmoData = {
              dpmo: data.dpmo,
              totalMovimientos: data.total_movimientos,
              totalErrores: data.total_errores,
              fecha: data.fecha,
              sigma: data.sigma,
              calidad: data.calidad,
              ultimaActualizacion: data.ultima_actualizacion,
            };

            // Guardar la ruta exitosa como currentDataPath si no estaba definida
            if (!this.currentDataPath) {
              this.currentDataPath = path;
              console.log(`✅ Actualizada ruta actual a: ${path}`);
            }

            return true;
          }
        } catch (error) {
          console.log(`⚠️ No se pudo leer DPMO: ${fullPath}`);
          continue;
        }
      }
    }

    // PASO 3: Probar con nombres de archivo alternativos
    const alternativeNames = [
      "Errors_DPMO.json",
      "DPMO.json",
      "dpmo_data.json",
    ];

    for (const path of this.dataPaths) {
      for (const altName of alternativeNames) {
        const fullPath = `${path}/${altName}`;

        try {
          console.log(`🎯 Intentando leer DPMO alternativo: ${fullPath}`);
          const data = await window.api.readJson(fullPath);

          if (data && data.dpmo) {
            this.dpmoData = {
              dpmo: data.dpmo,
              totalMovimientos: data.total_movimientos || 0,
              totalErrores: data.total_errores || 0,
              fecha: data.fecha || this.formatDate(new Date()),
              sigma: data.sigma || 0,
              calidad: data.calidad || "N/A",
              ultimaActualizacion:
                data.ultima_actualizacion || new Date().toISOString(),
            };

            return true;
          }
        } catch (error) {
          console.log(`⚠️ No se pudo leer DPMO alternativo: ${fullPath}`);
          continue;
        }
      }
    }

    console.warn("⚠️ No se encontraron datos DPMO en ninguna ubicación");

    // NO USAR DATOS FALSOS - Es peligroso
    this.dpmoData = null;
    return false;
  }

  /**
   * Obtiene estadísticas básicas de los errores
   */
  getBasicStats(dateRange = 0) {
    const now = new Date();
    let startDate;
    let endDate;

    if (dateRange === 0) {
      // Para "hoy": desde las 00:00:00 hasta las 23:59:59 de hoy
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
    } else {
      // Para otros rangos: desde hace X días hasta ahora
      startDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);
      endDate = now;
    }

    console.log(
      `📊 Calculando estadísticas para rango: ${
        dateRange === 0 ? "HOY" : dateRange + " días"
      }`
    );
    console.log(
      `📅 Rango de fechas: ${startDate.toISOString().split("T")[0]} - ${
        endDate.toISOString().split("T")[0]
      }`
    );
    console.log(`📁 Total de errores disponibles: ${this.errors.length}`);

    // Filtrar errores por rango de fecha
    let filteredErrors = this.errors.filter((error) => {
      const errorDate = new Date(
        error.created_date || error.date || error.timestamp
      );
      const isInRange = errorDate >= startDate && errorDate <= endDate;

      if (!isInRange && dateRange === 0) {
        console.log(
          `⏰ Error excluido - Fecha: ${
            errorDate.toISOString().split("T")[0]
          }, Expected: ${startDate.toISOString().split("T")[0]}`
        );
      }

      return isInRange;
    });

    // IMPORTANTE: Si no hay errores para "Hoy", usar todos los errores disponibles
    if (filteredErrors.length === 0 && this.errors.length > 0) {
      console.log(
        "⚠️ No hay errores para el rango seleccionado. Mostrando todos los errores disponibles."
      );
      filteredErrors = [...this.errors];
    }

    console.log(
      `✅ Errores filtrados: ${filteredErrors.length}${
        filteredErrors.length === this.errors.length ? " (mostrando todos)" : ""
      }`
    );

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

    // Calcular tasa de resolución (porcentaje)
    const resolutionRate =
      totalErrors > 0 ? Math.round((resolvedQuantity / totalErrors) * 100) : 0;

    // Calcular promedio diario (para los últimos 7 días si hay suficientes datos)
    const daysToAverage = Math.min(7, dateRange || 7);
    const dailyAverage = Math.round(totalErrors / daysToAverage);

    // Incluir datos DPMO si están disponibles
    const stats = {
      totalErrors,
      totalLines,
      resolvedErrors: resolvedQuantity,
      pendingErrors: pendingQuantity,
      resolutionRate,
      dailyAverage,
      dpmo: this.dpmoData,
    };

    console.log(`📊 Estadísticas calculadas: ${JSON.stringify(stats)}`);
    return stats;
  }
}
