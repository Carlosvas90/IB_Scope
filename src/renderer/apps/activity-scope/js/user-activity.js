/**
 * User Activity Controller
 * Maneja la lógica de monitoreo en tiempo real de usuarios
 */

import { UserImageService } from "./UserImageService.js";
import { getUserPhotoUrl } from "../../../core/utils/linkUtils.js";

class UserActivityController {
  constructor() {
    this.currentCategory = "each"; // Categoría por defecto
    this.currentRate = "stow"; // "stow" o "receive"
    this.stowData = null;
    this.receiveData = null; // Datos de Receive
    this.effortData = null;
    this.effortSummaryData = null;
    this.effortGeneralStats = null; // estadisticas_generales
    this.effortStowTimes = null; // tiempo_promedio_entre_stow_por_empleado
    this.rosterData = null;
    this.employee30minData = null;
    this.rotationData = null;
    this.userImageService = new UserImageService();
    this.availableZones = ["P1", "P2", "P3", "P4", "P5", "HRK"];
    this.currentUserLogin = null;
    this.assetsPaths = null;
    this.isShowingUserDetail = false;
    this.currentRotationFilter = "all"; // "all", "early", "late"
    this.currentSortColumn = "combined-uph"; // "combined-uph", "combined-hours", "combined-units"
    this.sortDirection = "desc"; // "asc", "desc"
    this.currentDateFilter = "today"; // "today", "yesterday", "before-yesterday"
    this.currentDate = this.getCurrentDateString();
    this.useDataTemp = false; // Si true, usa Data_temp en lugar de Data
    this.dateInfo = this.calculateDates(); // Info de las 3 fechas

    this.init();
  }
  
  /**
   * Calcula las fechas para hoy, ayer y anteayer
   * @returns {Object} Objeto con información de las 3 fechas
   */
  calculateDates() {
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const beforeYesterday = new Date(today);
    beforeYesterday.setDate(beforeYesterday.getDate() - 2);
    
    const formatDate = (date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}${month}${year}`;
    };
    
    const formatLabel = (date) => {
      const dayName = diasSemana[date.getDay()];
      const dayNum = String(date.getDate()).padStart(2, "0");
      return `${dayName} ${dayNum}`;
    };
    
    return {
      today: {
        label: "Hoy",
        dateString: formatDate(today),
        useDataTemp: false
      },
      yesterday: {
        label: formatLabel(yesterday),
        dateString: formatDate(yesterday),
        useDataTemp: true
      },
      beforeYesterday: {
        label: formatLabel(beforeYesterday),
        dateString: formatDate(beforeYesterday),
        useDataTemp: true
      }
    };
  }

  /**
   * Genera la fecha actual en formato DDMMYYYY
   * @returns {string} Fecha en formato DDMMYYYY
   */
  getCurrentDateString() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    return `${day}${month}${year}`;
  }

  /**
   * Genera el nombre de archivo con fecha actual
   * @param {string} baseName - Nombre base del archivo
   * @returns {string} Nombre completo del archivo con fecha
   */
  getFileNameWithDate(baseName) {
    return `${baseName}_${this.currentDate}.json`;
  }
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds.toFixed(1)} seg`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}min ${remainingSeconds}seg`;
    }
  }

  /**
   * Calcula porcentaje de diferencia respecto al promedio
   * @param {number} userValue - Valor del usuario
   * @param {number} averageValue - Valor promedio
   * @returns {string} Porcentaje formateado (ej: "+15%" o "-20%")
   */
  calculatePercentageDifference(userValue, averageValue) {
    if (!averageValue || averageValue === 0) return "N/A";
    const percentage = ((userValue - averageValue) / averageValue) * 100;
    const sign = percentage >= 0 ? "+" : "";
    return `${sign}${percentage.toFixed(0)}%`;
  }

  /**
   * Formatea comparación con promedio
   * @param {number} userValue - Valor del usuario
   * @param {number} averageValue - Valor promedio
   * @param {string} unit - Unidad (ej: "m", "units", etc.)
   * @returns {string} Comparación formateada en HTML
   */
  formatComparison(userValue, averageValue, unit = "") {
    // Determinar precisión decimal según el tipo de métrica
    let decimals = 1; // Por defecto 1 decimal

    if (unit === "units" || unit === "" || unit.includes("bin")) {
      decimals = 2; // Para units/bin necesitamos más precisión
    } else if (unit === "m") {
      decimals = 1; // Para distancia metros es suficiente
    } else if (unit === "h" || unit === "seg") {
      decimals = 2; // Para tiempo necesitamos más precisión
    }

    // Redondear valores con la precisión apropiada
    const roundedUserValue =
      Math.round(userValue * Math.pow(10, decimals)) / Math.pow(10, decimals);
    const roundedAverageValue =
      Math.round(averageValue * Math.pow(10, decimals)) /
      Math.pow(10, decimals);

    const percentage = this.calculatePercentageDifference(
      roundedUserValue,
      roundedAverageValue
    );

    // Solo mostrar unidades cuando sea necesario para claridad
    const displayUnit = this.shouldShowUnit(unit);

    return `
      <div class="comparison-main">${roundedUserValue}${displayUnit}</div>
      <div class="comparison-sub">(avg: ${roundedAverageValue}${displayUnit}, ${percentage} vs media)</div>
    `;
  }

  /**
   * Determina si debe mostrar la unidad en la comparación
   * @param {string} unit - Unidad a evaluar
   * @returns {string} Unidad a mostrar (vacía si no es necesaria)
   */
  shouldShowUnit(unit) {
    // Solo mostrar unidades cuando sea necesario para claridad
    if (unit === "m" || unit === "h" || unit === "seg" || unit === "min") {
      return unit; // Para tiempo y distancia es importante
    }
    return ""; // Para units, cambios, errores, etc. no es necesario
  }

  /**
   * Inicializa el controlador
   */
  async init() {
    console.log("🚀 Inicializando UserActivityController...");
    console.log("📅 Fecha actual detectada:", this.currentDate);
    console.log("📅 Info de fechas:", this.dateInfo);

    // Actualizar labels de botones de fecha
    this.updateDateLabels();

    await this.loadData();
    await this.loadRosterData();
    await this.loadEmployee30minData();
    console.log("🔄 Ejecutando loadRotationData...");
    await this.loadRotationData();
    await this.loadAssetsPaths();
    await this.loadEffortData();
    await this.loadActivityScopeIcons();
    this.updateCategoryButtons(); // Actualizar botones de categoría según rate actual
    this.updateSortButtons(); // Actualizar botones de ordenamiento según rate actual
    this.setupEventListeners();
    this.setupHeatmapModalEvents();
    this.updateTable();
    this.setupUserImagePopups();
    this.setupUserDetailEvents();
  }
  
  /**
   * Actualiza los labels del select de fecha con las fechas dinámicas
   */
  updateDateLabels() {
    const yesterdayOption = document.getElementById("date-option-yesterday");
    const beforeOption = document.getElementById("date-option-before");
    
    if (yesterdayOption) {
      yesterdayOption.textContent = this.dateInfo.yesterday.label;
    }
    if (beforeOption) {
      beforeOption.textContent = this.dateInfo.beforeYesterday.label;
    }
    
    console.log("📅 Labels de fecha actualizados:", {
      yesterday: this.dateInfo.yesterday.label,
      beforeYesterday: this.dateInfo.beforeYesterday.label
    });
  }

  /**
   * Configura los popups de imagen de usuario
   */
  setupUserImagePopups() {
    const tableBody = document.getElementById("table-body");
    if (tableBody) {
      this.userImageService.setupPopupEvents(tableBody.closest("table"));
      console.log("✅ Popups de imagen de usuario configurados");
    }
  }

  /**
   * Configura los eventos para la vista detallada de usuario
   */
  setupUserDetailEvents() {
    // Botón de cerrar vista detallada
    const closeBtn = document.getElementById("close-user-detail");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeUserDetailView());
    }

    // Toggle de foto
    const photoToggle = document.getElementById("photo-toggle-switch");
    if (photoToggle) {
      photoToggle.addEventListener("click", () => this.togglePhoto());
    }

    // Click en celdas de login
    document.addEventListener("click", async (e) => {
      const loginCell = e.target.closest(".cell-login");
      if (loginCell) {
        const login = loginCell.textContent.trim();
        if (login) {
          await this.showUserDetailView(login);
        }
      }
    });
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Botón de actualizar datos (refresh-activity-btn)
    const refreshBtn = document.getElementById("refresh-activity-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshData());
    }

    // Botones de categoría
    const categoryBtns = document.querySelectorAll(".category-btn");
    categoryBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const category = e.currentTarget.dataset.category;
        this.changeCategory(category);
      });
    });

    // Select de filtro de fecha
    const dateFilterSelect = document.getElementById("date-filter-select");
    if (dateFilterSelect) {
      dateFilterSelect.addEventListener("change", (e) => {
        const dateFilter = e.target.value;
        this.changeDateFilter(dateFilter);
      });
    }

    // Select de filtro de Rate (Stow/Receive)
    const rateFilterSelect = document.getElementById("rate-filter-select");
    if (rateFilterSelect) {
      rateFilterSelect.addEventListener("change", (e) => {
        const rate = e.target.value;
        this.changeRateFilter(rate);
      });
    }

    // Botones de filtro de rotación
    const rotationFilterBtns = document.querySelectorAll(
      ".rotation-filter-btn"
    );
    rotationFilterBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.changeRotationFilter(filter);
      });
    });

    // Botones de ordenamiento
    const sortBtns = document.querySelectorAll(".sort-btn");
    sortBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const sortColumn = e.currentTarget.dataset.sort;
        this.changeSortColumn(sortColumn);
      });
    });

    // Botón de dirección de ordenamiento
    const sortDirectionBtn = document.getElementById("sort-direction-btn");
    if (sortDirectionBtn) {
      sortDirectionBtn.addEventListener("click", () => {
        this.toggleSortDirection();
      });
    }

    // Filtros
    const userFilter = document.getElementById("user-filter");
    const dateFilter = document.getElementById("date-filter");
    const shiftFilter = document.getElementById("shift-filter");

    if (userFilter) {
      userFilter.addEventListener("change", () => this.applyFilters());
    }
    if (dateFilter) {
      dateFilter.addEventListener("change", () => this.applyFilters());
    }
    if (shiftFilter) {
      shiftFilter.addEventListener("change", () => this.applyFilters());
    }
  }

  /**
   * Carga los datos desde los archivos JSON
   */
  /**
   * Carga datos del roster
   */
  async loadRosterData() {
    console.log("👥 Cargando datos del roster desde data_paths...");

    try {
      const config = await window.api.getConfig();
      if (!config || !config.data_paths) {
        throw new Error("No se encontró configuración de data_paths");
      }

      console.log("📂 Archivo a cargar: roster.json");

      let rosterData = null;

      for (const dataPath of config.data_paths) {
        try {
          const rosterPath = `${dataPath}roster.json`;
          console.log("📂 Intentando cargar Roster desde:", rosterPath);

          const rosterResult = await window.api.readJson(rosterPath);

          if (rosterResult.success) {
            rosterData = rosterResult.data;
            console.log("✅ Roster cargado desde:", rosterPath);
            break;
          }
        } catch (error) {
          console.log(`❌ Error cargando desde ${dataPath}:`, error.message);
          continue;
        }
      }

      if (rosterData) {
        this.rosterData = rosterData;
        console.log("✅ Datos de Roster cargados:", {
          total_records: this.rosterData.metadata?.total_records || 0,
        });
      } else {
        console.error("❌ No se pudieron cargar datos de Roster");
        this.rosterData = null;
      }
    } catch (error) {
      console.error("❌ Error al cargar roster:", error);
      this.rosterData = null;
    }
  }

  /**
   * Cargar paths de assets desde config
   */
  async loadAssetsPaths() {
    try {
      console.log("🔧 Cargando Assets paths desde config...");
      const config = await window.api.getConfig();
      console.log("🔧 Config completo recibido:", config);

      if (config && config.Assets_paths) {
        this.assetsPaths = config.Assets_paths;
        console.log("✅ Assets paths cargados:", this.assetsPaths);
      } else {
        console.warn("⚠️ No se encontraron Assets_paths en config");
        console.warn("⚠️ Config recibido:", config);
        // Fallback a paths del config.json (hardcoded como backup)
        this.assetsPaths = [
          "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\Data\\Assets\\User_maps\\",
          "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data\\Assets\\User_maps\\",
        ];
      }
    } catch (error) {
      console.error("❌ Error cargando Assets paths:", error);
      // Fallback a paths del config.json (hardcoded como backup)
      this.assetsPaths = [
        "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\Data\\Assets\\User_maps\\",
        "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data\\Assets\\User_maps\\",
      ];
    }
  }

  /**
   * Carga datos de los últimos 30 minutos de empleados
   */
  async loadEmployee30minData() {
    console.log("⏰ Cargando datos de últimos 30 minutos desde data_paths...");
    console.log(`📅 Usando ${this.useDataTemp ? 'Data_temp' : 'Data'} para fecha: ${this.currentDate}`);

    try {
      const config = await window.api.getConfig();
      if (!config || !config.data_paths) {
        throw new Error("No se encontró configuración de data_paths");
      }

      // Obtener paths ajustados según la fecha seleccionada
      const adjustedPaths = this.getAdjustedDataPaths(config.data_paths);

      const employee30minFileName = this.getFileNameWithDate(
        "employee_last_30min"
      );
      console.log("📂 Archivo a cargar:", employee30minFileName);

      let employee30minData = null;

      for (const dataPath of adjustedPaths) {
        try {
          const employee30minPath = `${dataPath}${employee30minFileName}`;
          console.log(
            "📂 Intentando cargar Employee 30min desde:",
            employee30minPath
          );

          const employee30minResult = await window.api.readJson(
            employee30minPath
          );

          if (employee30minResult.success) {
            employee30minData = employee30minResult.data;
            console.log("✅ Employee 30min cargado desde:", employee30minPath);
            break;
          }
        } catch (error) {
          console.log(`❌ Error cargando desde ${dataPath}:`, error.message);
          continue;
        }
      }

      if (employee30minData) {
        this.employee30minData = employee30minData;
        console.log("✅ Datos de Employee 30min cargados:", {
          fecha: this.employee30minData.fecha,
          total_empleados: Object.keys(this.employee30minData.empleados || {})
            .length,
        });
      } else {
        console.error("❌ No se pudieron cargar datos de Employee 30min");
        this.employee30minData = null;
      }
    } catch (error) {
      console.error("❌ Error al cargar employee 30min:", error);
    }
  }

  /**
   * Carga los datos de análisis de esfuerzo
   */
  async loadEffortData() {
    try {
      console.log(
        "⚡ Cargando datos de análisis de esfuerzo desde data_paths..."
      );
      console.log(`📅 Usando ${this.useDataTemp ? 'Data_temp' : 'Data'} para fecha: ${this.currentDate}`);

      const config = await window.api.getConfig();
      if (!config || !config.data_paths) {
        throw new Error("No se encontró configuración de data_paths");
      }

      // Obtener paths ajustados según la fecha seleccionada
      const adjustedPaths = this.getAdjustedDataPaths(config.data_paths);

      const effortFileName = this.getFileNameWithDate("Categorias_Esfuerzo");
      console.log("📂 Archivo a cargar:", effortFileName);

      let effortData = null;

      for (const dataPath of adjustedPaths) {
        try {
          const filePath = `${dataPath}${effortFileName}`;
          console.log("📂 Intentando cargar esfuerzo desde:", filePath);

          effortData = await window.api.readJson(filePath);
          if (effortData.success) {
            console.log("✅ Datos de esfuerzo cargados desde:", filePath);
            break;
          }
        } catch (error) {
          console.log(`❌ Error cargando desde ${dataPath}:`, error.message);
          continue;
        }
      }

      // Verificar que effortData existe Y que success es true (o que tiene datos válidos)
      if (effortData && effortData.success && effortData.data) {
        // Estructura {success: true, data: {...}}
        this.effortData = effortData.data;
        this.effortSummaryData = effortData.data.resumen_categorias;
        this.effortGeneralStats = effortData.data.estadisticas_generales;
        this.effortStowTimes =
          effortData.data.tiempo_promedio_entre_stow_por_empleado;
        console.log(
          "✅ Datos de esfuerzo extraídos de estructura success/data"
        );
        console.log("🔍 Debug extracción success/data:");
        console.log(
          "- effortData.data keys:",
          Object.keys(effortData.data || {})
        );

        console.log(
          `✅ Datos de esfuerzo cargados: {total_empleados: ${
            Object.keys(this.effortData.analisis_por_empleado || {}).length
          }}`
        );
        console.log("🔍 Resumen de categorías:", this.effortSummaryData);
        console.log("📊 Estadísticas generales:", this.effortGeneralStats);
        console.log("⏱️ Tiempos entre stow:", this.effortStowTimes);
      } else if (effortData && !effortData.success) {
        // La API devolvió un error
        console.warn(`⚠️ Error cargando datos de esfuerzo: ${effortData.error || 'Archivo no encontrado'}`);
        this.effortData = null;
        this.effortSummaryData = null;
        this.effortGeneralStats = null;
        this.effortStowTimes = null;
      } else {
        console.warn("⚠️ No se pudieron cargar los datos de esfuerzo");
        this.effortData = null;
        this.effortSummaryData = null;
        this.effortGeneralStats = null;
        this.effortStowTimes = null;
      }
    } catch (error) {
      console.error("❌ Error cargando datos de esfuerzo:", error);
      this.effortData = null;
      this.effortSummaryData = null;
      this.effortGeneralStats = null;
      this.effortStowTimes = null;
    }
  }

  /**
   * Carga datos de rotación de turnos
   */
  async loadRotationData() {
    try {
      console.log(
        "🔄 Cargando datos de rotación de turnos desde data_paths..."
      );
      console.log(`📅 Usando ${this.useDataTemp ? 'Data_temp' : 'Data'} para fecha: ${this.currentDate}`);

      const config = await window.api.getConfig();
      if (!config || !config.data_paths) {
        throw new Error("No se encontró configuración de data_paths");
      }

      // Obtener paths ajustados según la fecha seleccionada
      const adjustedPaths = this.getAdjustedDataPaths(config.data_paths);

      const rotationFileName = this.getFileNameWithDate("Login_Rotation_Shift");
      console.log("📂 Archivo a cargar:", rotationFileName);

      let rotationData = null;

      for (const dataPath of adjustedPaths) {
        try {
          const filePath = `${dataPath}${rotationFileName}`;
          console.log("📂 Intentando cargar rotación desde:", filePath);

          rotationData = await window.api.readJson(filePath);
          if (rotationData.success) {
            console.log("✅ Datos de rotación cargados desde:", filePath);
            break;
          }
        } catch (error) {
          console.log(`❌ Error cargando desde ${dataPath}:`, error.message);
          continue;
        }
      }

      if (rotationData) {
        // Si viene con estructura {success: true, data: {...}}, usar solo data
        if (rotationData.success && rotationData.data) {
          this.rotationData = rotationData.data;
          console.log(
            "✅ Datos de rotación extraídos de estructura success/data"
          );
        } else {
          this.rotationData = rotationData;
        }

        console.log(
          `✅ Datos de rotación cargados: {total_users: ${
            this.rotationData.user_rotations?.length || 0
          }}`
        );
        console.log(
          "🔍 Primeros usuarios de rotación:",
          this.rotationData.user_rotations?.slice(0, 3)
        );
      } else {
        console.warn("⚠️ No se pudieron cargar los datos de rotación");
        this.rotationData = null;
      }
    } catch (error) {
      console.error("❌ Error cargando datos de rotación:", error);
      this.rotationData = null;
    }
  }

  /**
   * Obtiene los paths de datos ajustados según si se usa Data o Data_temp
   * @param {Array} dataPaths - Array de paths de Data
   * @returns {Array} Paths ajustados (Data o Data_temp)
   */
  getAdjustedDataPaths(dataPaths) {
    if (!this.useDataTemp) {
      console.log("📂 Usando paths de Data (sin ajustar)");
      return dataPaths;
    }
    
    console.log("📂 Ajustando paths para Data_temp...");
    console.log("📂 Paths originales:", dataPaths);
    
    // Data_temp está DENTRO de Data, así que agregamos Data_temp al final del path de Data
    // Ejemplo: \\ant\...\IB_Scope\Data\ -> \\ant\...\IB_Scope\Data\Data_temp\
    const adjustedPaths = dataPaths.map(path => {
      let newPath = path;
      
      // Asegurar que el path termina con separador
      if (!path.endsWith('\\') && !path.endsWith('/')) {
        // Determinar qué separador usar
        if (path.includes('\\')) {
          newPath = path + '\\';
        } else {
          newPath = path + '/';
        }
      }
      
      // Agregar Data_temp al final
      if (newPath.endsWith('\\')) {
        newPath = newPath + 'Data_temp\\';
      } else {
        newPath = newPath + 'Data_temp/';
      }
      
      console.log(`📂 Path: ${path} -> ${newPath}`);
      return newPath;
    });
    
    console.log("📂 Paths ajustados:", adjustedPaths);
    return adjustedPaths;
  }

  async loadData() {
    console.log("📊 Cargando datos principales desde data_paths...");
    console.log(`📅 Usando ${this.useDataTemp ? 'Data_temp' : 'Data'} para fecha: ${this.currentDate}`);

    try {
      // Obtener configuración
      const config = await window.api.getConfig();
      if (!config || !config.data_paths) {
        throw new Error("No se encontró configuración de data_paths");
      }

      // Obtener paths ajustados según la fecha seleccionada
      const adjustedPaths = this.getAdjustedDataPaths(config.data_paths);
      console.log("📂 Paths ajustados:", adjustedPaths);

      // Construir nombres de archivos con fecha dinámica (DEBE corresponder a la fecha seleccionada)
      const stowFileName = this.getFileNameWithDate("Stow_Data");
      const effortFileName = this.getFileNameWithDate("Categorias_Esfuerzo");

      console.log("📂 Archivos a cargar para fecha:", this.currentDate);
      console.log("📂 Archivos:", { stowFileName, effortFileName });

      // Guardar la fecha esperada para validación
      const expectedDate = this.currentDate;

      // Intentar cargar desde data_paths
      let stowData = null;
      let effortData = null;
      let stowFound = false;
      let effortFound = false;

      for (const dataPath of adjustedPaths) {
        try {
          if (!stowData) {
            const stowPath = `${dataPath}${stowFileName}`;
            console.log("📂 Intentando cargar Stow desde:", stowPath);
            const stowResult = await window.api.readJson(stowPath);
            if (stowResult.success && stowResult.data) {
              // Verificar que el archivo corresponde a la fecha esperada
              // El nombre del archivo ya incluye la fecha, así que si se carga correctamente, es la fecha correcta
              stowData = stowResult.data;
              stowFound = true;
              console.log("✅ Stow cargado desde:", stowPath, "para fecha:", expectedDate);
            } else {
              console.log("⚠️ No se encontró Stow en:", stowPath);
            }
          }

          if (!effortData) {
            const effortPath = `${dataPath}${effortFileName}`;
            console.log("📂 Intentando cargar Esfuerzo desde:", effortPath);
            const effortResult = await window.api.readJson(effortPath);
            if (effortResult.success && effortResult.data) {
              effortData = effortResult.data;
              effortFound = true;
              console.log("✅ Esfuerzo cargado desde:", effortPath, "para fecha:", expectedDate);
            } else {
              console.log("⚠️ No se encontró Esfuerzo en:", effortPath);
            }
          }

          // Si ambos están cargados, salir del bucle
          if (stowData && effortData) break;
        } catch (error) {
          console.log(`❌ Error cargando desde ${dataPath}:`, error.message);
          continue;
        }
      }

      // SOLO asignar datos si se encontraron para la fecha seleccionada
      if (stowFound && stowData) {
        this.stowData = stowData;
        console.log("✅ Datos de Stow cargados para fecha:", expectedDate, {
          total_usuarios: Object.keys(stowData).length,
        });
      } else {
        console.warn(`⚠️ No se encontraron datos de Stow para la fecha seleccionada: ${expectedDate}`);
        // Limpiar datos anteriores - IMPORTANTE: no mostrar datos de otra fecha
        this.stowData = null;
      }

      if (effortFound && effortData) {
        this.effortData = effortData;
        this.effortSummaryData = effortData.resumen_categorias || [];
        console.log("✅ Datos de Esfuerzo cargados para fecha:", expectedDate, {
          total_usuarios: Object.keys(effortData.analisis_por_empleado || {})
            .length,
          categorias: this.effortSummaryData.length,
        });
      } else {
        console.warn(`⚠️ No se encontraron datos de Esfuerzo para la fecha seleccionada: ${expectedDate}`);
        // Limpiar datos anteriores - IMPORTANTE: no mostrar datos de otra fecha
        this.effortData = null;
        this.effortSummaryData = [];
      }

      // Actualizar métricas básicas
      this.updateMetrics();
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
    }
  }

  /**
   * Actualiza las métricas generales
   */
  updateMetrics() {
    if (!this.stowData) return;

    const totalUsersEl = document.getElementById("total-users");
    const totalStowsEl = document.getElementById("total-stows");
    const avgRateEl = document.getElementById("avg-rate");

    // Calcular métricas desde stow_each_rates
    const eachRates = this.stowData.stow_each_rates || [];
    const uniqueUsers = new Set(eachRates.map((r) => r.login)).size;
    const totalUnits = eachRates.reduce((sum, r) => sum + (r.units || 0), 0);
    const avgUph =
      eachRates.length > 0
        ? eachRates.reduce((sum, r) => sum + (r.uph || 0), 0) / eachRates.length
        : 0;

    if (totalUsersEl) totalUsersEl.textContent = uniqueUsers;
    if (totalStowsEl) totalStowsEl.textContent = totalUnits.toLocaleString();
    if (avgRateEl) avgRateEl.textContent = Math.round(avgUph);
  }

  /**
   * Cambia la categoría activa
   */
  changeCategory(category) {
    console.log(`🔄 Cambiando a categoría: ${category}`);
    this.currentCategory = category;

    // Actualizar botones activos
    document.querySelectorAll(".category-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.category === category) {
        btn.classList.add("active");
      }
    });

    // Cambiar el botón de ordenamiento activo según la categoría
    let defaultSortColumn = "combined-hours";
    if (category === "effort") {
      defaultSortColumn = "rate-ajustado";
    } else if (category === "all-receive") {
      defaultSortColumn = "combined-hours";
    }

    // Actualizar botones de ordenamiento
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.sort === defaultSortColumn) {
        btn.classList.add("active");
      }
    });

    this.currentSortColumn = defaultSortColumn;

    // Actualizar tabla
    this.updateTable();
  }

  /**
   * Cambia el filtro de rotación (Early/Late)
   */
  /**
   * Cambia el filtro de fecha y recarga los datos
   * @param {string} dateFilter - "today", "yesterday", "before-yesterday"
   */
  async changeDateFilter(dateFilter) {
    console.log(`📅 Cambiando filtro de fecha: ${dateFilter}`);
    this.currentDateFilter = dateFilter;

    // Actualizar el select (por si se llama programáticamente)
    const dateSelect = document.getElementById("date-filter-select");
    if (dateSelect && dateSelect.value !== dateFilter) {
      dateSelect.value = dateFilter;
    }

    // Determinar qué fecha usar
    let dateKey;
    switch (dateFilter) {
      case "today":
        dateKey = "today";
        break;
      case "yesterday":
        dateKey = "yesterday";
        break;
      case "before-yesterday":
        dateKey = "beforeYesterday";
        break;
      default:
        dateKey = "today";
    }

    // Actualizar la fecha actual para la carga de datos
    this.currentDate = this.dateInfo[dateKey].dateString;
    this.useDataTemp = this.dateInfo[dateKey].useDataTemp;

    console.log(`📅 Cargando datos para fecha: ${this.currentDate}, useDataTemp: ${this.useDataTemp}`);

    // Mostrar loader
    this.showTableLoader();

    // Limpiar datos anteriores para evitar confusión
    this.stowData = null;
    this.effortData = null;
    this.employee30minData = null;
    this.rotationData = null;
    this.effortSummaryData = [];

    // Limpiar tabla mientras carga
    const tbody = document.getElementById("table-body");
    const thead = document.getElementById("table-header");
    if (tbody) tbody.innerHTML = "";
    if (thead) thead.innerHTML = "";

    try {
      // Recargar datos según el rate actual
      if (this.currentRate === "receive") {
        await this.loadReceiveData();
      } else {
        await this.loadData();
        await this.loadEmployee30minData();
        await this.loadRotationData();
        await this.loadEffortData();
      }

      // Actualizar tabla
      this.updateTable();
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      // Mostrar mensaje de error en la tabla
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; padding: 2rem; color: #dc2626;">
              Error al cargar los datos. Por favor, intenta nuevamente.
            </td>
          </tr>
        `;
      }
    } finally {
      // Ocultar loader
      this.hideTableLoader();
    }
  }

  /**
   * Cambia el filtro de Rate (Stow/Receive)
   * @param {string} rate - "stow" o "receive"
   */
  async changeRateFilter(rate) {
    console.log(`🔄 Cambiando filtro de Rate: ${rate}`);
    this.currentRate = rate;

    // Actualizar el select (por si se llama programáticamente)
    const rateSelect = document.getElementById("rate-filter-select");
    if (rateSelect && rateSelect.value !== rate) {
      rateSelect.value = rate;
    }

    // Actualizar botones de categoría según el rate
    this.updateCategoryButtons();

    // Actualizar botones de ordenamiento según el rate
    this.updateSortButtons();

    // Resetear categoría a la primera disponible según el rate
    if (rate === "receive") {
      this.currentCategory = "all-receive";
    } else {
      this.currentCategory = "each";
    }

    // Mostrar loader
    this.showTableLoader();

    // Limpiar tabla mientras carga
    const tbody = document.getElementById("table-body");
    const thead = document.getElementById("table-header");
    if (tbody) tbody.innerHTML = "";
    if (thead) thead.innerHTML = "";

    try {
      if (rate === "receive") {
        // Cargar datos de Receive
        await this.loadReceiveData();
      } else {
        // Cargar datos de Stow
        await this.loadData();
        await this.loadEmployee30minData();
        await this.loadRotationData();
        await this.loadEffortData();
      }

      // Actualizar tabla
      this.updateTable();
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      // Mostrar mensaje de error en la tabla
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; padding: 2rem; color: #dc2626;">
              Error al cargar los datos. Por favor, intenta nuevamente.
            </td>
          </tr>
        `;
      }
    } finally {
      // Ocultar loader
      this.hideTableLoader();
    }
  }

  /**
   * Actualiza los botones de categoría según el rate actual
   */
  updateCategoryButtons() {
    const categorySelector = document.querySelector(".category-selector");
    if (!categorySelector) return;

    // Limpiar botones existentes
    categorySelector.innerHTML = "";

    if (this.currentRate === "receive") {
      // Botones para Receive
      const receiveCategories = [
        { id: "all-receive", label: "All Receive", icon: "icon-box-units-combined" },
        { id: "decant-tsi", label: "Decant (TSI)", icon: "icon-box-units" },
        { id: "decant-pid", label: "Decant (PID)", icon: "icon-box-units" },
        { id: "non-con", label: "Non-Con", icon: "icon-box-units" },
        { id: "preditor", label: "PrEditor", icon: "icon-box-units" },
        { id: "prep", label: "Prep", icon: "icon-box-units" },
        { id: "pallet-receive", label: "Pallet Receive", icon: "icon-truck-pallet" },
      ];

      receiveCategories.forEach((cat, index) => {
        const btn = document.createElement("button");
        btn.className = `category-btn ${index === 0 ? "active" : ""}`;
        btn.dataset.category = cat.id;
        btn.innerHTML = `
          <span id="${cat.icon}" class="icon-svg icon-16"></span>
          ${cat.label}
        `;
        btn.addEventListener("click", (e) => {
          this.changeCategory(cat.id);
        });
        categorySelector.appendChild(btn);
      });
    } else {
      // Botones para Stow (restaurar originales)
      const stowCategories = [
        { id: "each", label: "Each Stow", icon: "icon-box-each-stow" },
        { id: "each-e", label: "Each E", icon: "icon-box-each-e" },
        { id: "each-w", label: "Each W", icon: "icon-box-each-w" },
        { id: "pallet", label: "Pallet", icon: "icon-truck-pallet" },
        { id: "pallet-e", label: "Pallet E", icon: "icon-truck-pallet-e" },
        { id: "pallet-w", label: "Pallet W", icon: "icon-truck-pallet-w" },
        { id: "effort", label: "Esfuerzo", icon: "icon-lightning-effort" },
      ];

      stowCategories.forEach((cat, index) => {
        const btn = document.createElement("button");
        btn.className = `category-btn ${index === 0 ? "active" : ""}`;
        btn.dataset.category = cat.id;
        btn.innerHTML = `
          <span id="${cat.icon}" class="icon-svg icon-16"></span>
          ${cat.label}
        `;
        btn.addEventListener("click", (e) => {
          this.changeCategory(cat.id);
        });
        categorySelector.appendChild(btn);
      });
    }

    // Cargar iconos SVG
    this.loadActivityScopeIcons();
  }

  /**
   * Actualiza los botones de ordenamiento según el rate actual (Stow o Receive)
   */
  updateSortButtons() {
    const sortControls = document.querySelector(".sort-controls");
    if (!sortControls) return;

    // Limpiar botones existentes excepto el label
    sortControls.innerHTML = '<span class="sort-label">Ordenar por:</span>';

    if (this.currentRate === "receive") {
      // Botones para Receive
      const receiveSortOptions = [
        { id: "combined-hours", label: "Horas Combined", icon: "icon-clock-hours" },
        { id: "combined-units", label: "Units Combined", icon: "icon-box-units-combined" },
        { id: "performance-index", label: "Performance Index", icon: "icon-target-rate" },
      ];

      receiveSortOptions.forEach((opt, index) => {
        const btn = document.createElement("button");
        btn.className = `sort-btn ${index === 0 ? "active" : ""}`;
        btn.dataset.sort = opt.id;
        btn.innerHTML = `
          <span id="${opt.icon}" class="icon-svg icon-16"></span>
          ${opt.label}
        `;
        btn.addEventListener("click", () => {
          document.querySelectorAll(".sort-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.currentSortColumn = opt.id;
          this.updateTable();
        });
        sortControls.appendChild(btn);
      });

      // Establecer ordenamiento por defecto para Receive
      if (!["combined-hours", "combined-units", "performance-index"].includes(this.currentSortColumn)) {
        this.currentSortColumn = "combined-hours";
      }
    } else {
      // Botones para Stow (restaurar originales)
      const stowSortOptions = [
        { id: "combined-hours", label: "Horas Combined", icon: "icon-clock-hours" },
        { id: "combined-units", label: "Units Combined", icon: "icon-box-units-combined" },
        { id: "combined-uph", label: "UPH Combined", icon: "icon-chart-uph" },
        { id: "rate-ajustado", label: "Rate Ajustado", icon: "icon-target-rate" },
      ];

      stowSortOptions.forEach((opt, index) => {
        const btn = document.createElement("button");
        btn.className = `sort-btn ${index === 0 ? "active" : ""}`;
        btn.dataset.sort = opt.id;
        btn.innerHTML = `
          <span id="${opt.icon}" class="icon-svg icon-16"></span>
          ${opt.label}
        `;
        btn.addEventListener("click", () => {
          document.querySelectorAll(".sort-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.currentSortColumn = opt.id;
          this.updateTable();
        });
        sortControls.appendChild(btn);
      });

      // Establecer ordenamiento por defecto para Stow
      if (!["combined-hours", "combined-units", "combined-uph", "rate-ajustado"].includes(this.currentSortColumn)) {
        this.currentSortColumn = "combined-hours";
      }
    }

    // Agregar botón de dirección
    const newDirectionBtn = document.createElement("button");
    newDirectionBtn.className = "sort-direction-btn";
    newDirectionBtn.id = "sort-direction-btn";
    newDirectionBtn.title = "Cambiar dirección";
    newDirectionBtn.innerHTML = `<span id="${this.sortDirection === "desc" ? "icon-arrow-down" : "icon-arrow-up"}" class="icon-svg icon-16"></span>`;
    newDirectionBtn.addEventListener("click", () => {
      this.sortDirection = this.sortDirection === "desc" ? "asc" : "desc";
      const icon = newDirectionBtn.querySelector(".icon-svg");
      if (icon) {
        icon.id = this.sortDirection === "desc" ? "icon-arrow-down" : "icon-arrow-up";
      }
      this.loadActivityScopeIcons();
      this.updateTable();
    });
    sortControls.appendChild(newDirectionBtn);

    // Cargar iconos SVG
    this.loadActivityScopeIcons();

    // Marcar el botón activo correcto
    const activeBtn = sortControls.querySelector(`[data-sort="${this.currentSortColumn}"]`);
    if (activeBtn) {
      document.querySelectorAll(".sort-btn").forEach((b) => b.classList.remove("active"));
      activeBtn.classList.add("active");
    }
  }

  /**
   * Carga datos de Receive desde el archivo JSON
   */
  async loadReceiveData() {
    console.log("📊 Cargando datos de Receive desde data_paths...");
    console.log(`📅 Usando ${this.useDataTemp ? 'Data_temp' : 'Data'} para fecha: ${this.currentDate}`);

    try {
      // Obtener configuración
      const config = await window.api.getConfig();
      if (!config || !config.data_paths) {
        throw new Error("No se encontró configuración de data_paths");
      }

      // Obtener paths ajustados según la fecha seleccionada
      const adjustedPaths = this.getAdjustedDataPaths(config.data_paths);
      console.log("📂 Paths ajustados:", adjustedPaths);

      // Construir nombre de archivo con fecha dinámica
      const receiveFileName = this.getFileNameWithDate("Receive_Data");

      console.log("📂 Archivo a cargar para fecha:", this.currentDate);
      console.log("📂 Archivo:", receiveFileName);

      // Intentar cargar desde data_paths
      let receiveData = null;
      let receiveFound = false;

      for (const dataPath of adjustedPaths) {
        try {
          if (!receiveData) {
            const receivePath = `${dataPath}${receiveFileName}`;
            console.log("📂 Intentando cargar Receive desde:", receivePath);
            const receiveResult = await window.api.readJson(receivePath);
            if (receiveResult.success && receiveResult.data) {
              receiveData = receiveResult.data;
              receiveFound = true;
              console.log("✅ Receive cargado desde:", receivePath, "para fecha:", this.currentDate);
              break;
            } else {
              console.log("⚠️ No se encontró Receive en:", receivePath);
            }
          }
        } catch (error) {
          console.log(`❌ Error cargando desde ${dataPath}:`, error.message);
          continue;
        }
      }

      // SOLO asignar datos si se encontraron para la fecha seleccionada
      if (receiveFound && receiveData) {
        this.receiveData = receiveData;
        console.log("✅ Datos de Receive cargados:", {
          fecha: this.currentDate,
          decant_tsi: receiveData.receive_decant_tsi?.length || 0,
          decant_pid: receiveData.receive_decant_pid?.length || 0,
        });
      } else {
        console.warn("⚠️ No se encontraron datos de Receive para la fecha:", this.currentDate);
        this.receiveData = null;
      }
    } catch (error) {
      console.error("❌ Error cargando datos de Receive:", error);
      this.receiveData = null;
    }
  }

  /**
   * Muestra el loader de la tabla
   */
  showTableLoader() {
    const loader = document.getElementById("table-loading-overlay");
    if (loader) {
      loader.style.display = "flex";
    }
  }

  /**
   * Oculta el loader de la tabla
   */
  hideTableLoader() {
    const loader = document.getElementById("table-loading-overlay");
    if (loader) {
      loader.style.display = "none";
    }
  }

  changeRotationFilter(filter) {
    console.log(`🔄 Cambiando filtro de rotación: ${filter}`);
    this.currentRotationFilter = filter;

    // Actualizar botones activos
    document.querySelectorAll(".rotation-filter-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.filter === filter) {
        btn.classList.add("active");
      }
    });

    // Actualizar tabla
    this.updateTable();

    // Si hay una vista de detalle abierta, actualizar los promedios
    if (this.currentUserLogin && this.isShowingUserDetail) {
      console.log(`🔄 Actualizando vista de detalle para ${this.currentUserLogin} con filtro ${filter}`);
      this.refreshUserDetailAverages();
    }
  }

  /**
   * Actualiza los promedios en la vista de detalle del usuario actual
   * Se llama cuando cambia el filtro de rotación
   */
  refreshUserDetailAverages() {
    if (!this.currentUserLogin || !this.effortData) return;

    // Buscar datos del usuario actual
    const userEffortData = this.effortData.analisis_por_empleado
      ? Object.values(this.effortData.analisis_por_empleado).find(
          (emp) => emp.login === this.currentUserLogin
        )
      : null;

    if (!userEffortData) {
      console.log(`⚠️ No se encontraron datos de esfuerzo para ${this.currentUserLogin}`);
      return;
    }

    console.log(`📊 Recalculando promedios con filtro: ${this.currentRotationFilter}`);

    // Actualizar métricas principales con nuevos promedios
    this.updateEffortMetrics(userEffortData);

    // Actualizar categorías
    this.updateEffortCategories(userEffortData);

    // Actualizar tipos de bin
    this.updateEffortBinTypes(userEffortData);

    // Actualizar estantes
    this.updateEffortShelves(userEffortData);

    console.log(`✅ Vista de detalle actualizada con filtro ${this.currentRotationFilter}`);
  }

  /**
   * Cambia la columna de ordenamiento
   */
  changeSortColumn(sortColumn) {
    console.log(`🔄 Cambiando columna de ordenamiento: ${sortColumn}`);
    this.currentSortColumn = sortColumn;

    // Actualizar botones activos
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.sort === sortColumn) {
        btn.classList.add("active");
      }
    });

    // Actualizar tabla
    this.updateTable();
  }

  /**
   * Alterna la dirección de ordenamiento
   */
  toggleSortDirection() {
    this.sortDirection = this.sortDirection === "desc" ? "asc" : "desc";
    console.log(
      `🔄 Cambiando dirección de ordenamiento: ${this.sortDirection}`
    );

    // Actualizar icono del botón - cambiar entre ArrowDown y ArrowUp
    const arrowIcon = document.getElementById("icon-arrow-down") || document.getElementById("icon-arrow-up");
    if (arrowIcon) {
      const newIconId = this.sortDirection === "desc" ? "icon-arrow-down" : "icon-arrow-up";
      const newIconPath = this.sortDirection === "desc" 
        ? "assets/svg/ActivityScope/ArrowDown.svg" 
        : "assets/svg/ActivityScope/ArrowUp.svg";
      
      arrowIcon.id = newIconId;
      
      // Recargar el SVG del icono
      this.loadSingleIcon(arrowIcon, newIconPath);
    }

    // Actualizar tabla
    this.updateTable();
  }
  
  /**
   * Carga un solo icono SVG
   */
  async loadSingleIcon(iconElement, svgPath) {
    try {
      const result = await window.api.readFile(svgPath);
      if (result.success && result.content) {
        iconElement.innerHTML = result.content;
        
        const svgElement = iconElement.querySelector('svg');
        if (svgElement) {
          if (!svgElement.getAttribute('viewBox') && svgElement.getAttribute('width') && svgElement.getAttribute('height')) {
            const width = svgElement.getAttribute('width');
            const height = svgElement.getAttribute('height');
            svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
          }
          svgElement.removeAttribute('width');
          svgElement.removeAttribute('height');
          
          // Preservar colores
          const allGraphicElements = svgElement.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line, g');
          allGraphicElements.forEach(element => {
            const fillAttr = element.getAttribute('fill');
            if (fillAttr && 
                fillAttr !== 'none' && 
                fillAttr !== 'currentColor' && 
                fillAttr !== 'inherit' && 
                !fillAttr.startsWith('url')) {
              element.style.setProperty('fill', fillAttr, 'important');
            }
          });
        }
      }
    } catch (error) {
      console.error(`Error cargando icono ${svgPath}:`, error);
    }
  }

  /**
   * Obtiene la rotación de un usuario (Early/Late)
   */
  getUserRotation(userId) {
    console.log(
      `🔍 Buscando rotación para ${userId}, rotationData:`,
      this.rotationData ? "Cargado" : "No cargado"
    );

    // Debug: mostrar contenido de rotationData
    if (this.rotationData) {
      console.log("🔍 Contenido de rotationData:", this.rotationData);
      console.log(
        "🔍 user_rotations existe?",
        !!this.rotationData.user_rotations
      );
      if (this.rotationData.user_rotations) {
        console.log(
          "🔍 Total user_rotations:",
          this.rotationData.user_rotations.length
        );
        console.log(
          "🔍 Primeros 3 user_rotations:",
          this.rotationData.user_rotations.slice(0, 3)
        );
      }
    }

    if (!this.rotationData || !this.rotationData.user_rotations) {
      console.log(`⚠️ No hay datos de rotación disponibles para ${userId}`);
      return null;
    }

    const userRotation = this.rotationData.user_rotations.find(
      (user) => user.user_id === userId
    );

    if (userRotation) {
      console.log(
        `✅ Rotación encontrada para ${userId}: ${userRotation.rotacion_turno}`
      );
      return userRotation.rotacion_turno;
    } else {
      console.log(`❌ No se encontró rotación para ${userId}`);
      return null;
    }
  }

  /**
   * Filtra usuarios por rotación
   */
  filterUsersByRotation(users) {
    if (this.currentRotationFilter === "all") {
      return users;
    }

    console.log(
      `🔍 Aplicando filtro de rotación: ${this.currentRotationFilter}`
    );
    console.log(`🔍 Total usuarios antes del filtro: ${users.length}`);

    const filteredUsers = users.filter((user) => {
      const rotation = this.getUserRotation(user.login);
      console.log(
        `🔍 Usuario: ${user.login}, Rotación: ${rotation}, Filtro: ${this.currentRotationFilter}`
      );
      // Comparar sin importar mayúsculas/minúsculas
      return (
        rotation &&
        rotation.toLowerCase() === this.currentRotationFilter.toLowerCase()
      );
    });

    console.log(`🔍 Usuarios después del filtro: ${filteredUsers.length}`);
    return filteredUsers;
  }

  /**
   * Ordena usuarios según la columna seleccionada
   */
  sortUsers(users) {
    return users.sort((a, b) => {
      let valueA, valueB;

      switch (this.currentSortColumn) {
        case "combined-uph":
          valueA = a.combinedUph || 0;
          valueB = b.combinedUph || 0;
          break;
        case "combined-hours":
          valueA = a.combinedHours || 0;
          valueB = b.combinedHours || 0;
          break;
        case "combined-units":
          valueA = a.combinedUnits || 0;
          valueB = b.combinedUnits || 0;
          break;
        case "rate-ajustado":
          valueA = a.rate_ajustado || 0;
          valueB = b.rate_ajustado || 0;
          break;
        case "performance-index":
          valueA = a.performanceIndex || 0;
          valueB = b.performanceIndex || 0;
          break;
        default:
          // Para datos de esfuerzo, usar rate_ajustado por defecto
          if (a.rate_ajustado !== undefined) {
            valueA = a.rate_ajustado || 0;
            valueB = b.rate_ajustado || 0;
          } else {
            valueA = a.combinedUph || 0;
            valueB = b.combinedUph || 0;
          }
      }

      if (this.sortDirection === "desc") {
        return valueB - valueA;
      } else {
        return valueA - valueB;
      }
    });
  }

  /**
   * Actualiza la tabla según la categoría actual
   */
  updateTable() {
    console.log("🔄 Actualizando tabla, categoría:", this.currentCategory);

    const thead = document.getElementById("table-header");
    const tbody = document.getElementById("table-body");

    console.log("📋 Elementos encontrados:", {
      thead: !!thead,
      tbody: !!tbody,
    });

    if (!thead || !tbody) {
      console.error("❌ No se encontraron elementos de tabla");
      return;
    }

    // Limpiar tabla
    thead.innerHTML = "";
    tbody.innerHTML = "";

    // Remover clase CSS específica de esfuerzo si existe
    const table = tbody.closest("table");
    if (table) {
      table.classList.remove("effort-table");
    }

    // Limpiar popups anteriores
    if (this.userImageService) {
      this.userImageService.cleanup();
    }

    console.log("📊 Datos disponibles:", {
      stowData: !!this.stowData,
      effortData: !!this.effortData,
      category: this.currentCategory,
    });

    switch (this.currentCategory) {
      case "each":
        this.renderEachStowTable(thead, tbody, "");
        break;
      case "each-e":
        this.renderEachStowTable(thead, tbody, "E");
        break;
      case "each-w":
        this.renderEachStowTable(thead, tbody, "W");
        break;
      case "pallet":
        this.renderPalletStowTable(thead, tbody, "");
        break;
      case "pallet-e":
        this.renderPalletStowTable(thead, tbody, "E");
        break;
      case "pallet-w":
        this.renderPalletStowTable(thead, tbody, "W");
        break;
      case "effort":
        this.renderEffortTable(thead, tbody);
        break;
      case "all-receive":
        this.renderAllReceiveTable(thead, tbody);
        break;
      case "decant-tsi":
        this.renderDecantTSITable(thead, tbody);
        break;
      case "decant-pid":
        this.renderDecantPIDTable(thead, tbody);
        break;
      case "non-con":
        this.renderNonConTable(thead, tbody);
        break;
      case "preditor":
        this.renderPrEditorTable(thead, tbody);
        break;
      case "prep":
        this.renderPrepTable(thead, tbody);
        break;
      case "pallet-receive":
        this.renderPalletReceiveTable(thead, tbody);
        break;
      default:
        console.warn("⚠️ Categoría desconocida:", this.currentCategory);
    }

    console.log("✅ Tabla actualizada");

    // Reconfigurar popups de imagen después de actualizar la tabla
    this.setupUserImagePopups();
  }

  /**
   * Renderiza tabla de Each Stow
   */
  renderEachStowTable(thead, tbody, suffix) {
    console.log("📦 Renderizando tabla Each Stow, suffix:", suffix);

    if (!this.stowData || !this.stowData.stow_each_rates) {
      console.error("❌ No hay datos de stow_each_rates disponibles");
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      // Limpiar header también
      if (thead) thead.innerHTML = "";
      return;
    }

    console.log(
      "✅ Datos encontrados:",
      this.stowData.stow_each_rates.length,
      "registros"
    );

    // Crear header con columnas separadas
    thead.innerHTML = `
      <tr>
        <th rowspan="2" class="header-login">Login</th>
        <th colspan="3" class="header-group header-stp">Stow to Prime (STP)</th>
        <th colspan="3" class="header-group header-tsi">Transfer In (TSI)</th>
        <th colspan="3" class="header-group header-combined">Combined</th>
      </tr>
      <tr>
        <th class="sub-header header-stp">Horas</th>
        <th class="sub-header header-stp">Units</th>
        <th class="sub-header header-stp">UPH</th>
        <th class="sub-header header-tsi">Horas</th>
        <th class="sub-header header-tsi">Units</th>
        <th class="sub-header header-tsi">UPH</th>
        <th class="sub-header header-combined">Horas</th>
        <th class="sub-header header-combined">Units</th>
        <th class="sub-header header-combined">UPH</th>
      </tr>
    `;

    // Filtrar datos por sufijo
    const processes = {
      prime: suffix ? `Each Stow to Prime ${suffix}` : "Each Stow to Prime",
      transfer: suffix ? `Each Transfer In ${suffix}` : "Each Transfer In",
      combined: suffix ? `Each Stow Combined ${suffix}` : "Each Stow Combined",
    };

    // Agrupar por usuario - SOLO incluir usuarios que tienen datos para esta categoría
    const userMap = new Map();

    this.stowData.stow_each_rates.forEach((rate) => {
      if (!rate.login) return;

      // FILTRO IMPORTANTE: Solo procesar si el proceso coincide con el sufijo
      const isMatchingProcess =
        rate.process === processes.prime ||
        rate.process === processes.transfer ||
        rate.process === processes.combined;

      if (!isMatchingProcess) return;

      if (!userMap.has(rate.login)) {
        userMap.set(rate.login, {
          login: rate.login,
          prime: { hours: 0, units: 0, uph: 0 },
          transfer: { hours: 0, units: 0, uph: 0 },
          combined: { hours: 0, units: 0, uph: 0 },
          // Agregar datos de esfuerzo si están disponibles
          rate_ajustado: 0,
          uph_original: 0,
        });
      }

      const user = userMap.get(rate.login);

      if (rate.process === processes.prime) {
        user.prime = {
          hours: rate.hours || 0,
          units: rate.units || 0,
          uph: rate.uph || 0,
        };
      } else if (rate.process === processes.transfer) {
        user.transfer = {
          hours: rate.hours || 0,
          units: rate.units || 0,
          uph: rate.uph || 0,
        };
      } else if (rate.process === processes.combined) {
        user.combined = {
          hours: rate.hours || 0,
          units: rate.units || 0,
          uph: rate.uph || 0,
        };
      }
    });

    // Filtrar usuarios que tienen datos reales (no todo en 0)
    const usersWithData = Array.from(userMap.values()).filter((user) => {
      const totalHours = user.prime.hours + user.transfer.hours;
      const totalUnits = user.prime.units + user.transfer.units;
      return totalHours > 0 || totalUnits > 0;
    });

    // Agregar propiedades para ordenamiento
    usersWithData.forEach((user) => {
      user.combinedUph = user.combined.uph;
      user.combinedHours = user.combined.hours;
      user.combinedUnits = user.combined.units;

      // Agregar datos de esfuerzo si están disponibles
      if (this.effortData && this.effortData.analisis_por_empleado) {
        const effortUser = Object.values(
          this.effortData.analisis_por_empleado
        ).find((emp) => emp.login === user.login);
        if (effortUser) {
          user.rate_ajustado = effortUser.rate_ajustado || 0;
          user.uph_original = effortUser.uph_original || 0;
        }
      }
    });

    // Aplicar filtro de rotación
    const filteredUsers = this.filterUsersByRotation(usersWithData);

    // Aplicar ordenamiento
    const sortedUsers = this.sortUsers(filteredUsers);

    console.log(
      `✅ Usuarios con datos para categoría '${suffix || "normal"}': ${
        sortedUsers.length
      } (filtro: ${this.currentRotationFilter}, orden: ${
        this.currentSortColumn
      } ${this.sortDirection})`
    );

    // Renderizar filas con columnas separadas
    sortedUsers.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-stp">${user.prime.hours.toFixed(2)}</td>
        <td class="cell-stp">${user.prime.units}</td>
        <td class="cell-stp"><strong>${user.prime.uph.toFixed(0)}</strong></td>
        <td class="cell-tsi">${user.transfer.hours.toFixed(2)}</td>
        <td class="cell-tsi">${user.transfer.units}</td>
        <td class="cell-tsi"><strong>${user.transfer.uph.toFixed(
          0
        )}</strong></td>
        <td class="cell-combined">${user.combined.hours.toFixed(2)}</td>
        <td class="cell-combined">${user.combined.units}</td>
        <td class="cell-combined highlight-uph"><strong>${
          this.currentSortColumn === "rate-ajustado" && !suffix
            ? this.generateRateChangeSVG(
                user.rate_ajustado || user.combined.uph,
                user.uph_original || user.combined.uph
              )
            : user.combined.uph.toFixed(0)
        }</strong></td>
      `;
      tbody.appendChild(row);
    });

    // Añadir mensaje si no hay datos
    if (usersWithData.length === 0) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles para esta categoría
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla de Pallet Stow
   */
  renderPalletStowTable(thead, tbody, suffix) {
    if (!this.stowData || !this.stowData.stow_pallet_rates) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      if (thead) thead.innerHTML = "";
      return;
    }

    // Crear header con columnas separadas
    thead.innerHTML = `
      <tr>
        <th rowspan="2" class="header-login">Login</th>
        <th colspan="3" class="header-group header-stp">Stow to Prime (STP)</th>
        <th colspan="3" class="header-group header-tsi">Transfer In (TSI)</th>
        <th colspan="3" class="header-group header-combined">Combined</th>
      </tr>
      <tr>
        <th class="sub-header header-stp">Horas</th>
        <th class="sub-header header-stp">Pallets</th>
        <th class="sub-header header-stp">PPH</th>
        <th class="sub-header header-tsi">Horas</th>
        <th class="sub-header header-tsi">Pallets</th>
        <th class="sub-header header-tsi">PPH</th>
        <th class="sub-header header-combined">Horas</th>
        <th class="sub-header header-combined">Pallets</th>
        <th class="sub-header header-combined">PPH</th>
      </tr>
    `;

    // Filtrar datos por sufijo
    const processes = {
      prime: suffix ? `Pallet Stow to Prime ${suffix}` : "Pallet Stow to Prime",
      transfer: suffix ? `Pallet Transfer In ${suffix}` : "Pallet Transfer In",
      combined: suffix
        ? `Pallet Stow Combined ${suffix}`
        : "Pallet Stow Combined",
    };

    // Agrupar por usuario - SOLO incluir usuarios que tienen datos para esta categoría
    const userMap = new Map();

    this.stowData.stow_pallet_rates.forEach((rate) => {
      if (!rate.login) return;

      // FILTRO IMPORTANTE: Solo procesar si el proceso coincide con el sufijo
      const isMatchingProcess =
        rate.process === processes.prime ||
        rate.process === processes.transfer ||
        rate.process === processes.combined;

      if (!isMatchingProcess) return;

      if (!userMap.has(rate.login)) {
        userMap.set(rate.login, {
          login: rate.login,
          prime: { hours: 0, pallets: 0, pph: 0 },
          transfer: { hours: 0, pallets: 0, pph: 0 },
          combined: { hours: 0, pallets: 0, pph: 0 },
          // Agregar datos de esfuerzo si están disponibles
          rate_ajustado: 0,
          uph_original: 0,
        });
      }

      const user = userMap.get(rate.login);

      if (rate.process === processes.prime) {
        user.prime = {
          hours: rate.hours || 0,
          pallets: rate.pallet_units || 0,
          pph: rate.pallet_uph || 0,
        };
      } else if (rate.process === processes.transfer) {
        user.transfer = {
          hours: rate.hours || 0,
          pallets: rate.pallet_units || 0,
          pph: rate.pallet_uph || 0,
        };
      } else if (rate.process === processes.combined) {
        user.combined = {
          hours: rate.hours || 0,
          pallets: rate.pallet_units || 0,
          pph: rate.pallet_uph || 0,
        };
      }
    });

    // Filtrar usuarios que tienen datos reales (no todo en 0)
    const usersWithData = Array.from(userMap.values()).filter((user) => {
      const totalHours = user.prime.hours + user.transfer.hours;
      const totalPallets = user.prime.pallets + user.transfer.pallets;
      return totalHours > 0 || totalPallets > 0;
    });

    // Agregar propiedades para ordenamiento
    usersWithData.forEach((user) => {
      user.combinedUph = user.combined.pph; // Para pallets usamos PPH como UPH
      user.combinedHours = user.combined.hours;
      user.combinedUnits = user.combined.pallets; // Para pallets usamos pallets como units

      // Agregar datos de esfuerzo si están disponibles
      if (this.effortData && this.effortData.analisis_por_empleado) {
        const effortUser = Object.values(
          this.effortData.analisis_por_empleado
        ).find((emp) => emp.login === user.login);
        if (effortUser) {
          user.rate_ajustado = effortUser.rate_ajustado || 0;
          user.uph_original = effortUser.uph_original || 0;
        }
      }
    });

    // Aplicar filtro de rotación
    const filteredUsers = this.filterUsersByRotation(usersWithData);

    // Aplicar ordenamiento
    const sortedUsers = this.sortUsers(filteredUsers);

    console.log(
      `✅ Usuarios con datos para categoría Pallet '${suffix || "normal"}': ${
        sortedUsers.length
      } (filtro: ${this.currentRotationFilter}, orden: ${
        this.currentSortColumn
      } ${this.sortDirection})`
    );

    // Renderizar filas con columnas separadas
    sortedUsers.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-stp">${user.prime.hours.toFixed(2)}</td>
        <td class="cell-stp">${user.prime.pallets}</td>
        <td class="cell-stp"><strong>${user.prime.pph.toFixed(0)}</strong></td>
        <td class="cell-tsi">${user.transfer.hours.toFixed(2)}</td>
        <td class="cell-tsi">${user.transfer.pallets}</td>
        <td class="cell-tsi"><strong>${user.transfer.pph.toFixed(
          0
        )}</strong></td>
        <td class="cell-combined">${user.combined.hours.toFixed(2)}</td>
        <td class="cell-combined">${user.combined.pallets}</td>
        <td class="cell-combined highlight-uph"><strong>${user.combined.pph.toFixed(
          0
        )}</strong></td>
      `;
      tbody.appendChild(row);
    });

    // Añadir mensaje si no hay datos
    if (usersWithData.length === 0) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles para esta categoría
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla de Esfuerzo
   */
  renderEffortTable(thead, tbody) {
    console.log("⚡ Renderizando tabla de Esfuerzo");

    // Configurar headers con la misma estructura que las otras tablas
    thead.innerHTML = `
      <tr>
        <th rowspan="2" class="header-login">Login</th>
        <th colspan="5" class="header-group header-effort">Análisis de Esfuerzo</th>
      </tr>
      <tr>
        <th class="sub-header header-effort">Horas</th>
        <th class="sub-header header-effort">Units Totales</th>
        <th class="sub-header header-effort">UPH Original</th>
        <th class="sub-header header-effort">Factor Ajuste</th>
        <th class="sub-header header-effort">Rate Ajustado</th>
      </tr>
    `;

    if (!this.effortData || !this.effortData.analisis_por_empleado) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos de esfuerzo disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      if (thead) thead.innerHTML = "";
      return;
    }

    // Obtener datos de empleados
    const employees = Object.values(this.effortData.analisis_por_empleado);

    if (employees.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="no-data">No hay empleados con datos de esfuerzo</td>
        </tr>
      `;
      return;
    }

    // Filtrar usuarios con datos válidos
    const usersWithData = employees.filter(
      (user) => user.hours > 0 || user.units_totales > 0
    );

    // Aplicar filtros de rotación y ordenamiento
    const filteredUsers = this.filterUsersByRotation(usersWithData);
    const sortedUsers = this.sortUsers(filteredUsers);

    console.log(
      `✅ Usuarios con datos de esfuerzo: ${sortedUsers.length} (filtro: ${this.currentRotationFilter}, orden: ${this.currentSortColumn} ${this.sortDirection})`
    );

    // Limpiar tbody
    tbody.innerHTML = "";

    // Agregar clase CSS específica para esfuerzo
    const table = tbody.closest("table");
    if (table) {
      table.classList.add("effort-table");
    }

    // Renderizar filas
    sortedUsers.forEach((user, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-effort">${user.hours.toFixed(2)}h</td>
        <td class="cell-effort">${user.units_totales}</td>
        <td class="cell-effort"><strong>${user.uph_original.toFixed(
          2
        )}</strong></td>
        <td class="cell-effort">${user.factor_ajuste.toFixed(2)}</td>
        <td class="cell-effort highlight-uph"><strong>${user.rate_ajustado.toFixed(
          2
        )}</strong></td>
      `;
      tbody.appendChild(row);
    });

    console.log(
      `✅ Tabla de esfuerzo renderizada con ${sortedUsers.length} usuarios`
    );
  }

  /**
   * Aplica los filtros
   */
  applyFilters() {
    console.log("🔍 Aplicando filtros...");
    // Lógica de filtrado aquí
  }

  /**
   * Refresca los datos
   */
  async refreshData() {
    console.log("🔄 Refrescando datos...");
    
    // Obtener el botón de actualizar
    const refreshBtn = document.getElementById("refresh-activity-btn");
    const originalText = refreshBtn ? refreshBtn.innerHTML : "";
    
    try {
      // Deshabilitar botón y mostrar estado de carga
      if (refreshBtn) {
        refreshBtn.disabled = true;
        const iconElement = refreshBtn.querySelector('#icon-refresh-activity');
        if (iconElement) {
          // Añadir animación de rotación al icono
          iconElement.style.animation = 'spin 1s linear infinite';
        }
        // Cambiar texto del botón
        const textNodes = Array.from(refreshBtn.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        if (textNodes.length > 0) {
          textNodes[0].textContent = ' Actualizando...';
        } else {
          refreshBtn.appendChild(document.createTextNode(' Actualizando...'));
        }
      }
      
      // Mostrar notificación si está disponible
      if (window.showToast) {
        window.showToast("Actualizando datos...", "info");
      }
      
      // Recargar datos
      await this.loadData();
      this.updateTable();
      
      // Mostrar mensaje de éxito
      if (window.showToast) {
        window.showToast("Datos actualizados correctamente", "success");
      }
      
      console.log("✅ Datos actualizados correctamente");
    } catch (error) {
      console.error("❌ Error al actualizar datos:", error);
      if (window.showToast) {
        window.showToast("Error al actualizar datos", "error");
      }
    } finally {
      // Restaurar botón
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalText;
        const iconElement = refreshBtn.querySelector('#icon-refresh-activity');
        if (iconElement) {
          iconElement.style.animation = '';
        }
      }
    }
  }

  /**
   * Exporta los datos
   */
  exportData() {
    console.log("📊 Exportando datos...");
    // Lógica de exportación aquí
  }

  /**
   * Muestra la vista detallada de un usuario
   * @param {string} login - Login del usuario
   */
  async showUserDetailView(login) {
    // Evitar múltiples ejecuciones simultáneas
    if (this.isShowingUserDetail) {
      console.log(
        `⚠️ Ya se está mostrando vista detallada para ${login}, ignorando...`
      );
      return;
    }

    this.isShowingUserDetail = true;
    console.log(`👤 Mostrando vista detallada para: ${login}`);

    this.currentUserLogin = login;

    // Buscar datos del usuario en el roster
    let userData = null;
    if (this.rosterData && this.rosterData.roster) {
      userData = this.rosterData.roster.find((user) => user.login === login);
    }

    // Actualizar UI
    const userDetailView = document.getElementById("user-detail-view");
    const tableSection = document.querySelector(".user-activity-table-section");

    if (!userDetailView || !tableSection) {
      console.error("❌ No se encontraron elementos necesarios");
      return;
    }

    // Ocultar tabla
    tableSection.style.display = "none";

    // Mostrar vista detallada
    userDetailView.style.display = "block";

    // Actualizar label del botón de cierre
    const loginLabel = document.getElementById("current-user-login-label");
    if (loginLabel) {
      loginLabel.textContent = login;
    }

    // Actualizar foto (inicialmente con toggle activado)
    this.updateUserPhoto(login, true);

    // Actualizar datos del usuario
    document.getElementById("user-detail-login").textContent = login;

    if (userData) {
      document.getElementById("user-detail-name").textContent =
        userData.employee_name || "No disponible";
      document.getElementById("user-detail-shift").textContent =
        userData.shift || "No disponible";
      document.getElementById("user-detail-manager").textContent =
        userData.login_manager || "No disponible";

      console.log("✅ Datos del usuario cargados:", userData);
    } else {
      document.getElementById("user-detail-name").textContent = "No disponible";
      document.getElementById("user-detail-shift").textContent =
        "No disponible";
      document.getElementById("user-detail-manager").textContent =
        "No disponible";

      console.warn("⚠️ No se encontraron datos del usuario en el roster");
    }

    // Actualizar datos de últimos 30 minutos
    this.updateUser30minData(login);

    // Actualizar zonas disponibles para heatmap
    await this.updateAvailableZones(login);

    // Actualizar análisis de esfuerzo
    this.updateUserEffortData(login);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Mantener bandera en true mientras la vista esté abierta
    // (se resetea en closeUserDetailView)
  }

  /**
   * Cierra la vista detallada y vuelve a la tabla
   */
  closeUserDetailView() {
    console.log("❌ Cerrando vista detallada de usuario");

    const userDetailView = document.getElementById("user-detail-view");
    const tableSection = document.querySelector(".user-activity-table-section");

    if (!userDetailView || !tableSection) {
      console.error("❌ No se encontraron elementos necesarios");
      return;
    }

    // Ocultar vista detallada
    userDetailView.style.display = "none";

    // Mostrar tabla
    tableSection.style.display = "block";

    // Limpiar datos
    this.currentUserLogin = null;
    this.isShowingUserDetail = false; // Resetear bandera

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Actualiza la foto del usuario según el estado del toggle
   * @param {string} login - Login del usuario
   * @param {boolean} showPhoto - Si mostrar la foto real o placeholder
   */
  updateUserPhoto(login, showPhoto) {
    const photoContainer = document.getElementById("user-detail-photo");
    if (!photoContainer) return;

    if (showPhoto) {
      // Mostrar foto real
      const photoUrl = getUserPhotoUrl(login);
      photoContainer.innerHTML = `<img src="${photoUrl}" alt="${login}" onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem;font-weight:bold;\\'>${login
        .substring(0, 2)
        .toUpperCase()}</div>'">`;
    } else {
      // Mostrar placeholder con iniciales
      photoContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem;font-weight:bold;">${login
        .substring(0, 2)
        .toUpperCase()}</div>`;
    }
  }

  /**
   * Alterna entre mostrar/ocultar la foto del usuario
   */
  togglePhoto() {
    const toggleSwitch = document.getElementById("photo-toggle-switch");
    const toggleLabel = document.getElementById("photo-toggle-label");

    if (!toggleSwitch || !toggleLabel || !this.currentUserLogin) return;

    // Alternar estado
    const isActive = toggleSwitch.classList.contains("active");

    if (isActive) {
      // Desactivar - mostrar placeholder
      toggleSwitch.classList.remove("active");
      toggleLabel.textContent = "Ocultar foto";
      this.updateUserPhoto(this.currentUserLogin, false);
    } else {
      // Activar - mostrar foto real
      toggleSwitch.classList.add("active");
      toggleLabel.textContent = "Mostrar foto";
      this.updateUserPhoto(this.currentUserLogin, true);
    }

    console.log(`🖼️ Toggle foto: ${isActive ? "Ocultar" : "Mostrar"}`);
  }

  /**
   * Actualiza los datos de últimos 30 minutos del usuario
   * @param {string} login - Login del usuario
   */
  updateUser30minData(login) {
    console.log(`⏰ Actualizando datos de últimos 30 min para: ${login}`);

    // Buscar datos del usuario en employee30minData
    let user30minData = null;
    if (this.employee30minData && this.employee30minData.empleados) {
      user30minData = this.employee30minData.empleados[login];
    }

    if (user30minData) {
      // Actualizar período evaluado
      const periodo = user30minData.periodo_analizado;
      const periodoText = `${periodo.inicio} - ${periodo.fin}`;
      document.getElementById("periodo-evaluado").textContent = periodoText;

      // Actualizar units ubicadas
      document.getElementById(
        "units-ubicadas"
      ).textContent = `${user30minData.resumen.total_units} units`;

      // Actualizar peso promedio por unidad (destacado)
      const pesoPromedio = user30minData.resumen.avg_weight_per_unit;
      document.getElementById(
        "peso-promedio"
      ).textContent = `${pesoPromedio.toFixed(2)} kg`;

      // Actualizar lista de ASINs
      this.updateAsinsList(user30minData.asins_detallados);

      console.log("✅ Datos de últimos 30 min cargados:", {
        periodo: periodoText,
        units: user30minData.resumen.total_units,
        peso_promedio: pesoPromedio,
        asins_count: user30minData.asins_detallados.length,
      });
    } else {
      // No hay datos disponibles
      document.getElementById("periodo-evaluado").textContent = "No disponible";
      document.getElementById("units-ubicadas").textContent = "No disponible";
      document.getElementById("peso-promedio").textContent = "No disponible";

      const asinsList = document.getElementById("asins-list");
      if (asinsList) {
        asinsList.innerHTML =
          '<div class="asin-item">No hay datos disponibles</div>';
      }

      console.warn(
        "⚠️ No se encontraron datos de últimos 30 min para el usuario"
      );
    }
  }

  /**
   * Actualiza la lista de ASINs
   * @param {Array} asins - Array de ASINs detallados
   */
  updateAsinsList(asins) {
    const asinsList = document.getElementById("asins-list");
    if (!asinsList) return;

    if (!asins || asins.length === 0) {
      asinsList.innerHTML =
        '<div class="asin-item">No hay ASINs disponibles</div>';
      return;
    }

    // Mostrar máximo 8 ASINs más recientes
    const recentAsins = asins.slice(-8).reverse();

    asinsList.innerHTML = recentAsins
      .map(
        (asin) => `
      <div class="asin-item">
        <span class="asin-code">${asin.asin}</span>
        <span class="asin-weight">${asin.weight_per_unit.toFixed(2)} kg</span>
      </div>
    `
      )
      .join("");
  }

  /**
   * Configurar eventos del modal de heatmap
   */
  setupHeatmapModalEvents() {
    const modal = document.getElementById("heatmap-modal");
    const closeBtn = document.getElementById("heatmap-modal-close");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.closeHeatmapModal();
      });
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeHeatmapModal();
        }
      });
    }

    // Cerrar con tecla Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("show")) {
        this.closeHeatmapModal();
      }
    });
  }

  /**
   * Convertir path absoluto de Windows a URL válida para el navegador
   */
  convertPathToUrl(filePath) {
    // Convertir backslashes a forward slashes y agregar file:// protocol
    const normalizedPath = filePath.replace(/\\/g, "/");
    return `file:///${normalizedPath}`;
  }

  /**
   * Verificar si una imagen existe en los paths de assets
   */
  async checkImageExists(login, zone) {
    if (!this.assetsPaths) {
      console.warn("⚠️ Assets paths no están cargados");
      return { exists: false, path: null };
    }

    for (const assetsPath of this.assetsPaths) {
      try {
        const imagePath = `${assetsPath}${login}_${zone}.png`;
        console.log(`🔍 Verificando imagen: ${imagePath}`);

        // Usar window.api.fileExists si está disponible
        if (window.api && window.api.fileExists) {
          const exists = await window.api.fileExists(imagePath);
          if (exists) {
            console.log(`✅ Imagen encontrada: ${imagePath}`);
            // Convertir path absoluto a URL válida para el navegador
            const imageUrl = this.convertPathToUrl(imagePath);
            return {
              exists: true,
              path: imageUrl,
            };
          }
        } else {
          // Fallback: intentar cargar la imagen
          const img = new Image();
          return new Promise((resolve) => {
            img.onload = () => {
              console.log(`✅ Imagen encontrada: ${imagePath}`);
              // Convertir path absoluto a URL válida para el navegador
              const imageUrl = this.convertPathToUrl(imagePath);
              resolve({
                exists: true,
                path: imageUrl,
              });
            };
            img.onerror = () => {
              console.log(`❌ Imagen no encontrada: ${imagePath}`);
              resolve({ exists: false, path: imagePath });
            };
            img.src = imagePath;
          });
        }
      } catch (error) {
        console.log(`❌ Error verificando imagen: ${error.message}`);
        continue;
      }
    }

    return { exists: false, path: null };
  }

  /**
   * Actualizar zonas disponibles para el usuario
   */
  async updateAvailableZones(login) {
    const zonesGrid = document.getElementById("zones-grid");
    if (!zonesGrid) return;

    // Limpiar completamente el grid
    zonesGrid.innerHTML = "";
    console.log(`🔍 Verificando zonas disponibles para ${login}...`);
    console.log(
      `🧹 Grid limpiado, botones existentes: ${zonesGrid.children.length}`
    );

    // Verificar cada zona de forma asíncrona
    for (const zone of this.availableZones) {
      const imageCheck = await this.checkImageExists(login, zone);

      const button = document.createElement("button");
      button.className = imageCheck.exists
        ? "zone-button"
        : "zone-button disabled";
      button.textContent = zone;
      button.dataset.zone = zone;
      button.dataset.login = login;

      if (imageCheck.exists) {
        button.addEventListener("click", () => {
          this.showHeatmapImage(login, zone, imageCheck.path);
        });
        console.log(`✅ Botón ${zone} habilitado para ${login}`);
      } else {
        button.disabled = true;
        console.log(
          `❌ Botón ${zone} deshabilitado para ${login} - imagen no encontrada`
        );
      }

      zonesGrid.appendChild(button);
    }

    console.log(
      `✅ Zonas actualizadas para ${login}. Total botones: ${zonesGrid.children.length}`
    );
  }

  /**
   * Actualiza los datos de análisis de esfuerzo para el usuario
   * @param {string} login - Login del usuario
   */
  updateUserEffortData(login) {
    console.log(`⚡ Actualizando datos de esfuerzo para: ${login}`);

    if (!this.effortData || !this.effortData.analisis_por_empleado) {
      console.warn("⚠️ No hay datos de esfuerzo disponibles");
      this.clearEffortData();
      return;
    }

    // Buscar datos del usuario por login
    const userEffortData = Object.values(
      this.effortData.analisis_por_empleado
    ).find((user) => user.login === login);

    if (!userEffortData) {
      console.warn(`⚠️ No se encontraron datos de esfuerzo para ${login}`);
      this.clearEffortData();
      return;
    }

    console.log(
      `✅ Datos de esfuerzo encontrados para ${login}:`,
      userEffortData
    );

    // Actualizar métricas principales
    this.updateEffortMetrics(userEffortData);

    // Actualizar tiempo entre stow por menú
    this.updateEffortStowTimes(userEffortData);

    // Actualizar porcentajes de categorías
    this.updateEffortCategories(userEffortData);

    // Actualizar top ASINs por categoría
    this.updateEffortTopAsins(userEffortData);

    // Actualizar distribución por tipos de bin
    this.updateEffortBinTypes(userEffortData);

    // Actualizar distribución por estantes
    this.updateEffortShelves(userEffortData);
  }

  /**
   * Calcula los promedios de categorías según el filtro de turno actual
   * @returns {Object} Promedios de categorías filtrados por turno
   */
  calculateFilteredCategoryAverages() {
    // Si el filtro es "all" o no hay datos, usar los promedios del resumen general
    if (this.currentRotationFilter === "all" || !this.effortData || !this.effortData.analisis_por_empleado) {
      const summaryCategories = this.effortSummaryData || [];
      const result = {};
      summaryCategories.forEach(cat => {
        const key = cat.categoria.toLowerCase();
        result[key] = cat.porcentaje_units || 0;
      });
      return result;
    }

    // Filtrar empleados por turno (case-insensitive)
    const allEmployees = Object.values(this.effortData.analisis_por_empleado);
    const filteredEmployees = allEmployees.filter(emp => {
      const rotation = this.getUserRotation(emp.login);
      return rotation && rotation.toLowerCase() === this.currentRotationFilter.toLowerCase();
    });

    // Si no hay empleados en el turno, usar promedios generales
    if (filteredEmployees.length === 0) {
      console.log(`⚠️ No hay empleados en turno ${this.currentRotationFilter} para categorías, usando promedios generales`);
      const summaryCategories = this.effortSummaryData || [];
      const result = {};
      summaryCategories.forEach(cat => {
        const key = cat.categoria.toLowerCase();
        result[key] = cat.porcentaje_units || 0;
      });
      return result;
    }

    // Calcular promedios de categorías para el turno
    const categoryTotals = {
      muy_facil: [],
      facil: [],
      medio: [],
      dificil: [],
      muy_dificil: []
    };

    filteredEmployees.forEach(emp => {
      const empCategories = emp.porcentajes_categorias || {};
      Object.keys(categoryTotals).forEach(key => {
        if (empCategories[key] !== undefined) {
          categoryTotals[key].push(empCategories[key]);
        }
      });
    });

    const result = {};
    Object.entries(categoryTotals).forEach(([key, values]) => {
      result[key] = values.length > 0 
        ? values.reduce((sum, v) => sum + v, 0) / values.length 
        : 0;
    });

    console.log(`📊 Promedios de categorías para turno ${this.currentRotationFilter}:`, result);
    return result;
  }

  /**
   * Calcula los promedios según el filtro de turno actual
   * @returns {Object} Promedios filtrados por turno
   */
  calculateFilteredAverages() {
    // Si no hay datos de esfuerzo, retornar promedios generales
    if (!this.effortData || !this.effortData.analisis_por_empleado) {
      return this.effortGeneralStats || {};
    }

    // Si el filtro es "all", usar los promedios generales del archivo
    if (this.currentRotationFilter === "all") {
      return this.effortGeneralStats || {};
    }

    // Filtrar empleados por turno (case-insensitive)
    const allEmployees = Object.values(this.effortData.analisis_por_empleado);
    const filteredEmployees = allEmployees.filter(emp => {
      const rotation = this.getUserRotation(emp.login);
      return rotation && rotation.toLowerCase() === this.currentRotationFilter.toLowerCase();
    });

    console.log(`🔍 Filtrando empleados para turno ${this.currentRotationFilter}: ${filteredEmployees.length} de ${allEmployees.length}`);

    // Si no hay empleados en el turno, usar promedios generales
    if (filteredEmployees.length === 0) {
      console.log(`⚠️ No hay empleados en turno ${this.currentRotationFilter}, usando promedios generales`);
      return this.effortGeneralStats || {};
    }

    // Calcular promedios filtrados
    const count = filteredEmployees.length;
    
    const avgDistance = filteredEmployees.reduce((sum, emp) => sum + (emp.total_distance || 0), 0) / count;
    const avgUnitsPerBin = filteredEmployees.reduce((sum, emp) => sum + (emp.promedio_units_por_bin || 0), 0) / count;
    const avgCartChanges = filteredEmployees.reduce((sum, emp) => sum + (emp.cart_changes || 0), 0) / count;
    const avgUnitsPerCart = filteredEmployees.reduce((sum, emp) => sum + (emp.promedio_units_por_cart || 0), 0) / count;
    const avgErrors = filteredEmployees.reduce((sum, emp) => sum + (emp.errores || 0), 0) / count;

    // Calcular promedios de bin types
    const usoBinTypes = {};
    filteredEmployees.forEach(emp => {
      const empBinTypes = emp.uso_bin_types_por_empleado || {};
      Object.entries(empBinTypes).forEach(([binType, percentage]) => {
        if (!usoBinTypes[binType]) usoBinTypes[binType] = [];
        usoBinTypes[binType].push(percentage);
      });
    });
    const avgBinTypes = {};
    Object.entries(usoBinTypes).forEach(([binType, values]) => {
      avgBinTypes[binType] = values.reduce((sum, v) => sum + v, 0) / values.length;
    });

    // Calcular promedios de shelves
    const usoShelves = {};
    filteredEmployees.forEach(emp => {
      const empShelves = emp.uso_shelves_por_empleado || {};
      Object.entries(empShelves).forEach(([shelf, percentage]) => {
        if (!usoShelves[shelf]) usoShelves[shelf] = [];
        usoShelves[shelf].push(percentage);
      });
    });
    const avgShelves = {};
    Object.entries(usoShelves).forEach(([shelf, values]) => {
      avgShelves[shelf] = values.reduce((sum, v) => sum + v, 0) / values.length;
    });

    // Calcular promedios de categorías
    const categorias = {};
    filteredEmployees.forEach(emp => {
      const empCategorias = emp.categorias_procesadas || {};
      Object.entries(empCategorias).forEach(([cat, data]) => {
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(data.porcentaje_units || 0);
      });
    });
    const avgCategorias = {};
    Object.entries(categorias).forEach(([cat, values]) => {
      avgCategorias[cat] = values.reduce((sum, v) => sum + v, 0) / values.length;
    });

    console.log(`📊 Promedios calculados para turno ${this.currentRotationFilter} (${count} empleados)`);

    return {
      promedio_distancia_recorrida: avgDistance,
      promedio_units_por_bin: avgUnitsPerBin,
      promedio_cambios_carro_por_empleado: avgCartChanges,
      promedio_units_por_cart: avgUnitsPerCart,
      promedio_errores_por_empleado: avgErrors,
      uso_bin_types: avgBinTypes,
      uso_shelves: avgShelves,
      resumen_categorias: avgCategorias,
      _filtered: true,
      _rotation: this.currentRotationFilter,
      _employeeCount: count
    };
  }

  /**
   * Actualiza las métricas principales del esfuerzo
   * @param {Object} userData - Datos del usuario
   */
  updateEffortMetrics(userData) {
    const metrics = {
      hours: userData.hours || 0,
      distance: userData.total_distance || 0,
      unitsPerBin: userData.promedio_units_por_bin || 0,
      cartChanges: userData.cart_changes || 0,
      unitsPerCart: userData.promedio_units_por_cart || 0,
      errors: userData.errores || 0,
    };

    // Obtener promedios filtrados según el turno seleccionado
    const filteredStats = this.calculateFilteredAverages();
    const avgDistance = filteredStats.promedio_distancia_recorrida || 0;
    const avgUnitsPerBin = filteredStats.promedio_units_por_bin || 0;
    const avgCartChanges = filteredStats.promedio_cambios_carro_por_empleado || 0;
    const avgUnitsPerCart = filteredStats.promedio_units_por_cart || 0;
    const avgErrors = filteredStats.promedio_errores_por_empleado || 0;

    // Actualizar elementos del DOM con comparaciones
    document.getElementById(
      "effort-hours"
    ).textContent = `${metrics.hours.toFixed(2)}h`;

    document.getElementById("effort-distance").innerHTML =
      this.formatComparison(metrics.distance, avgDistance, "m");

    document.getElementById("effort-units-per-bin").innerHTML =
      this.formatComparison(metrics.unitsPerBin, avgUnitsPerBin, "units");

    document.getElementById("effort-cart-changes").innerHTML =
      this.formatComparison(metrics.cartChanges, avgCartChanges, "cambios");

    document.getElementById("effort-units-per-cart").innerHTML =
      this.formatComparison(metrics.unitsPerCart, avgUnitsPerCart, "units");

    document.getElementById("effort-errors").innerHTML = this.formatComparison(
      metrics.errors,
      avgErrors,
      "errores"
    );

    console.log("✅ Métricas de esfuerzo actualizadas:", metrics);
    console.log("📊 Comparaciones con promedios:", {
      distance: avgDistance,
      unitsPerBin: avgUnitsPerBin,
      cartChanges: avgCartChanges,
      unitsPerCart: avgUnitsPerCart,
      errors: avgErrors,
    });
  }

  /**
   * Actualiza el tiempo entre stow por menú
   * @param {Object} userData - Datos del usuario
   */
  updateEffortStowTimes(userData) {
    // Los datos de tiempo entre stow están en cada usuario individual
    const userStowTimes =
      userData.tiempo_promedio_entre_stow_por_empleado || {};
    const generalStats = this.effortGeneralStats || {};

    // Calcular promedio general de todos los menús
    const generalStowTimes = generalStats.tiempo_promedio_entre_stow || {};
    let avgGeneralTime = 0;
    if (Object.keys(generalStowTimes).length > 0) {
      const times = Object.values(generalStowTimes).map(
        (menu) => menu.promedio_general || 0
      );
      avgGeneralTime =
        times.reduce((sum, time) => sum + time, 0) / times.length;
    }

    console.log("🔍 Debug updateEffortStowTimes:");
    console.log("- userStowTimes:", userStowTimes);
    console.log("- generalStats:", generalStats);
    console.log("- generalStowTimes:", generalStowTimes);
    console.log("- avgGeneralTime:", avgGeneralTime);

    // Crear HTML para mostrar tiempos por menú
    let stowTimesHTML = "";

    if (Object.keys(userStowTimes).length > 0) {
      // Agregar header para los promedios
      stowTimesHTML += `
        <div class="stow-times-header">
          <span class="stow-header-menu">Menú</span>
          <span class="stow-header-time">Tiempo</span>
          <span class="stow-header-items">Artículos</span>
          <span class="stow-header-avg">Promedio General</span>
        </div>
      `;

      Object.entries(userStowTimes).forEach(([menu, data]) => {
        const menuAvgTime = data.promedio || 0;
        const totalArticulos = data.total_articulos || 0;

        // Obtener promedio general para este menú específico
        const generalMenuTime = generalStowTimes[menu]?.promedio_general || 0;

        const menuAvgFormatted = this.formatTime(menuAvgTime);
        const generalMenuFormatted = this.formatTime(generalMenuTime);

        const vsMenuPercentage = this.calculatePercentageDifference(
          menuAvgTime,
          generalMenuTime
        );

        stowTimesHTML += `
          <div class="stow-time-item">
            <span class="stow-time-menu">Menú ${menu}</span>
            <span class="stow-time-value">${menuAvgFormatted}</span>
            <span class="stow-time-items">${totalArticulos} artículos</span>
            <span class="stow-time-avg">${generalMenuFormatted} (${vsMenuPercentage})</span>
          </div>
        `;
      });
    } else {
      stowTimesHTML = "<p>No hay datos de tiempo entre stow disponibles.</p>";
    }

    // Buscar o crear contenedor para tiempos entre stow
    let stowTimesContainer = document.getElementById("effort-stow-times");
    if (!stowTimesContainer) {
      // Crear contenedor si no existe
      const effortMetrics = document.querySelector(".effort-metrics");
      if (effortMetrics) {
        stowTimesContainer = document.createElement("div");
        stowTimesContainer.id = "effort-stow-times";
        stowTimesContainer.className = "effort-stow-times";
        effortMetrics.appendChild(stowTimesContainer);
      }
    }

    if (stowTimesContainer) {
      stowTimesContainer.innerHTML = stowTimesHTML;
    }

    console.log("✅ Tiempos entre stow actualizados");
  }
  updateEffortCategories(userData) {
    const userPercentages = userData.porcentajes_categorias || {};
    
    // Calcular promedios filtrados por turno
    const filteredAverages = this.calculateFilteredCategoryAverages();

    const categories = [
      {
        key: "muy_facil",
        label: "Muy Fácil",
        color: "muy-facil",
        summaryKey: "MUY_FACIL",
      },
      { key: "facil", label: "Fácil", color: "facil", summaryKey: "FACIL" },
      { key: "medio", label: "Medio", color: "medio", summaryKey: "MEDIO" },
      {
        key: "dificil",
        label: "Difícil",
        color: "dificil",
        summaryKey: "DIFICIL",
      },
      {
        key: "muy_dificil",
        label: "Muy Difícil",
        color: "muy-dificil",
        summaryKey: "MUY_DIFICIL",
      },
    ];

    categories.forEach((category) => {
      const userPercentage = userPercentages[category.key] || 0;

      // Usar promedios filtrados por turno
      const averagePercentage = filteredAverages[category.key] || 0;

      // Actualizar barra de progreso
      const fillElement = document.getElementById(`category-${category.color}`);
      if (fillElement) {
        fillElement.style.width = `${userPercentage}%`;
        console.log(
          `📊 Actualizando barra ${category.color}: ${userPercentage}%`
        );
      } else {
        console.log(`❌ No se encontró elemento: category-${category.color}`);
      }

      // Actualizar porcentaje
      const percentageElement = document.getElementById(
        `percentage-${category.color}`
      );
      if (percentageElement) {
        percentageElement.textContent = `${userPercentage.toFixed(1)}%`;
      }

      // Actualizar promedio
      const averageElement = document.getElementById(
        `average-${category.color}`
      );
      if (averageElement) {
        averageElement.textContent = `${averagePercentage.toFixed(1)}%`;
      }
    });

    console.log("✅ Porcentajes de categorías actualizados");
  }

  /**
   * Actualiza la distribución por tipos de bin
   * @param {Object} userData - Datos del usuario
   */
  updateEffortBinTypes(userData) {
    const userBinTypes = userData.uso_bin_types_por_empleado || {};
    // Usar promedios filtrados según el turno seleccionado
    const filteredStats = this.calculateFilteredAverages();
    const generalBinTypes = filteredStats.uso_bin_types || {};

    console.log("🔍 Debug updateEffortBinTypes:");
    console.log("- userBinTypes:", userBinTypes);
    console.log("- generalBinTypes:", generalBinTypes);

    // Crear HTML para mostrar tipos de bin
    let binTypesHTML = "";

    if (Object.keys(userBinTypes).length > 0) {
      Object.entries(userBinTypes).forEach(([binType, data]) => {
        const userPercentage = data.porcentaje || 0;
        const generalPercentage = generalBinTypes[binType]?.porcentaje || 0;

        // Convertir nombre del bin type a clase CSS
        const cssClass = binType.toLowerCase().replace(/-/g, "-");

        console.log(`🔍 Bin Type: ${binType} -> CSS Class: ${cssClass}`);

        binTypesHTML += `
          <div class="bin-type-item">
            <span class="bin-type-label">${binType}</span>
            <div class="bin-type-bar">
              <div
                class="bin-type-fill ${cssClass}"
                id="bin-type-${cssClass}"
                style="width: ${userPercentage}%"
              ></div>
              <span
                class="bin-type-percentage"
                id="bin-type-percentage-${cssClass}"
              >${userPercentage.toFixed(1)}%</span
              >
            </div>
            <span class="bin-type-average" id="bin-type-average-${cssClass}"
              >${generalPercentage.toFixed(1)}%</span
            >
          </div>
        `;
      });
    } else {
      binTypesHTML = "<p>No hay datos de tipos de bin disponibles.</p>";
    }

    // Actualizar el contenedor
    const binTypesContainer = document.getElementById("bin-types-list");
    if (binTypesContainer) {
      binTypesContainer.innerHTML = binTypesHTML;
    }

    console.log("✅ Distribución por tipos de bin actualizada");
  }

  /**
   * Actualiza la distribución por estantes
   * @param {Object} userData - Datos del usuario
   */
  updateEffortShelves(userData) {
    const userShelves = userData.uso_shelves_por_empleado || {};
    // Usar promedios filtrados según el turno seleccionado
    const filteredStats = this.calculateFilteredAverages();
    const generalShelves = filteredStats.uso_shelves || {};

    console.log("🔍 Debug updateEffortShelves:");
    console.log("- userShelves:", userShelves);
    console.log("- generalShelves:", generalShelves);

    // Crear HTML para mostrar estantes
    let shelvesHTML = "";

    if (Object.keys(userShelves).length > 0) {
      Object.entries(userShelves).forEach(([shelf, data]) => {
        const userPercentage = data.porcentaje || 0;
        const generalPercentage = generalShelves[shelf]?.porcentaje || 0;

        // Convertir nombre del shelf a clase CSS
        const cssClass = `shelf-${shelf.toLowerCase()}`;

        console.log(`🔍 Shelf: ${shelf} -> CSS Class: ${cssClass}`);

        shelvesHTML += `
          <div class="shelf-item">
            <span class="shelf-label">${shelf}</span>
            <div class="shelf-bar">
              <div
                class="shelf-fill ${cssClass}"
                id="shelf-${cssClass}"
                style="width: ${userPercentage}%"
              ></div>
              <span
                class="shelf-percentage"
                id="shelf-percentage-${cssClass}"
              >${userPercentage.toFixed(1)}%</span
              >
            </div>
            <span class="shelf-average" id="shelf-average-${cssClass}"
              >${generalPercentage.toFixed(1)}%</span
            >
          </div>
        `;
      });
    } else {
      shelvesHTML = "<p>No hay datos de estantes disponibles.</p>";
    }

    // Actualizar el contenedor
    const shelvesContainer = document.getElementById("shelves-list");
    if (shelvesContainer) {
      shelvesContainer.innerHTML = shelvesHTML;
    }

    console.log("✅ Distribución por estantes actualizada");
  }

  /**
   * Actualiza los top ASINs por categoría
   * @param {Object} userData - Datos del usuario
   */
  updateEffortTopAsins(userData) {
    const topAsinsByCategory = userData.top_asins_por_categoria || {};
    const tabsContainer = document.getElementById("top-asins-tabs");
    const contentContainer = document.getElementById("top-asins-content");

    if (!tabsContainer || !contentContainer) {
      console.warn("⚠️ No se encontraron contenedores para top ASINs");
      return;
    }

    // Limpiar contenedores
    tabsContainer.innerHTML = "";
    contentContainer.innerHTML = "";

    const categories = [
      "MUY_FACIL",
      "FACIL",
      "MEDIO",
      "DIFICIL",
      "MUY_DIFICIL",
    ];
    let activeTab = null;

    categories.forEach((category, index) => {
      const asins = topAsinsByCategory[category] || [];

      if (asins.length > 0) {
        // Crear tab
        const tab = document.createElement("button");
        tab.className = `top-asins-tab ${index === 0 ? "active" : ""}`;
        tab.textContent = category.replace("_", " ");
        tab.dataset.category = category;

        tab.addEventListener("click", () => {
          // Remover clase active de todos los tabs
          tabsContainer
            .querySelectorAll(".top-asins-tab")
            .forEach((t) => t.classList.remove("active"));
          // Agregar clase active al tab clickeado
          tab.classList.add("active");
          // Mostrar contenido correspondiente
          this.showTopAsinsContent(category, asins);
        });

        tabsContainer.appendChild(tab);

        // Si es el primer tab, mostrarlo por defecto
        if (index === 0) {
          activeTab = category;
        }
      }
    });

    // Mostrar contenido del primer tab activo
    if (activeTab) {
      this.showTopAsinsContent(activeTab, topAsinsByCategory[activeTab] || []);
    }

    console.log("✅ Top ASINs por categoría actualizados");
  }

  /**
   * Muestra el contenido de ASINs para una categoría específica
   * @param {string} category - Categoría
   * @param {Array} asins - Lista de ASINs
   */
  showTopAsinsContent(category, asins) {
    const contentContainer = document.getElementById("top-asins-content");
    if (!contentContainer) return;

    contentContainer.innerHTML = "";

    if (asins.length === 0) {
      contentContainer.innerHTML =
        "<p style='text-align: center; color: #6c757d; padding: 1rem;'>No hay ASINs disponibles para esta categoría</p>";
      return;
    }

    const listContainer = document.createElement("div");
    listContainer.className = "top-asins-list";

    asins.forEach((asin, index) => {
      const item = document.createElement("div");
      item.className = "top-asin-item";

      const asinElement = document.createElement("span");
      asinElement.className = "top-asin-asin";
      asinElement.textContent = asin["FCSKU/ASIN"];
      asinElement.title = "Hacer clic para abrir en FCresearch";

      // Agregar funcionalidad para abrir en web externa
      asinElement.addEventListener("click", () => {
        this.openAsinInExternalWeb(asin["FCSKU/ASIN"]);
      });

      const detailsElement = document.createElement("div");
      detailsElement.className = "top-asin-details";
      detailsElement.innerHTML = `
        <span class="top-asin-qty">Qty: ${asin.Qty}</span>
      `;

      item.appendChild(asinElement);
      item.appendChild(detailsElement);
      listContainer.appendChild(item);
    });

    contentContainer.appendChild(listContainer);
  }

  /**
   * Abre un ASIN en FCresearch en una nueva pestaña
   * @param {string} asin - Código ASIN
   */
  openAsinInExternalWeb(asin) {
    const fcresearchUrl = `http://fcresearch-eu.aka.amazon.com/VLC1/results?s=${asin}`;
    console.log(`🌐 Abriendo ASIN ${asin} en FCresearch: ${fcresearchUrl}`);

    // Usar la API de Electron para abrir en navegador externo
    if (window.api && window.api.openExternalLink) {
      window.api.openExternalLink(fcresearchUrl);
    } else if (window.api && window.api.openExternal) {
      window.api.openExternal(fcresearchUrl);
    } else {
      // Fallback: abrir en nueva ventana
      window.open(fcresearchUrl, "_blank");
    }
  }

  /**
   * Limpia los datos de esfuerzo cuando no hay datos disponibles
   */
  clearEffortData() {
    // Limpiar métricas
    const metricIds = [
      "effort-hours",
      "effort-distance",
      "effort-units-per-bin",
      "effort-cart-changes",
      "effort-units-per-cart",
      "effort-errors",
    ];
    metricIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = "--";
    });

    // Limpiar categorías
    const categoryColors = [
      "muy-facil",
      "facil",
      "medio",
      "dificil",
      "muy-dificil",
    ];
    categoryColors.forEach((color) => {
      const fillElement = document.getElementById(`category-${color}`);
      if (fillElement) fillElement.style.width = "0%";

      const percentageElement = document.getElementById(`percentage-${color}`);
      if (percentageElement) percentageElement.textContent = "--";

      const averageElement = document.getElementById(`average-${color}`);
      if (averageElement) averageElement.textContent = "Promedio: --";
    });

    // Limpiar top ASINs
    const tabsContainer = document.getElementById("top-asins-tabs");
    const contentContainer = document.getElementById("top-asins-content");
    if (tabsContainer) tabsContainer.innerHTML = "";
    if (contentContainer)
      contentContainer.innerHTML =
        "<p style='text-align: center; color: #6c757d; padding: 1rem;'>No hay datos disponibles</p>";
  }

  /**
   * Mostrar imagen del heatmap en modal
   */
  showHeatmapImage(login, zone, imagePath) {
    const modal = document.getElementById("heatmap-modal");
    const modalTitle = document.getElementById("heatmap-modal-title");
    const modalImage = document.getElementById("heatmap-modal-image");

    if (!modal || !modalTitle || !modalImage) return;

    modalTitle.textContent = `🗺️ HEATMAP Stow - ${login} (${zone})`;

    // Usar el path completo que ya fue verificado
    console.log(`🖼️ Mostrando imagen: ${imagePath}`);
    modalImage.src = imagePath;
    modalImage.alt = `Heatmap Stow para ${login} en zona ${zone}`;

    // Manejar errores de carga de imagen
    modalImage.onerror = () => {
      console.error(`❌ Error cargando imagen: ${imagePath}`);
      modalImage.src =
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NzNlYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg==";
      modalImage.alt = "Imagen no encontrada";
    };

    modalImage.onload = () => {
      console.log(`✅ Imagen cargada correctamente: ${imagePath}`);
    };

    modal.classList.add("show");
    document.body.style.overflow = "hidden"; // Prevenir scroll del body
  }

  /**
   * Cerrar modal de heatmap
   */
  closeHeatmapModal() {
    const modal = document.getElementById("heatmap-modal");
    if (modal) {
      modal.classList.remove("show");
      document.body.style.overflow = ""; // Restaurar scroll del body
    }
  }

  /**
   * Carga los SVG de ActivityScope
   */
  async loadActivityScopeIcons() {
    /**
     * Carga los SVG de los iconos de ActivityScope
     */
    const activityScopeIcons = {
      // Header icons
      'icon-user-activity-header': 'assets/svg/ActivityScope/UserActivity.svg',
      'icon-refresh-activity': 'assets/svg/ActivityScope/Refresh.svg',
      'icon-export-activity': 'assets/svg/ActivityScope/Export.svg',
      'icon-close-user-detail': 'assets/svg/ActivityScope/CerrarModal.svg',
      
      // KPI section icons - nombres descriptivos
      'icon-user-info': 'assets/svg/ActivityScope/InfoAA.svg',
      'icon-activity-30min': 'assets/svg/ActivityScope/Actividad30Min.svg',
      'icon-heatmap-stow': 'assets/svg/ActivityScope/HeatmapStow.svg',
      'icon-analysis-general': 'assets/svg/ActivityScope/AnalisisGeneral.svg',
      'icon-clock-worked': 'assets/svg/ActivityScope/HorasTrabajadas.svg',
      'icon-ruler-distance': 'assets/svg/ActivityScope/DistanciaRecorrida.svg',
      'icon-box-units': 'assets/svg/ActivityScope/PromedioUnitsBin.svg',
      'icon-cart-changes': 'assets/svg/ActivityScope/CambiosJCart.svg',
      'icon-units-per-cart': 'assets/svg/ActivityScope/PromedioUnitsCart.svg',
      'icon-error-committed': 'assets/svg/ActivityScope/ErroresCometidos.svg',
      'icon-distribution-categories': 'assets/svg/ActivityScope/DistribucionCategorias.svg',
      'icon-trophy-top-asins': 'assets/svg/ActivityScope/TopAsinsPorCategoria.svg',
      'icon-timer-stow-time': 'assets/svg/ActivityScope/TiempoEntreStow.svg',
      'icon-bin-types': 'assets/svg/ActivityScope/DistribucionBinTypes.svg',
      'icon-shelves': 'assets/svg/ActivityScope/DistribucionShelves.svg',
      
      // Date filter icons
      'icon-calendar-today': 'assets/svg/ActivityScope/Calendar.svg',
      'icon-calendar-yesterday': 'assets/svg/ActivityScope/Calendar.svg',
      'icon-calendar-before': 'assets/svg/ActivityScope/Calendar.svg',
      
      // Filter and sort icons
      'icon-sunrise-all': 'assets/svg/ActivityScope/Sunrise.svg',
      'icon-sunrise-early': 'assets/svg/ActivityScope/Sun.svg',
      'icon-moon-late': 'assets/svg/ActivityScope/Moon.svg',
      'icon-chart-uph': 'assets/svg/ActivityScope/UPHCombined.svg',
      'icon-clock-hours': 'assets/svg/ActivityScope/HorasCombined.svg',
      'icon-box-units-combined': 'assets/svg/ActivityScope/UnitsCombined.svg',
      'icon-target-rate': 'assets/svg/ActivityScope/RateAjustado.svg',
      'icon-arrow-down': 'assets/svg/ActivityScope/ArrowDown.svg',
      'icon-arrow-up': 'assets/svg/ActivityScope/ArrowUp.svg',
      'icon-box-each-stow': 'assets/svg/ActivityScope/EachStow.svg',
      'icon-box-each-e': 'assets/svg/ActivityScope/EachE.svg',
      'icon-box-each-w': 'assets/svg/ActivityScope/EachW.svg',
      'icon-truck-pallet': 'assets/svg/ActivityScope/Pallet.svg',
      'icon-truck-pallet-e': 'assets/svg/ActivityScope/PalletE.svg',
      'icon-truck-pallet-w': 'assets/svg/ActivityScope/PalletW.svg',
      'icon-lightning-effort': 'assets/svg/ActivityScope/Esfuerzo.svg',
      'icon-times-modal': 'assets/svg/ActivityScope/CerrarModal.svg'
    };
    
    // Verificar que el API esté disponible
    if (!window.api || !window.api.readFile) {
      console.warn('[ActivityScope Icons] API readFile no disponible');
      return;
    }
    
    // Cargar cada icono
    for (const [iconId, svgPath] of Object.entries(activityScopeIcons)) {
      try {
        const iconElement = document.getElementById(iconId);
        if (!iconElement) {
          // No mostrar warning para iconos que pueden no existir en todas las vistas
          continue;
        }
        
        const result = await window.api.readFile(svgPath);
        if (result.success && result.content) {
          // Insertar el SVG en el elemento
          iconElement.innerHTML = result.content;
          
          // Hacer el SVG responsive según la clase de tamaño
          const svgElement = iconElement.querySelector('svg');
          if (svgElement) {
            // Mantener el viewBox original pero hacer el SVG responsive
            if (!svgElement.getAttribute('viewBox') && svgElement.getAttribute('width') && svgElement.getAttribute('height')) {
              const width = svgElement.getAttribute('width');
              const height = svgElement.getAttribute('height');
              svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }
            // Remover atributos fijos de width y height para que el CSS controle el tamaño
            svgElement.removeAttribute('width');
            svgElement.removeAttribute('height');
            
            // Preservar los colores originales del SVG (Presentation Attributes)
            // Los SVG vienen con fill directamente en los elementos, solo asegurar que se preserve
            const allGraphicElements = svgElement.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line, g');
            
            // Verificar si el icono está dentro de un botón con hover (como btn-close-detail)
            const isInHoverButton = iconElement.closest('.btn-close-detail, .heatmap-modal-close');
            
            allGraphicElements.forEach(element => {
              // Preservar fill
              const fillAttr = element.getAttribute('fill');
              if (fillAttr && 
                  fillAttr !== 'none' && 
                  fillAttr !== 'currentColor' && 
                  fillAttr !== 'inherit' && 
                  !fillAttr.startsWith('url')) {
                // Si está en un botón con hover, usar currentColor para que herede el color del texto
                if (isInHoverButton) {
                  element.style.setProperty('fill', 'currentColor', 'important');
                } else {
                  // Aplicar como estilo inline para proteger contra CSS externo
                  element.style.setProperty('fill', fillAttr, 'important');
                }
              }
              
              // Preservar stroke (para iconos como CerrarModal que usan stroke)
              const strokeAttr = element.getAttribute('stroke');
              if (strokeAttr && 
                  strokeAttr !== 'none' && 
                  strokeAttr !== 'currentColor' && 
                  strokeAttr !== 'inherit' && 
                  !strokeAttr.startsWith('url')) {
                element.style.setProperty('stroke', strokeAttr, 'important');
              }
              
              // Preservar stroke-width
              const strokeWidthAttr = element.getAttribute('stroke-width');
              if (strokeWidthAttr) {
                element.style.setProperty('stroke-width', strokeWidthAttr, 'important');
              }
              
              // Preservar stroke-linecap y stroke-linejoin
              const strokeLinecapAttr = element.getAttribute('stroke-linecap');
              if (strokeLinecapAttr) {
                element.style.setProperty('stroke-linecap', strokeLinecapAttr, 'important');
              }
              
              const strokeLinejoinAttr = element.getAttribute('stroke-linejoin');
              if (strokeLinejoinAttr) {
                element.style.setProperty('stroke-linejoin', strokeLinejoinAttr, 'important');
              }
            });
          }
          
          console.log(`[ActivityScope Icons] ✓ Cargado: ${iconId}`);
        } else {
          console.warn(`[ActivityScope Icons] ✗ Error cargando ${svgPath}:`, result.error);
        }
      } catch (error) {
        console.error(`[ActivityScope Icons] Error cargando ${iconId}:`, error);
      }
    }
  }

  /**
   * Genera SVG de flecha para mostrar cambio de rate
   * @param {number} newRate - Rate nuevo (ajustado)
   * @param {number} oldRate - Rate anterior (original)
   * @returns {string} HTML con SVG de flecha
   */
  generateRateChangeSVG(newRate, oldRate) {
    if (!oldRate || oldRate === 0) {
      return `<span class="rate-new">${newRate.toFixed(0)}</span>`;
    }

    const isIncrease = newRate > oldRate;
    const color = isIncrease ? "#10b981" : "#ef4444"; // Verde para subir, rojo para bajar
    const arrowDirection = isIncrease ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"; // Flecha hacia arriba o abajo

    return `
      <span class="rate-display">
        <span class="rate-new">${newRate.toFixed(0)}</span>
        <svg class="rate-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="${arrowDirection}"></path>
        </svg>
        <span class="rate-old">${oldRate.toFixed(0)}</span>
      </span>
    `;
  }

  /**
   * Rates estimados por proceso de Receive
   */
  getReceiveRates() {
    return {
      'decant-tsi': 140,
      'decant-pid': 180,
      'non-con': 60,
      'preditor': 100
    };
  }

  /**
   * Calcula el Performance Index Diario
   * 
   * Fórmula:
   * 1. Eficiencia_Proceso = UPH_real / UPH_óptimo
   * 2. Factor_Esfuerzo = 1 / UPB (solo para PID, Non-Con, PrEditor; TSI no aplica)
   * 3. Eficiencia_Ajustada = Eficiencia × Factor_Esfuerzo
   * 4. Score_Proceso = Eficiencia_Ajustada × Horas_Proceso
   * 5. Índice_Base = Σ(Score_Proceso) / Horas_Totales
   * 6. Factor_Confiabilidad = min(1, sqrt(Horas_Totales / 2.5))
   * 7. Performance_Index = Índice_Base × Factor_Confiabilidad
   * 
   * Lógica del UPB:
   * - UPB = 1: 60 UPH = 60 cajas = máximo esfuerzo → Factor = 1.0
   * - UPB = 5: 60 UPH = 12 cajas = 5x menos movimientos → Factor = 0.2
   * - Decant TSI: NO aplica UPB (valores muy exagerados)
   * - Decant PID, Non-Con, PrEditor: SÍ aplica UPB
   * 
   * @param {Object} user - Objeto con datos del usuario
   * @returns {number} Performance Index Diario (0-1+, se multiplica por 100 para mostrar como %)
   */
  calculatePerformanceIndex(user) {
    const rates = this.getReceiveRates();
    const tsi = user.decantTSI || {};
    const pid = user.decantPID || {};
    const nonCon = user.nonCon || {};
    const preditor = user.preditor || {};

    let totalScore = 0;
    let totalHours = 0;

    // Decant TSI (rate óptimo: 140) - SIN factor UPB
    if (tsi.hours > 0) {
      const efficiency = (tsi.eachUph || 0) / rates['decant-tsi'];
      // TSI no aplica factor de esfuerzo (UPB muy exagerado)
      const processScore = efficiency * tsi.hours;
      totalScore += processScore;
      totalHours += tsi.hours;
    }

    // Decant PID (rate óptimo: 180) - CON factor UPB
    if (pid.hours > 0) {
      const efficiency = (pid.eachUph || 0) / rates['decant-pid'];
      // Factor de esfuerzo: 1 / UPB (mínimo UPB = 1)
      const upb = Math.max(1, pid.upb || 1);
      const effortFactor = 1 / upb;
      const adjustedEfficiency = efficiency * effortFactor;
      const processScore = adjustedEfficiency * pid.hours;
      totalScore += processScore;
      totalHours += pid.hours;
    }

    // Non-Con (rate óptimo: 60) - CON factor UPB
    if (nonCon.hours > 0) {
      const efficiency = (nonCon.eachUph || 0) / rates['non-con'];
      const upb = Math.max(1, nonCon.upb || 1);
      const effortFactor = 1 / upb;
      const adjustedEfficiency = efficiency * effortFactor;
      const processScore = adjustedEfficiency * nonCon.hours;
      totalScore += processScore;
      totalHours += nonCon.hours;
    }

    // PrEditor (rate óptimo: 100) - CON factor UPB
    if (preditor.hours > 0) {
      const efficiency = (preditor.eachUph || 0) / rates['preditor'];
      const upb = Math.max(1, preditor.upb || 1);
      const effortFactor = 1 / upb;
      const adjustedEfficiency = efficiency * effortFactor;
      const processScore = adjustedEfficiency * preditor.hours;
      totalScore += processScore;
      totalHours += preditor.hours;
    }

    // Si no hay horas trabajadas, retornar 0
    if (totalHours === 0) return 0;

    // Calcular índice base (promedio ponderado de eficiencias ajustadas)
    const baseIndex = totalScore / totalHours;

    // Factor de confiabilidad: min(1, sqrt(Horas_Totales / 2.5))
    // Una muestra se considera confiable a partir de 2.5 horas
    const reliabilityFactor = Math.min(1, Math.sqrt(totalHours / 2.5));

    // Performance Index final
    const performanceIndex = baseIndex * reliabilityFactor;

    // Retornar como decimal (0-1+), se multiplicará por 100 al mostrar
    return performanceIndex;
  }

  /**
   * Formatea un valor numérico: si es 0, muestra "-", sino muestra el valor formateado
   * @param {number} value - Valor a formatear
   * @param {number} decimals - Número de decimales (default: 2)
   * @returns {string} Valor formateado o "-"
   */
  formatReceiveValue(value, decimals = 2) {
    if (value === null || value === undefined || value === 0) {
      return "-";
    }
    return value.toFixed(decimals);
  }

  /**
   * Formatea un valor entero: si es 0, muestra "-", sino muestra el valor
   * @param {number} value - Valor a formatear
   * @returns {string} Valor formateado o "-"
   */
  formatReceiveInteger(value) {
    if (value === null || value === undefined || value === 0) {
      return "-";
    }
    return value.toString();
  }

  /**
   * Renderiza tabla All Receive (combinada)
   */
  renderAllReceiveTable(thead, tbody) {
    console.log("📦 Renderizando tabla All Receive");

    if (!this.receiveData) {
      console.error("❌ No hay datos de Receive disponibles");
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="20" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      if (thead) thead.innerHTML = "";
      return;
    }

    // Crear header con columnas para Decant TSI, Decant PID, Non-Con y PrEditor
    thead.innerHTML = `
      <tr>
        <th rowspan="2" class="header-login">Login</th>
        <th colspan="3" class="header-group header-decant-tsi">Decant (TSI)</th>
        <th colspan="5" class="header-group header-decant-pid">Decant (PID)</th>
        <th colspan="4" class="header-group header-non-con">Non-Con</th>
        <th colspan="4" class="header-group header-preditor">PrEditor</th>
        <th rowspan="2" class="header-group header-combined">Horas Combined</th>
        <th rowspan="2" class="header-group header-combined">Units Combined</th>
        <th rowspan="2" class="header-group header-performance" title="📊 PERFORMANCE INDEX (Diario)

¿Qué es?
Mide la eficiencia real del AA comparando su UPH con el rate esperado de cada proceso (TSI: 140, PID: 180, Non-Con: 60, PrEditor: 100).

¿Por qué es importante?
• Compara procesos diferentes de forma justa: Un AA que trabaja en 4 procesos distintos se puede comparar con uno que solo hace 1
• Ajusta por esfuerzo real (UPB): En PID, Non-Con y PrEditor, un UPB alto significa menos movimientos por unidad. El índice ajusta el UPH para reflejar el esfuerzo físico real, no solo las unidades procesadas
• Pondera por tiempo: Las horas dedicadas a cada proceso pesan en el resultado final

⚠️ Índice diario
Este valor puede variar por factores del día (tipo de producto, volumen, etc.). Para una evaluación más representativa, revisar el historial semanal o mensual en Activity History." style="cursor: help;">Performance Index ⓘ</th>
      </tr>
      <tr>
        <th class="sub-header header-decant-tsi">Horas</th>
        <th class="sub-header header-decant-tsi">Each Units</th>
        <th class="sub-header header-decant-tsi">Each UPH</th>
        <th class="sub-header header-decant-pid">Horas</th>
        <th class="sub-header header-decant-pid">Case Units</th>
        <th class="sub-header header-decant-pid">Each Units</th>
        <th class="sub-header header-decant-pid">Each UPH</th>
        <th class="sub-header header-decant-pid">UPB</th>
        <th class="sub-header header-non-con">Horas</th>
        <th class="sub-header header-non-con">Each Units</th>
        <th class="sub-header header-non-con">Each UPH</th>
        <th class="sub-header header-non-con">UPB</th>
        <th class="sub-header header-preditor">Horas</th>
        <th class="sub-header header-preditor">Each Units</th>
        <th class="sub-header header-preditor">Each UPH</th>
        <th class="sub-header header-preditor">UPB</th>
      </tr>
    `;

    // Agrupar datos por usuario combinando todas las categorías
    const userMap = new Map();

    // Función helper para inicializar usuario con todas las categorías
    const initUser = (login) => {
      return {
        login: login,
        decantTSI: { hours: 0, caseUnits: 0, caseUph: 0, eachUnits: 0, eachUph: 0, upb: 0 },
        decantPID: { hours: 0, caseUnits: 0, caseUph: 0, eachUnits: 0, eachUph: 0, upb: 0 },
        nonCon: { hours: 0, caseUnits: 0, caseUph: 0, eachUnits: 0, eachUph: 0, upb: 0 },
        preditor: { hours: 0, caseUnits: 0, caseUph: 0, eachUnits: 0, eachUph: 0, upb: 0 },
      };
    };

    // Procesar Decant TSI
    if (this.receiveData.receive_decant_tsi) {
      this.receiveData.receive_decant_tsi.forEach((record) => {
        if (!record.login) return;
        if (!userMap.has(record.login)) {
          const user = initUser(record.login);
          user.decantTSI = {
            hours: record.hrs_total || 0,
            caseUnits: record.case_unit_total || 0,
            caseUph: record.case_uph_total || 0,
            eachUnits: record.each_unit_total || 0,
            eachUph: record.each_uph_total || 0,
            upb: record.unit_box || 0,
          };
          userMap.set(record.login, user);
        } else {
          const user = userMap.get(record.login);
          user.decantTSI = {
            hours: (user.decantTSI.hours || 0) + (record.hrs_total || 0),
            caseUnits: (user.decantTSI.caseUnits || 0) + (record.case_unit_total || 0),
            caseUph: record.case_uph_total || 0,
            eachUnits: (user.decantTSI.eachUnits || 0) + (record.each_unit_total || 0),
            eachUph: record.each_uph_total || 0,
            upb: record.unit_box || 0,
          };
        }
      });
    }

    // Procesar Decant PID
    if (this.receiveData.receive_decant_pid) {
      this.receiveData.receive_decant_pid.forEach((record) => {
        if (!record.login) return;
        if (!userMap.has(record.login)) {
          const user = initUser(record.login);
          user.decantPID = {
            hours: record.hrs_total || 0,
            caseUnits: record.case_unit_total || 0,
            caseUph: record.case_uph_total || 0,
            eachUnits: record.each_unit_total || 0,
            eachUph: record.each_uph_total || 0,
            upb: record.unit_box || 0,
          };
          userMap.set(record.login, user);
        } else {
          const user = userMap.get(record.login);
          user.decantPID = {
            hours: (user.decantPID.hours || 0) + (record.hrs_total || 0),
            caseUnits: (user.decantPID.caseUnits || 0) + (record.case_unit_total || 0),
            caseUph: record.case_uph_total || 0,
            eachUnits: (user.decantPID.eachUnits || 0) + (record.each_unit_total || 0),
            eachUph: record.each_uph_total || 0,
            upb: record.unit_box || 0,
          };
        }
      });
    }

    // Procesar Non-Con (receive_each)
    if (this.receiveData.receive_each) {
      this.receiveData.receive_each.forEach((record) => {
        if (!record.login) return;
        if (!userMap.has(record.login)) {
          const user = initUser(record.login);
          user.nonCon = {
            hours: record.hrs_total || 0,
            caseUnits: record.job_unit_total || 0, // Usar job_unit_total
            caseUph: record.job_uph_total || 0, // Usar job_uph_total
            eachUnits: record.each_unit_total || 0,
            eachUph: record.each_uph_total || 0,
            upb: record.unit_box || 0,
          };
          userMap.set(record.login, user);
        } else {
          const user = userMap.get(record.login);
          user.nonCon = {
            hours: (user.nonCon.hours || 0) + (record.hrs_total || 0),
            caseUnits: (user.nonCon.caseUnits || 0) + (record.job_unit_total || 0),
            caseUph: record.job_uph_total || 0,
            eachUnits: (user.nonCon.eachUnits || 0) + (record.each_unit_total || 0),
            eachUph: record.each_uph_total || 0,
            upb: record.unit_box || 0,
          };
        }
      });
    }

    // Procesar PrEditor (receive_321)
    if (this.receiveData.receive_321) {
      this.receiveData.receive_321.forEach((record) => {
        if (!record.login) return;
        if (!userMap.has(record.login)) {
          const user = initUser(record.login);
          user.preditor = {
            hours: record.hrs_total || 0,
            caseUnits: record.case_unit_total || 0,
            caseUph: record.case_uph_total || 0,
            eachUnits: record.each_unit_total || 0,
            eachUph: record.each_uph_total || 0,
            upb: record.unit_box || 0,
          };
          userMap.set(record.login, user);
        } else {
          const user = userMap.get(record.login);
          user.preditor = {
            hours: (user.preditor.hours || 0) + (record.hrs_total || 0),
            caseUnits: (user.preditor.caseUnits || 0) + (record.case_unit_total || 0),
            caseUph: record.case_uph_total || 0,
            eachUnits: (user.preditor.eachUnits || 0) + (record.each_unit_total || 0),
            eachUph: record.each_uph_total || 0,
            upb: record.unit_box || 0,
          };
        }
      });
    }

    // Convertir a array y filtrar usuarios con datos
    const usersWithData = Array.from(userMap.values()).filter((user) => {
      const totalHours = (user.decantTSI?.hours || 0) + (user.decantPID?.hours || 0) +
                         (user.nonCon?.hours || 0) + (user.preditor?.hours || 0);
      const totalUnits = (user.decantTSI?.caseUnits || 0) + (user.decantTSI?.eachUnits || 0) +
                         (user.decantPID?.caseUnits || 0) + (user.decantPID?.eachUnits || 0) +
                         (user.nonCon?.caseUnits || 0) + (user.nonCon?.eachUnits || 0) +
                         (user.preditor?.caseUnits || 0) + (user.preditor?.eachUnits || 0);
      return totalHours > 0 || totalUnits > 0;
    });

    // Agregar propiedades para ordenamiento (usar horas combined para ordenar)
    usersWithData.forEach((user) => {
      const totalHours = (user.decantTSI?.hours || 0) + (user.decantPID?.hours || 0) +
                         (user.nonCon?.hours || 0) + (user.preditor?.hours || 0);
      const totalCaseUnits = (user.decantTSI?.caseUnits || 0) + (user.decantPID?.caseUnits || 0) +
                             (user.nonCon?.caseUnits || 0) + (user.preditor?.caseUnits || 0);
      const totalEachUnits = (user.decantTSI?.eachUnits || 0) + (user.decantPID?.eachUnits || 0) +
                             (user.nonCon?.eachUnits || 0) + (user.preditor?.eachUnits || 0);
      
      // Calcular índice de rendimiento
      user.performanceIndex = this.calculatePerformanceIndex(user);
      
      // Para ordenamiento, usar horas combined por defecto
      user.combinedUph = totalHours; // Usar horas combined para ordenar
      user.combinedHours = totalHours;
      user.combinedUnits = totalCaseUnits + totalEachUnits;
    });

    // Aplicar filtro de rotación
    const filteredUsers = this.filterUsersByRotation(usersWithData);

    // Aplicar ordenamiento
    const sortedUsers = this.sortUsers(filteredUsers);

    // Renderizar filas
    sortedUsers.forEach((user) => {
      const row = document.createElement("tr");
      const tsi = user.decantTSI || {};
      const pid = user.decantPID || {};
      const nonCon = user.nonCon || {};
      const preditor = user.preditor || {};
      
      // Calcular horas combined
      const combinedHours = (tsi.hours || 0) + (pid.hours || 0) + (nonCon.hours || 0) + (preditor.hours || 0);
      
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-decant-tsi">${this.formatReceiveValue(tsi.hours)}</td>
        <td class="cell-decant-tsi">${this.formatReceiveInteger(tsi.eachUnits)}</td>
        <td class="cell-decant-tsi"><strong>${this.formatReceiveValue(tsi.eachUph)}</strong></td>
        <td class="cell-decant-pid">${this.formatReceiveValue(pid.hours)}</td>
        <td class="cell-decant-pid">${this.formatReceiveInteger(pid.caseUnits)}</td>
        <td class="cell-decant-pid">${this.formatReceiveInteger(pid.eachUnits)}</td>
        <td class="cell-decant-pid"><strong>${this.formatReceiveValue(pid.eachUph)}</strong></td>
        <td class="cell-decant-pid">${this.formatReceiveValue(pid.upb)}</td>
        <td class="cell-non-con">${this.formatReceiveValue(nonCon.hours)}</td>
        <td class="cell-non-con">${this.formatReceiveInteger(nonCon.eachUnits)}</td>
        <td class="cell-non-con"><strong>${this.formatReceiveValue(nonCon.eachUph)}</strong></td>
        <td class="cell-non-con">${this.formatReceiveValue(nonCon.upb)}</td>
        <td class="cell-preditor">${this.formatReceiveValue(preditor.hours)}</td>
        <td class="cell-preditor">${this.formatReceiveInteger(preditor.eachUnits)}</td>
        <td class="cell-preditor"><strong>${this.formatReceiveValue(preditor.eachUph)}</strong></td>
        <td class="cell-preditor">${this.formatReceiveValue(preditor.upb)}</td>
        <td class="cell-combined"><strong>${this.formatReceiveValue(combinedHours)}</strong></td>
        <td class="cell-combined"><strong>${this.formatReceiveInteger(user.combinedUnits)}</strong></td>
        <td class="cell-performance"><strong>${user.performanceIndex !== undefined && user.performanceIndex !== null ? (user.performanceIndex * 100).toFixed(2) + '%' : '-'}</strong></td>
      `;
      tbody.appendChild(row);
    });

    if (usersWithData.length === 0) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="20" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla Decant TSI (verde)
   */
  renderDecantTSITable(thead, tbody) {
    console.log("📦 Renderizando tabla Decant TSI");

    if (!this.receiveData || !this.receiveData.receive_decant_tsi) {
      console.error("❌ No hay datos de receive_decant_tsi disponibles");
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      if (thead) thead.innerHTML = "";
      return;
    }

    // Crear header
    thead.innerHTML = `
      <tr>
        <th class="header-login">Login</th>
        <th class="sub-header header-decant-tsi">Horas</th>
        <th class="sub-header header-decant-tsi">Case Units</th>
        <th class="sub-header header-decant-tsi">Case UPH</th>
        <th class="sub-header header-decant-tsi">Each Units</th>
        <th class="sub-header header-decant-tsi">Each UPH</th>
        <th class="sub-header header-decant-tsi">UPB</th>
      </tr>
    `;

    // Agrupar por usuario
    const userMap = new Map();
    this.receiveData.receive_decant_tsi.forEach((record) => {
      if (!record.login) return;
      if (!userMap.has(record.login)) {
        userMap.set(record.login, {
          login: record.login,
          hours: record.hrs_total || 0,
          caseUnits: record.case_unit_total || 0,
          caseUph: record.case_uph_total || 0,
          eachUnits: record.each_unit_total || 0,
          eachUph: record.each_uph_total || 0,
          upb: record.unit_box || 0,
        });
      } else {
        const user = userMap.get(record.login);
        user.hours += record.hrs_total || 0;
        user.caseUnits += record.case_unit_total || 0;
        user.caseUph = record.case_uph_total || 0; // Usar el último valor
        user.eachUnits += record.each_unit_total || 0;
        user.eachUph = record.each_uph_total || 0; // Usar el último valor
        user.upb = record.unit_box || 0;
      }
    });

    const usersWithData = Array.from(userMap.values()).filter((user) => {
      return (user.hours || 0) > 0 || (user.caseUnits || 0) > 0 || (user.eachUnits || 0) > 0;
    });

    // Agregar propiedades para ordenamiento
    usersWithData.forEach((user) => {
      user.combinedUph = user.hours > 0 ? ((user.caseUnits + user.eachUnits) / user.hours) : 0;
      user.combinedHours = user.hours;
      user.combinedUnits = user.caseUnits + user.eachUnits;
    });

    // Aplicar filtro de rotación
    const filteredUsers = this.filterUsersByRotation(usersWithData);

    // Aplicar ordenamiento
    const sortedUsers = this.sortUsers(filteredUsers);

    // Renderizar filas
    sortedUsers.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-decant-tsi">${this.formatReceiveValue(user.hours)}</td>
        <td class="cell-decant-tsi">${this.formatReceiveInteger(user.caseUnits)}</td>
        <td class="cell-decant-tsi"><strong>${this.formatReceiveValue(user.caseUph)}</strong></td>
        <td class="cell-decant-tsi">${this.formatReceiveInteger(user.eachUnits)}</td>
        <td class="cell-decant-tsi"><strong>${this.formatReceiveValue(user.eachUph)}</strong></td>
        <td class="cell-decant-tsi">${this.formatReceiveValue(user.upb)}</td>
      `;
      tbody.appendChild(row);
    });

    if (usersWithData.length === 0) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla Decant PID (naranja)
   */
  renderDecantPIDTable(thead, tbody) {
    console.log("📦 Renderizando tabla Decant PID");

    if (!this.receiveData || !this.receiveData.receive_decant_pid) {
      console.error("❌ No hay datos de receive_decant_pid disponibles");
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      if (thead) thead.innerHTML = "";
      return;
    }

    // Crear header
    thead.innerHTML = `
      <tr>
        <th class="header-login">Login</th>
        <th class="sub-header header-decant-pid">Horas</th>
        <th class="sub-header header-decant-pid">Case Units</th>
        <th class="sub-header header-decant-pid">Case UPH</th>
        <th class="sub-header header-decant-pid">Each Units</th>
        <th class="sub-header header-decant-pid">Each UPH</th>
        <th class="sub-header header-decant-pid">UPB</th>
      </tr>
    `;

    // Agrupar por usuario
    const userMap = new Map();
    this.receiveData.receive_decant_pid.forEach((record) => {
      if (!record.login) return;
      if (!userMap.has(record.login)) {
        userMap.set(record.login, {
          login: record.login,
          hours: record.hrs_total || 0,
          caseUnits: record.case_unit_total || 0,
          caseUph: record.case_uph_total || 0,
          eachUnits: record.each_unit_total || 0,
          eachUph: record.each_uph_total || 0,
          upb: record.unit_box || 0,
        });
      } else {
        const user = userMap.get(record.login);
        user.hours += record.hrs_total || 0;
        user.caseUnits += record.case_unit_total || 0;
        user.caseUph = record.case_uph_total || 0; // Usar el último valor
        user.eachUnits += record.each_unit_total || 0;
        user.eachUph = record.each_uph_total || 0; // Usar el último valor
        user.upb = record.unit_box || 0;
      }
    });

    const usersWithData = Array.from(userMap.values()).filter((user) => {
      return (user.hours || 0) > 0 || (user.caseUnits || 0) > 0 || (user.eachUnits || 0) > 0;
    });

    // Agregar propiedades para ordenamiento
    usersWithData.forEach((user) => {
      user.combinedUph = user.hours > 0 ? ((user.caseUnits + user.eachUnits) / user.hours) : 0;
      user.combinedHours = user.hours;
      user.combinedUnits = user.caseUnits + user.eachUnits;
    });

    // Aplicar filtro de rotación
    const filteredUsers = this.filterUsersByRotation(usersWithData);

    // Aplicar ordenamiento
    const sortedUsers = this.sortUsers(filteredUsers);

    // Renderizar filas
    sortedUsers.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-decant-pid">${this.formatReceiveValue(user.hours)}</td>
        <td class="cell-decant-pid">${this.formatReceiveInteger(user.caseUnits)}</td>
        <td class="cell-decant-pid"><strong>${this.formatReceiveValue(user.caseUph)}</strong></td>
        <td class="cell-decant-pid">${this.formatReceiveInteger(user.eachUnits)}</td>
        <td class="cell-decant-pid"><strong>${this.formatReceiveValue(user.eachUph)}</strong></td>
        <td class="cell-decant-pid">${this.formatReceiveValue(user.upb)}</td>
      `;
      tbody.appendChild(row);
    });

    if (usersWithData.length === 0) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla Non-Con (receive_each)
   */
  renderNonConTable(thead, tbody) {
    console.log("📦 Renderizando tabla Non-Con");

    if (!this.receiveData || !this.receiveData.receive_each) {
      console.error("❌ No hay datos de receive_each disponibles");
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      if (thead) thead.innerHTML = "";
      return;
    }

    // Crear header
    thead.innerHTML = `
      <tr>
        <th class="header-login">Login</th>
        <th class="sub-header header-non-con">Horas</th>
        <th class="sub-header header-non-con">Case Units</th>
        <th class="sub-header header-non-con">Case UPH</th>
        <th class="sub-header header-non-con">Each Units</th>
        <th class="sub-header header-non-con">Each UPH</th>
        <th class="sub-header header-non-con">UPB</th>
      </tr>
    `;

    // Agrupar por usuario
    const userMap = new Map();
    this.receiveData.receive_each.forEach((record) => {
      if (!record.login) return;
      if (!userMap.has(record.login)) {
        userMap.set(record.login, {
          login: record.login,
          hours: record.hrs_total || 0,
          caseUnits: record.job_unit_total || 0, // Usar job_unit_total
          caseUph: record.job_uph_total || 0, // Usar job_uph_total
          eachUnits: record.each_unit_total || 0,
          eachUph: record.each_uph_total || 0,
          upb: record.unit_box || 0,
        });
      } else {
        const user = userMap.get(record.login);
        user.hours += record.hrs_total || 0;
        user.caseUnits += record.job_unit_total || 0;
        user.caseUph = record.job_uph_total || 0; // Usar el último valor
        user.eachUnits += record.each_unit_total || 0;
        user.eachUph = record.each_uph_total || 0; // Usar el último valor
        user.upb = record.unit_box || 0;
      }
    });

    const usersWithData = Array.from(userMap.values()).filter((user) => {
      return (user.hours || 0) > 0 || (user.caseUnits || 0) > 0 || (user.eachUnits || 0) > 0;
    });

    // Agregar propiedades para ordenamiento
    usersWithData.forEach((user) => {
      user.combinedUph = user.hours > 0 ? ((user.caseUnits + user.eachUnits) / user.hours) : 0;
      user.combinedHours = user.hours;
      user.combinedUnits = user.caseUnits + user.eachUnits;
    });

    // Aplicar filtro de rotación
    const filteredUsers = this.filterUsersByRotation(usersWithData);

    // Aplicar ordenamiento
    const sortedUsers = this.sortUsers(filteredUsers);

    // Renderizar filas
    sortedUsers.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-non-con">${this.formatReceiveValue(user.hours)}</td>
        <td class="cell-non-con">${this.formatReceiveInteger(user.caseUnits)}</td>
        <td class="cell-non-con"><strong>${this.formatReceiveValue(user.caseUph)}</strong></td>
        <td class="cell-non-con">${this.formatReceiveInteger(user.eachUnits)}</td>
        <td class="cell-non-con"><strong>${this.formatReceiveValue(user.eachUph)}</strong></td>
        <td class="cell-non-con">${this.formatReceiveValue(user.upb)}</td>
      `;
      tbody.appendChild(row);
    });

    if (usersWithData.length === 0) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla PrEditor (receive_321)
   */
  renderPrEditorTable(thead, tbody) {
    console.log("📦 Renderizando tabla PrEditor");

    if (!this.receiveData || !this.receiveData.receive_321) {
      console.error("❌ No hay datos de receive_321 disponibles");
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      if (thead) thead.innerHTML = "";
      return;
    }

    // Crear header
    thead.innerHTML = `
      <tr>
        <th class="header-login">Login</th>
        <th class="sub-header header-preditor">Horas</th>
        <th class="sub-header header-preditor">Case Units</th>
        <th class="sub-header header-preditor">Case UPH</th>
        <th class="sub-header header-preditor">Each Units</th>
        <th class="sub-header header-preditor">Each UPH</th>
        <th class="sub-header header-preditor">UPB</th>
      </tr>
    `;

    // Agrupar por usuario
    const userMap = new Map();
    this.receiveData.receive_321.forEach((record) => {
      if (!record.login) return;
      if (!userMap.has(record.login)) {
        userMap.set(record.login, {
          login: record.login,
          hours: record.hrs_total || 0,
          caseUnits: record.case_unit_total || 0,
          caseUph: record.case_uph_total || 0,
          eachUnits: record.each_unit_total || 0,
          eachUph: record.each_uph_total || 0,
          upb: record.unit_box || 0,
        });
      } else {
        const user = userMap.get(record.login);
        user.hours += record.hrs_total || 0;
        user.caseUnits += record.case_unit_total || 0;
        user.caseUph = record.case_uph_total || 0; // Usar el último valor
        user.eachUnits += record.each_unit_total || 0;
        user.eachUph = record.each_uph_total || 0; // Usar el último valor
        user.upb = record.unit_box || 0;
      }
    });

    const usersWithData = Array.from(userMap.values()).filter((user) => {
      return (user.hours || 0) > 0 || (user.caseUnits || 0) > 0 || (user.eachUnits || 0) > 0;
    });

    // Agregar propiedades para ordenamiento
    usersWithData.forEach((user) => {
      user.combinedUph = user.hours > 0 ? ((user.caseUnits + user.eachUnits) / user.hours) : 0;
      user.combinedHours = user.hours;
      user.combinedUnits = user.caseUnits + user.eachUnits;
    });

    // Aplicar filtro de rotación
    const filteredUsers = this.filterUsersByRotation(usersWithData);

    // Aplicar ordenamiento
    const sortedUsers = this.sortUsers(filteredUsers);

    // Renderizar filas
    sortedUsers.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-preditor">${this.formatReceiveValue(user.hours)}</td>
        <td class="cell-preditor">${this.formatReceiveInteger(user.caseUnits)}</td>
        <td class="cell-preditor"><strong>${this.formatReceiveValue(user.caseUph)}</strong></td>
        <td class="cell-preditor">${this.formatReceiveInteger(user.eachUnits)}</td>
        <td class="cell-preditor"><strong>${this.formatReceiveValue(user.eachUph)}</strong></td>
        <td class="cell-preditor">${this.formatReceiveValue(user.upb)}</td>
      `;
      tbody.appendChild(row);
    });

    if (usersWithData.length === 0) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla Prep (receive_prep)
   */
  renderPrepTable(thead, tbody) {
    console.log("📦 Renderizando tabla Prep");

    if (!this.receiveData || !this.receiveData.receive_prep) {
      console.error("❌ No hay datos de receive_prep disponibles");
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      if (thead) thead.innerHTML = "";
      return;
    }

    // Crear header
    thead.innerHTML = `
      <tr>
        <th class="header-login">Login</th>
        <th class="sub-header header-prep">Horas</th>
        <th class="sub-header header-prep">Case Units</th>
        <th class="sub-header header-prep">Case UPH</th>
        <th class="sub-header header-prep">Each Units</th>
        <th class="sub-header header-prep">Each UPH</th>
        <th class="sub-header header-prep">UPB</th>
      </tr>
    `;

    // Agrupar por usuario
    const userMap = new Map();
    this.receiveData.receive_prep.forEach((record) => {
      if (!record.login) return;
      if (!userMap.has(record.login)) {
        userMap.set(record.login, {
          login: record.login,
          hours: record.hrs_total || 0,
          caseUnits: record.eachreceived_job_unit || 0, // job_unit pero se muestra como Case
          caseUph: record.eachreceived_job_uph || 0, // job_uph pero se muestra como Case
          eachUnits: record.eachreceived_each_total_unit || 0,
          eachUph: record.eachreceived_each_total_uph || 0,
          upb: record.unit_box || 0,
        });
      } else {
        const user = userMap.get(record.login);
        user.hours += record.hrs_total || 0;
        user.caseUnits += record.eachreceived_job_unit || 0;
        user.caseUph = record.eachreceived_job_uph || 0; // Usar el último valor
        user.eachUnits += record.eachreceived_each_total_unit || 0;
        user.eachUph = record.eachreceived_each_total_uph || 0; // Usar el último valor
        user.upb = record.unit_box || 0;
      }
    });

    const usersWithData = Array.from(userMap.values()).filter((user) => {
      return (user.hours || 0) > 0 || (user.caseUnits || 0) > 0 || (user.eachUnits || 0) > 0;
    });

    // Agregar propiedades para ordenamiento
    usersWithData.forEach((user) => {
      user.combinedUph = user.hours > 0 ? ((user.caseUnits + user.eachUnits) / user.hours) : 0;
      user.combinedHours = user.hours;
      user.combinedUnits = user.caseUnits + user.eachUnits;
    });

    // Aplicar filtro de rotación
    const filteredUsers = this.filterUsersByRotation(usersWithData);

    // Aplicar ordenamiento
    const sortedUsers = this.sortUsers(filteredUsers);

    // Renderizar filas
    sortedUsers.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-prep">${this.formatReceiveValue(user.hours)}</td>
        <td class="cell-prep">${this.formatReceiveInteger(user.caseUnits)}</td>
        <td class="cell-prep"><strong>${this.formatReceiveValue(user.caseUph)}</strong></td>
        <td class="cell-prep">${this.formatReceiveInteger(user.eachUnits)}</td>
        <td class="cell-prep"><strong>${this.formatReceiveValue(user.eachUph)}</strong></td>
        <td class="cell-prep">${this.formatReceiveValue(user.upb)}</td>
      `;
      tbody.appendChild(row);
    });

    if (usersWithData.length === 0) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla Pallet Receive (receive_pallet)
   */
  renderPalletReceiveTable(thead, tbody) {
    console.log("📦 Renderizando tabla Pallet Receive");

    if (!this.receiveData || !this.receiveData.receive_pallet) {
      console.error("❌ No hay datos de receive_pallet disponibles");
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
      if (thead) thead.innerHTML = "";
      return;
    }

    // Crear header
    thead.innerHTML = `
      <tr>
        <th class="header-login">Login</th>
        <th class="sub-header header-pallet-receive">Horas</th>
        <th class="sub-header header-pallet-receive">Each Units</th>
        <th class="sub-header header-pallet-receive">Each UPH</th>
        <th class="sub-header header-pallet-receive">Qty Pallets</th>
        <th class="sub-header header-pallet-receive">Pallets/Hour</th>
        <th class="sub-header header-pallet-receive">Units/Pallet</th>
      </tr>
    `;

    // Agrupar por usuario
    const userMap = new Map();
    this.receiveData.receive_pallet.forEach((record) => {
      if (!record.login) return;
      if (!userMap.has(record.login)) {
        userMap.set(record.login, {
          login: record.login,
          hours: record.hrs_total || 0,
          eachUnits: record.each_unit_total || 0,
          eachUph: record.each_uph_total || 0,
          palletUnits: record.pallet_unit_total || 0,
          palletUph: record.pallet_uph_total || 0,
          upp: record.unit_pallet || 0,
        });
      } else {
        const user = userMap.get(record.login);
        user.hours += record.hrs_total || 0;
        user.eachUnits += record.each_unit_total || 0;
        user.eachUph = record.each_uph_total || 0; // Usar el último valor
        user.palletUnits += record.pallet_unit_total || 0;
        user.palletUph = record.pallet_uph_total || 0; // Usar el último valor
        user.upp = record.unit_pallet || 0;
      }
    });

    const usersWithData = Array.from(userMap.values()).filter((user) => {
      return (user.hours || 0) > 0 || (user.eachUnits || 0) > 0 || (user.palletUnits || 0) > 0;
    });

    // Agregar propiedades para ordenamiento
    usersWithData.forEach((user) => {
      user.combinedUph = user.hours > 0 ? ((user.eachUnits + user.palletUnits) / user.hours) : 0;
      user.combinedHours = user.hours;
      user.combinedUnits = user.eachUnits + user.palletUnits;
    });

    // Aplicar filtro de rotación
    const filteredUsers = this.filterUsersByRotation(usersWithData);

    // Aplicar ordenamiento
    const sortedUsers = this.sortUsers(filteredUsers);

    // Renderizar filas
    sortedUsers.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-login"><strong>${user.login}</strong></td>
        <td class="cell-pallet-receive">${this.formatReceiveValue(user.hours)}</td>
        <td class="cell-pallet-receive">${this.formatReceiveInteger(user.eachUnits)}</td>
        <td class="cell-pallet-receive"><strong>${this.formatReceiveValue(user.eachUph)}</strong></td>
        <td class="cell-pallet-receive">${this.formatReceiveInteger(user.palletUnits)}</td>
        <td class="cell-pallet-receive"><strong>${this.formatReceiveValue(user.palletUph)}</strong></td>
        <td class="cell-pallet-receive">${this.formatReceiveValue(user.upp)}</td>
      `;
      tbody.appendChild(row);
    });

    if (usersWithData.length === 0) {
      const dateLabel = this.dateInfo[this.currentDateFilter === "today" ? "today" : 
                                      this.currentDateFilter === "yesterday" ? "yesterday" : "beforeYesterday"]?.label || this.currentDate;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              No hay datos disponibles
            </div>
            <div style="font-size: 0.9rem; color: #6b7280;">
              Fecha seleccionada: ${dateLabel}
            </div>
          </td>
        </tr>
      `;
    }
  }
}

// Variable global para mantener la instancia del controlador
window.userActivityController = null;

// Función de inicialización
function initUserActivity() {
  console.log("🎬 Inicializando UserActivityController...");

  // Si ya existe una instancia, no crear otra
  if (window.userActivityController) {
    console.log("♻️ Reinicializando UserActivityController existente");
    window.userActivityController.init();
    return;
  }

  // Crear nueva instancia
  window.userActivityController = new UserActivityController();
  console.log("✅ UserActivityController creado");
}

// Inicializar cuando se carga el script por primera vez
initUserActivity();

// También inicializar cuando se dispara el evento custom de view-loaded
document.addEventListener("view:loaded", (e) => {
  if (e.detail && e.detail.view === "user-activity") {
    console.log("🔄 Vista user-activity cargada, reinicializando...");
    initUserActivity();
  }
});
