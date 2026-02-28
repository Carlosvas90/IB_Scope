/**
 * User History Controller
 * Maneja la lógica de análisis histórico de usuarios
 */

class UserHistoryController {
  constructor() {
    this.data = {
      users: [],
      summary: {
        period: "Últimos 30 días",
        analyzedUsers: 0,
        totalStows: 0,
        dailyAverage: 0,
      },
      charts: {
        performanceTrends: null,
        dailyActivity: null,
        efficiencyDistribution: null,
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 10,
      },
    };
    
    // Datos del índice de usuarios
    this.usersIndex = null;
    this.analyticsPaths = null;

    // Roster (data_paths): logins con employee_status "A" = activos
    this.rosterActiveLogins = new Set();
    
    // Datos de metadata y usuario actual
    this.metadataUsers = null;
    this.currentUserData = null;
    this.currentPeriod = "last_month"; // Por defecto último mes
    this.currentLogin = null;

    // Departamentos: Receive, Stow, Pick, Pack, Shipping (solo se habilitan los que tengan datos)
    this.DEPARTMENTS = [
      { key: "receive", label: "Receive" },
      { key: "each_stow", label: "Stow" },
      { key: "pick", label: "Pick" },
      { key: "pack", label: "Pack" },
      { key: "shipping", label: "Shipping" }
    ];
    this.currentDepartment = "each_stow";

    // Período seleccionado para KPIs de cada bloque Stow (combined, pallet, esfuerzo)
    this.stowKpiPeriod = { combined: "last_month", pallet: "last_month", esfuerzo: "last_month" };
    this.stowChartMetric = { combined: "rate", pallet: "rate", each_stow: "rate", pallet_stow: "rate" };

    // Receive: orden de importancia (datos desde JSON)
    this.RECEIVE_CATEGORIES = [
      { key: "Decant_PID", label: "Decant PID" },
      { key: "Decant_TSI", label: "Decant TSI" },
      { key: "Noncon", label: "Receive Each" },
      { key: "PreEditor", label: "Receive prEditor" },
      { key: "Prep", label: "Prep" },
      { key: "Cubiscan", label: "Cubiscan" },
      { key: "Rcv_Pallet", label: "Receive pallet" }
    ];
    this.receiveKpiPeriod = {}; // período por categoría para KPIs

    // Pick: categorías desde JSON (nombres tipo Pick_Rates.db: Giftwrap, Hotpick, Noncon, Orderpicker, Pallet, SIOC, RF, Teamlift, etc.)
    this.PICK_CATEGORIES = [
      { key: "pick_orderpicker_4300006870_sm", label: "Orderpicker" },
      { key: "pick_sioc_4300024905_smallmedi", label: "SIOC" },
      { key: "pick_pallet_4300008685_smallme", label: "Pallet" },
      { key: "pick_noncon_picking_4300002489_smal", label: "Noncon Picking" },
      { key: "pick_highvelocity_picking_430001272", label: "High Velocity Picking" },
      { key: "pick_rf_4300000184_smallmedium", label: "RF" },
      { key: "pick_rf_singles_4300002523_sma", label: "RF Singles" },
      { key: "pick_teamlift_4300006830_small", label: "Teamlift" },
      { key: "pick_orderpicklowdensityp_430001681", label: "Order Pick Low Density" },
      { key: "pick_giftwrap_picking_4300000707_sm", label: "Giftwrap Picking" },
      { key: "pick_hotpick_4300035090_smallmedium", label: "Hotpick" }
    ];
    this.pickKpiPeriod = {};

    // Pack: categorías desde JSON
    this.PACK_CATEGORIES = [
      { key: "ScanVerify_NonCon", label: "ScanVerify NonCon" },
      { key: "HandTape_Small", label: "HandTape Small" }
    ];
    this.packKpiPeriod = {};

    // Shipping: categorías desde JSON
    this.SHIPPING_CATEGORIES = [
      { key: "shipping_manual_cont_builder_430003505", label: "Manual Cont Builder" },
      { key: "shipping_ship_waterspider_1628282534694", label: "Ship Waterspider" },
      { key: "shipping_container_loader_4300035070_sm", label: "Container Loader" },
      { key: "shipping_fluid_loader_4300016778_smallm", label: "Fluid Loader" }
    ];
    this.shippingKpiPeriod = {};

    this.rankingPeriod = "last_month";

    // Filtros
    this.selectedShift = "";
    this.selectedManager = "";
    this.validUsers = [];
    this.filteredUsers = [];
    
    // Navegación de sugerencias
    this.currentSuggestionIndex = -1;
    this.suggestions = [];

    this.init();
  }

  /**
   * Inicializa el controlador
   */
  async init() {
    console.log("🚀 Inicializando UserHistoryController...");
    this.setupEventListeners();
    await this.loadHistoryIcons();
    
    // Cargar índice de usuarios y roster (activos desde roster.json) en paralelo
    await Promise.all([this.loadUsersIndex(), this.loadRoster()]);

    // Cargar metadata para comparaciones
    await this.loadMetadataUsers();
    
    // Deshabilitar todos los botones inicialmente (hasta que se seleccione un usuario)
    this.disableAllPeriodButtons();
    
    // Luego cargar el resto de datos
    this.loadData();
  }

  /**
   * Carga metadata_users.json para comparaciones globales
   */
  async loadMetadataUsers() {
    console.log("📂 Cargando metadata_users.json desde analytics_paths...");
    
    if (!this.analyticsPaths) {
      console.warn("⚠️ No hay analytics_paths disponibles");
      return;
    }
    
    try {
      let metadataData = null;
      
      for (const analyticsPath of this.analyticsPaths) {
        try {
          const metadataPath = `${analyticsPath}metadata_users.json`;
          console.log("📂 Intentando cargar metadata_users.json desde:", metadataPath);
          
          const result = await window.api.readJson(metadataPath);
          
          if (result.success && result.data) {
            metadataData = result.data;
            console.log("✅ metadata_users.json cargado desde:", metadataPath);
            break;
          }
        } catch (error) {
          console.log(`❌ Error cargando desde ${analyticsPath}:`, error.message);
          continue;
        }
      }
      
      if (metadataData) {
        this.metadataUsers = metadataData;
        console.log("✅ Metadata de usuarios cargado correctamente");
      } else {
        console.warn("⚠️ No se pudo cargar metadata_users.json desde ninguna ruta");
        this.metadataUsers = null;
      }
    } catch (error) {
      console.error("❌ Error cargando metadata_users.json:", error);
      this.metadataUsers = null;
    }
  }

  /**
   * Carga los datos de un usuario específico
   */
  async loadUserData(login) {
    console.log(`📂 Cargando datos del usuario: ${login}`);
    
    if (!this.analyticsPaths) {
      console.warn("⚠️ No hay analytics_paths disponibles");
      return;
    }
    
    try {
      let userData = null;
      
      for (const analyticsPath of this.analyticsPaths) {
        try {
          const userPath = `${analyticsPath}Users/${login}.json`;
          console.log("📂 Intentando cargar desde:", userPath);
          
          const result = await window.api.readJson(userPath);
          
          if (result.success && result.data) {
            userData = result.data;
            console.log("✅ Datos del usuario cargados desde:", userPath);
            break;
          }
        } catch (error) {
          console.log(`❌ Error cargando desde ${analyticsPath}:`, error.message);
          continue;
        }
      }
      
      if (userData) {
        this.currentUserData = userData;
        console.log("✅ Datos del usuario cargados correctamente");
        // Departamentos disponibles y selección por defecto (primero con datos)
        this.updateDepartmentUI();
        this.updatePeriodButtons();
        this.updateVisualization();
      } else {
        console.warn(`⚠️ No se pudo cargar datos del usuario ${login}`);
        this.currentUserData = null;
        // Deshabilitar todos los botones si no hay datos
        this.disableAllPeriodButtons();
        if (window.showToast) {
          window.showToast(`No se encontraron datos para el usuario ${login}`, "error");
        }
      }
    } catch (error) {
      console.error(`❌ Error cargando datos del usuario ${login}:`, error);
      this.currentUserData = null;
    }
  }

  /**
   * Carga los SVG de ActivityScope para User History
   */
  async loadHistoryIcons() {
    /**
     * Carga los SVG de los iconos de User History
     */
    const historyIcons = {
      // Header icons
      'icon-history-header': 'assets/svg/ActivityScope/History.svg',
      'icon-refresh-history': 'assets/svg/ActivityScope/RefreshHistory.svg',
      'icon-export-history': 'assets/svg/ActivityScope/ExportHistory.svg',
      
      // Filter icons
      'icon-filter-advanced': 'assets/svg/ActivityScope/Filter.svg',
      'icon-apply-filter': 'assets/svg/ActivityScope/ApplyFilter.svg',
      
      // Summary and chart icons
      'icon-summary-period': 'assets/svg/ActivityScope/Summary.svg',
      'icon-trends-performance': 'assets/svg/ActivityScope/Trends.svg',
      'icon-chart-trend': 'assets/svg/ActivityScope/ChartTrend.svg',
      'icon-calendar-activity': 'assets/svg/ActivityScope/Calendar.svg',
      'icon-activity-daily': 'assets/svg/ActivityScope/Activity.svg',
      'icon-efficiency-distribution': 'assets/svg/ActivityScope/Efficiency.svg',
      'icon-target-efficiency': 'assets/svg/ActivityScope/Target.svg',
      'icon-history-table': 'assets/svg/ActivityScope/HistoryTable.svg',
      'icon-times-history-modal': 'assets/svg/ActivityScope/Times.svg'
    };
    
    // Verificar que el API esté disponible
    if (!window.api || !window.api.readFile) {
      console.warn('[History Icons] API readFile no disponible');
      return;
    }
    
    // Cargar cada icono
    for (const [iconId, svgPath] of Object.entries(historyIcons)) {
      try {
        const iconElement = document.getElementById(iconId);
        if (!iconElement) {
          // No mostrar warning para iconos que pueden no existir
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
            allGraphicElements.forEach(element => {
              const fillAttr = element.getAttribute('fill');
              if (fillAttr && 
                  fillAttr !== 'none' && 
                  fillAttr !== 'currentColor' && 
                  fillAttr !== 'inherit' && 
                  !fillAttr.startsWith('url')) {
                // Aplicar como estilo inline para proteger contra CSS externo
                element.style.setProperty('fill', fillAttr, 'important');
              }
            });
          }
          
          console.log(`[History Icons] ✓ Cargado: ${iconId}`);
        } else {
          console.warn(`[History Icons] ✗ Error cargando ${svgPath}:`, result.error);
        }
      } catch (error) {
        console.error(`[History Icons] Error cargando ${iconId}:`, error);
      }
    }
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Botón de actualizar historial
    const refreshBtn = document.getElementById("refresh-history");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshData());
    }

    // Filtros
    const shiftFilter = document.getElementById("history-shift-filter");
    if (shiftFilter) {
      shiftFilter.addEventListener("change", (e) => this.onShiftChange(e.target.value));
    }

    const managerFilter = document.getElementById("history-manager-filter");
    if (managerFilter) {
      managerFilter.addEventListener("change", (e) => this.onManagerChange(e.target.value));
    }

    // Select de usuarios
    const userSelect = document.getElementById("history-user-select");
    if (userSelect) {
      userSelect.addEventListener("change", (e) => {
        if (e.target.value) {
          this.selectUser(e.target.value);
        }
      });
    }

    // Checkbox "Solo Activos": al cambiar, reaplicar búsqueda si hay texto
    const onlyActiveCheck = document.getElementById("history-only-active");
    if (onlyActiveCheck) {
      onlyActiveCheck.addEventListener("change", () => {
        this.updateFilteredUsers();
        this.updateUserSelect();
        this.updateManagerFilter();
        const userSearch = document.getElementById("history-user-search");
        if (userSearch?.value?.trim().length >= 2) {
          this.onUserSearch(userSearch.value.trim());
        }
      });
    }

    // Búsqueda por login (por defecto solo activos si el checkbox está marcado)
    const userSearch = document.getElementById("history-user-search");
    if (userSearch) {
      userSearch.addEventListener("input", (e) => {
        this.currentSuggestionIndex = -1;
        this.onUserSearch(e.target.value);
      });
      userSearch.addEventListener("focus", () => {
        if (userSearch.value.length >= 2) {
          this.onUserSearch(userSearch.value);
        }
      });
      userSearch.addEventListener("blur", () => {
        setTimeout(() => this.hideSuggestions(), 200);
      });
      userSearch.addEventListener("keydown", (e) => {
        const suggestionsEl = document.getElementById("user-search-suggestions");
        const visibleSuggestions = suggestionsEl && suggestionsEl.style.display !== "none" 
          ? Array.from(suggestionsEl.querySelectorAll(".suggestion-item"))
          : [];
        
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (visibleSuggestions.length > 0) {
            this.currentSuggestionIndex = Math.min(
              this.currentSuggestionIndex + 1,
              visibleSuggestions.length - 1
            );
            this.highlightSuggestion(visibleSuggestions, this.currentSuggestionIndex);
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (visibleSuggestions.length > 0) {
            this.currentSuggestionIndex = Math.max(this.currentSuggestionIndex - 1, 0);
            this.highlightSuggestion(visibleSuggestions, this.currentSuggestionIndex);
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          const login = userSearch.value.trim();
          if (login) {
            // Si hay una sugerencia seleccionada, usar esa
            if (this.currentSuggestionIndex >= 0 && this.suggestions[this.currentSuggestionIndex]) {
              const selectedUser = this.suggestions[this.currentSuggestionIndex];
              this.selectUser(selectedUser.login);
              this.hideSuggestions();
              if (userSelect) userSelect.value = selectedUser.login;
            } else {
              // Buscar en TODOS los usuarios (no solo en filteredUsers)
              const allUsers = this.usersIndex?.users || [];
              const foundUser = allUsers.find(u => u.login.toLowerCase() === login.toLowerCase());
              if (foundUser) {
                this.selectUser(foundUser.login);
                this.hideSuggestions();
                if (userSelect) userSelect.value = foundUser.login;
              } else {
                if (window.showToast) {
                  window.showToast(`Usuario ${login} no encontrado`, "error");
                }
              }
            }
          }
        } else if (e.key === "Escape") {
          this.hideSuggestions();
          this.currentSuggestionIndex = -1;
        }
      });
    }

    // Selector de período (tanto .period-btn como .period-btn-compact)
    const periodButtons = document.querySelectorAll(".period-btn, .period-btn-compact");
    periodButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (btn.disabled || btn.classList.contains("disabled") || btn.classList.contains("no-data")) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const period = e.target.dataset.period;
        this.selectPeriod(period);
      });
    });

    // Botones de departamento (Receive, Stow, Pick, Pack, Shipping)
    document.querySelectorAll(".department-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (btn.disabled) return;
        const key = btn.dataset.department;
        if (key) this.selectDepartment(key);
      });
    });
  }

  /**
   * Carga los datos iniciales
   */
  async loadData() {
    console.log("📊 Cargando datos de User History...");

    try {
      // Asegurar que el índice de usuarios esté cargado
      if (!this.usersIndex) {
        console.log("📂 Índice de usuarios no cargado, cargándolo ahora...");
        await this.loadUsersIndex();
      }
      
      // Cargar los datos del historial
      await this.loadHistoryData();
      
      // Actualizar la UI
      this.updateUI();
      console.log("✅ Datos cargados correctamente");
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
    }
  }

  /**
   * Indica si un empleado del roster está activo (employee_status "A" = activo).
   * Misma lógica que Skill Matrix: A = activo; L/T/I/B/P u otros = inactivo.
   */
  isRosterEmployeeActive(empleado) {
    const f = (v) => v === false || v === "false" || (typeof v === "string" && v.trim().toLowerCase() === "no");
    if (f(empleado.activo) || f(empleado.Active) || f(empleado.is_active)) return false;
    const status =
      empleado.employee_status ??
      empleado.status ??
      empleado["Employee Status"] ??
      empleado.Estado ??
      empleado.estado;
    if (status != null && typeof status === "string") {
      const s = status.trim();
      const sl = s.toLowerCase();
      if (s.length <= 2) {
        if (sl === "a") return true;
        if (["l", "t", "i", "b", "p"].includes(sl)) return false;
      }
      if (["inactive", "inactivo", "leave", "baja", "offboarded", "terminated"].includes(sl)) return false;
    }
    return true;
  }

  /**
   * Carga roster.json desde data_paths y construye el set de logins activos (employee_status "A").
   */
  async loadRoster() {
    console.log("📂 Cargando roster.json desde data_paths (activos = employee_status A)...");
    this.rosterActiveLogins = new Set();
    try {
      const config = await window.api.getConfig();
      if (!config || !config.data_paths || !config.data_paths.length) {
        console.warn("⚠️ No hay data_paths en config, no se puede cargar roster");
        return;
      }
      for (const dataPath of config.data_paths) {
        try {
          const path = dataPath.endsWith("/") || dataPath.endsWith("\\") ? dataPath + "roster.json" : dataPath + (dataPath.includes("\\") ? "\\" : "/") + "roster.json";
          const result = await window.api.readJson(path);
          if (result.success && result.data) {
            const arr = Array.isArray(result.data.roster) ? result.data.roster : (Array.isArray(result.data) ? result.data : []);
            arr.forEach((emp) => {
              if (emp && emp.login && this.isRosterEmployeeActive(emp)) {
                this.rosterActiveLogins.add(emp.login);
              }
            });
            console.log("✅ Roster cargado: " + this.rosterActiveLogins.size + " logins activos (employee_status A) desde " + path);
            return;
          }
        } catch (e) {
          console.log("❌ Roster no encontrado en " + dataPath + ":", e.message);
          continue;
        }
      }
      console.warn("⚠️ No se pudo cargar roster.json desde ninguna data_path");
    } catch (error) {
      console.error("❌ Error cargando roster:", error);
    }
  }

  /**
   * Comprueba si un usuario del índice tiene información mínima para mostrarse
   * (nombre, turno, manager y employee_status no vacíos)
   */
  isUserWithValidInfo(user) {
    if (!user || !user.login) return false;
    const name = user.name != null ? String(user.name).trim() : "";
    const shift = user.shift != null ? String(user.shift).trim() : "";
    const manager = user.manager != null ? String(user.manager).trim() : "";
    const status = user.employee_status != null ? String(user.employee_status).trim() : "";
    return name !== "" && shift !== "" && manager !== "" && status !== "";
  }

  /**
   * Indica si el usuario se considera activo (para "Solo Activos").
   * Prioridad: roster si está cargado; si no, employee_status "A" en users_index.
   */
  isUserActive(user) {
    if (!user || !user.login) return false;
    if (this.rosterActiveLogins && this.rosterActiveLogins.size > 0) {
      return this.rosterActiveLogins.has(user.login);
    }
    const s = user.employee_status != null ? String(user.employee_status).trim().toUpperCase() : "";
    return s === "A";
  }

  /**
   * Carga el archivo users_index.json desde analytics_paths
   */
  async loadUsersIndex() {
    console.log("📂 Cargando users_index.json desde analytics_paths...");
    
    try {
      const config = await window.api.getConfig();
      if (!config || !config.analytics_paths) {
        throw new Error("No se encontró configuración de analytics_paths");
      }
      
      this.analyticsPaths = config.analytics_paths;
      console.log("📂 Analytics paths encontrados:", this.analyticsPaths);
      
      let usersIndexData = null;
      
      // Intentar cargar desde cada ruta de analytics_paths
      for (const analyticsPath of this.analyticsPaths) {
        try {
          const usersIndexPath = `${analyticsPath}users_index.json`;
          console.log("📂 Intentando cargar users_index.json desde:", usersIndexPath);
          
          const result = await window.api.readJson(usersIndexPath);
          
          if (result.success && result.data) {
            usersIndexData = result.data;
            console.log("✅ users_index.json cargado desde:", usersIndexPath);
            console.log("📊 Datos del índice:", {
              total_users: usersIndexData.total_users,
              users_with_recent_activity: usersIndexData.users_with_recent_activity,
              available_managers: usersIndexData.available_managers?.length || 0,
              available_shifts: usersIndexData.available_shifts?.length || 0
            });
            break;
          }
        } catch (error) {
          console.log(`❌ Error cargando desde ${analyticsPath}:`, error.message);
          continue;
        }
      }
      
      if (usersIndexData) {
        this.usersIndex = usersIndexData;
        console.log("✅ Índice de usuarios cargado correctamente");
        
        // Poblar filtros con los datos cargados
        this.populateFilters();
      } else {
        console.warn("⚠️ No se pudo cargar users_index.json desde ninguna ruta");
        this.usersIndex = null;
      }
    } catch (error) {
      console.error("❌ Error cargando users_index.json:", error);
      this.usersIndex = null;
    }
  }

  /**
   * Pobla los filtros con los datos del índice de usuarios
   */
  populateFilters() {
    if (!this.usersIndex) {
      console.warn("⚠️ No hay datos de índice de usuarios para poblar filtros");
      return;
    }
    
    console.log("🔧 Poblando filtros con datos del índice...");
    
    // Poblar filtro de turnos
    const shiftFilter = document.getElementById("history-shift-filter");
    if (shiftFilter && this.usersIndex.available_shifts) {
      shiftFilter.innerHTML = '<option value="">Todos los turnos</option>';
      this.usersIndex.available_shifts.forEach(shift => {
        const option = document.createElement("option");
        option.value = shift;
        option.textContent = shift;
        shiftFilter.appendChild(option);
      });
      console.log(`✅ Filtro de turnos poblado con ${this.usersIndex.available_shifts.length} turnos`);
    }
    
    // Poblar filtro de managers
    const managerFilter = document.getElementById("history-manager-filter");
    if (managerFilter && this.usersIndex.available_managers) {
      managerFilter.innerHTML = '<option value="">Todos los managers</option>';
      this.usersIndex.available_managers.forEach(manager => {
        const option = document.createElement("option");
        option.value = manager;
        option.textContent = manager;
        managerFilter.appendChild(option);
      });
      console.log(`✅ Filtro de managers poblado con ${this.usersIndex.available_managers.length} managers`);
    }
    
    // Solo usuarios con información válida (nombre, turno, manager, employee_status no vacíos)
    this.validUsers = (this.usersIndex.users || []).filter(u => this.isUserWithValidInfo(u));
    this.updateFilteredUsers();
    
    // Poblar select de usuarios
    this.updateUserSelect();
  }

  /**
   * Actualiza el select de usuarios con los usuarios filtrados
   */
  updateUserSelect() {
    const userSelect = document.getElementById("history-user-select");
    if (!userSelect) return;
    
    userSelect.innerHTML = '<option value="">-- Selecciona un usuario --</option>';
    
    // Ordenar usuarios por nombre
    const sortedUsers = [...this.filteredUsers].sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    
    sortedUsers.forEach(user => {
      const option = document.createElement("option");
      option.value = user.login;
      option.textContent = `${user.name} (${user.login}) - ${user.shift || 'N/A'} - ${user.manager || 'N/A'}`;
      userSelect.appendChild(option);
    });
    
    console.log(`✅ Select de usuarios actualizado con ${sortedUsers.length} usuarios`);
  }

  /**
   * Maneja el cambio de turno
   */
  onShiftChange(shift) {
    this.selectedShift = shift;
    this.updateFilteredUsers();
    this.updateManagerFilter();
    this.updateUserSelect();
  }

  /**
   * Maneja el cambio de manager
   */
  onManagerChange(manager) {
    this.selectedManager = manager;
    this.updateFilteredUsers();
    this.updateUserSelect();
  }

  /**
   * Actualiza la lista de usuarios filtrados (validUsers + Solo Activos + turno/manager)
   */
  updateFilteredUsers() {
    let base = this.validUsers || (this.usersIndex?.users || []).filter(u => this.isUserWithValidInfo(u));
    if (!base.length) {
      this.filteredUsers = [];
      return;
    }
    const onlyActive = document.getElementById("history-only-active")?.checked !== false;
    if (onlyActive) {
      base = base.filter(u => this.isUserActive(u));
    }
    this.filteredUsers = base.filter(user => {
      if (this.selectedShift && user.shift !== this.selectedShift) return false;
      if (this.selectedManager && user.manager !== this.selectedManager) return false;
      return true;
    });
    console.log(`🔍 Usuarios filtrados: ${this.filteredUsers.length}${onlyActive ? " (solo activos)" : ""}`);
  }

  /**
   * Actualiza el filtro de managers según turno y Solo Activos
   */
  updateManagerFilter() {
    let base = this.validUsers || this.usersIndex?.users || [];
    if (!base.length) return;
    const onlyActive = document.getElementById("history-only-active")?.checked !== false;
    if (onlyActive) base = base.filter(u => this.isUserActive(u));
    
    const managerFilter = document.getElementById("history-manager-filter");
    if (!managerFilter) return;
    
    const managers = new Set();
    base.forEach(user => {
      if (!this.selectedShift || user.shift === this.selectedShift) {
        if (user.manager) managers.add(user.manager);
      }
    });
    
    managerFilter.innerHTML = '<option value="">Todos los managers</option>';
    Array.from(managers).sort().forEach(manager => {
      const option = document.createElement("option");
      option.value = manager;
      option.textContent = manager;
      if (manager === this.selectedManager) option.selected = true;
      managerFilter.appendChild(option);
    });
  }

  /**
   * Maneja la búsqueda de usuario (busca en TODOS los usuarios o solo activos según checkbox)
   */
  onUserSearch(query) {
    if (!query || query.length < 2) {
      this.hideSuggestions();
      this.suggestions = [];
      return;
    }

    const onlyActive = document.getElementById("history-only-active")?.checked !== false;
    let pool = (this.usersIndex?.users || []).filter(u => this.isUserWithValidInfo(u));
    if (onlyActive) {
      pool = pool.filter(u => this.isUserActive(u));
    }

    const filtered = pool.filter(user => {
      const loginMatch = user.login.toLowerCase().includes(query.toLowerCase());
      const nameMatch = user.name?.toLowerCase().includes(query.toLowerCase());
      return loginMatch || nameMatch;
    }).slice(0, 10);

    this.suggestions = filtered;
    this.showSuggestions(filtered, query);
  }
  
  /**
   * Resalta una sugerencia específica
   */
  highlightSuggestion(suggestions, index) {
    suggestions.forEach((item, i) => {
      if (i === index) {
        item.classList.add("suggestion-highlighted");
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        item.classList.remove("suggestion-highlighted");
      }
    });
  }

  /**
   * Muestra sugerencias de búsqueda
   */
  showSuggestions(users = null, query = "") {
    const suggestionsEl = document.getElementById("user-search-suggestions");
    if (!suggestionsEl) return;
    
    if (!users || users.length === 0) {
      suggestionsEl.style.display = "none";
      return;
    }
    
    suggestionsEl.innerHTML = "";
    users.forEach((user, index) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      // Orden: Login primero, luego nombre
      item.innerHTML = `
        <strong>${user.login}</strong> - ${user.name || "N/A"}
        <small>${user.shift || "N/A"} | ${user.manager || "N/A"}</small>
      `;
      item.addEventListener("click", () => {
        document.getElementById("history-user-search").value = user.login;
        this.selectUser(user.login);
        this.hideSuggestions();
      });
      item.addEventListener("mouseenter", () => {
        this.currentSuggestionIndex = index;
        this.highlightSuggestion(Array.from(suggestionsEl.querySelectorAll(".suggestion-item")), index);
      });
      suggestionsEl.appendChild(item);
    });
    
    suggestionsEl.style.display = "block";
    this.currentSuggestionIndex = -1; // Reset al mostrar nuevas sugerencias
  }

  /**
   * Oculta las sugerencias
   */
  hideSuggestions() {
    const suggestionsEl = document.getElementById("user-search-suggestions");
    if (suggestionsEl) {
      suggestionsEl.style.display = "none";
    }
  }

  /**
   * Selecciona un usuario y carga sus datos
   */
  async selectUser(login) {
    if (!login) return;
    
    this.currentLogin = login;
    const user = this.usersIndex?.users?.find(u => u.login === login);
    
    if (user) {
      // Mostrar contenedor principal
      const userContainer = document.getElementById("selected-user-container");
      if (userContainer) {
        userContainer.style.display = "grid";
      }
      
      // Mostrar información del usuario con foto (similar a user-activity)
      const userInfoCard = document.getElementById("selected-user-info-card");
      if (userInfoCard) {
        userInfoCard.style.display = "flex";
        
        // Actualizar datos en orden: Login, Nombre, Turno, Manager
        const loginEl = document.getElementById("selected-user-login");
        const nameEl = document.getElementById("selected-user-name");
        const shiftEl = document.getElementById("selected-user-shift");
        const managerEl = document.getElementById("selected-user-manager");
        
        if (loginEl) loginEl.textContent = user.login || "-";
        
        // Formatear nombre: "Apellidos, Nombres" -> "Apellidos\nNombres"
        if (nameEl && user.name) {
          const nameParts = user.name.split(",");
          if (nameParts.length === 2) {
            const apellidos = nameParts[0].trim();
            const nombres = nameParts[1].trim();
            nameEl.innerHTML = `<span style="display:block;">${apellidos}</span><span style="display:block;">${nombres}</span>`;
          } else {
            nameEl.textContent = user.name;
          }
        } else if (nameEl) {
          nameEl.textContent = "-";
        }
        
        if (shiftEl) shiftEl.textContent = user.shift || "N/A";
        if (managerEl) managerEl.textContent = user.manager || "N/A";
        
        // Cargar foto del usuario
        this.updateUserPhoto(login);
      }
    }
    
    // Cargar datos del usuario
    await this.loadUserData(login);
    
    this.updateRankingPanel();
    
    // Actualizar el select también
    const userSelect = document.getElementById("history-user-select");
    if (userSelect) {
      userSelect.value = login;
    }
    
    // NO limpiar el campo de búsqueda (mantener el login escrito)
  }
  
  /**
   * Obtiene la URL de la foto del usuario
   */
  getUserPhotoUrl(login) {
    if (!login) return "";
    return `https://internal-cdn.amazon.com/badgephotos.amazon.com/?uid=${login}`;
  }

  /**
   * Actualiza la foto del usuario
   */
  updateUserPhoto(login) {
    const photoContainer = document.getElementById("selected-user-photo");
    if (!photoContainer) return;
    
    const photoUrl = this.getUserPhotoUrl(login);
    photoContainer.innerHTML = `
      <img 
        src="${photoUrl}" 
        alt="${login}" 
        onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem;font-weight:bold;color:white;\\'>${login.substring(0, 2).toUpperCase()}</div>'"
        style="width:100%;height:100%;object-fit:cover;"
      />
    `;
  }

  /**
   * Actualiza las métricas por período (según departamento seleccionado)
   */
  updatePeriodMetrics() {
    if (!this.currentUserData) {
      this.clearPeriodMetrics();
      return;
    }

    const periods = [
      { key: "last_week", label: "week" },
      { key: "last_month", label: "month" },
      { key: "last_3_months", label: "3months" },
      { key: "last_6_months", label: "6months" }
    ];

    periods.forEach(period => {
      const periodData = this.currentUserData[period.key];
      const metrics = this.getDepartmentMetrics(periodData, this.currentDepartment);

      const unitsEl = document.getElementById(`metric-units-${period.label}`);
      if (unitsEl) unitsEl.textContent = metrics?.total_units != null ? metrics.total_units.toLocaleString() : "-";

      const hoursEl = document.getElementById(`metric-hours-${period.label}`);
      if (hoursEl) hoursEl.textContent = metrics?.total_hours != null ? metrics.total_hours.toFixed(1) + "h" : "-";

      const rankEl = document.getElementById(`metric-rank-${period.label}`);
      if (rankEl) rankEl.textContent = metrics?.rank != null ? `#${metrics.rank}` : "-";

      const rateEl = document.getElementById(`metric-rate-${period.label}`);
      if (rateEl) rateEl.textContent = metrics?.rate != null ? metrics.rate.toFixed(2) : "-";
    });
  }

  /**
   * Obtiene logins y ranking para un período y departamento desde metadata
   * ranking[i] = índice en logins del (i+1)-ésimo en el ranking (1º = ranking[0])
   */
  getRankingData(period, departmentKey) {
    if (!this.metadataUsers?.periods?.[period]) return null;
    const meta = this.metadataUsers.periods[period];
    const logins = meta.logins;
    if (!logins || !Array.isArray(logins)) return null;
    let ranking = null;
    if (departmentKey === "each_stow" && meta.each_stow?.combined?.ranking) {
      ranking = meta.each_stow.combined.ranking;
    } else if (meta[departmentKey] && typeof meta[departmentKey] === "object") {
      const dept = meta[departmentKey];
      const cat = Object.keys(dept).find(k => Array.isArray(dept[k]?.ranking) && dept[k].ranking.length > 0);
      if (cat) ranking = dept[cat].ranking;
    }
    if (!ranking || !Array.isArray(ranking) || ranking.length === 0) return null;
    return { logins, ranking };
  }

  /**
   * Actualiza el panel de ranking: 4 bloques (Semana, Mes, 3 Meses, 6 Meses),
   * cada uno con Top 3 + posición del usuario y botón "Ver ranking completo".
   */
  updateRankingPanel() {
    const container = document.getElementById("ranking-by-period-container");
    const titleEl = document.getElementById("ranking-panel-title");
    if (!container || !titleEl) return;

    const periodLabels = { last_week: "Semana", last_month: "Mes", last_3_months: "3 Meses", last_6_months: "6 Meses" };
    const periodKeys = ["last_week", "last_month", "last_3_months", "last_6_months"];

    if (!this.currentUserData || !this.currentLogin) {
      container.innerHTML = "<div class=\"ranking-empty-message\">Selecciona un usuario para ver el ranking</div>";
      return;
    }

    const dept = this.currentDepartment;
    const deptLabel = this.DEPARTMENTS.find(d => d.key === dept)?.label || dept;
    titleEl.textContent = `Ranking (${deptLabel})`;

    const TOP_COMPACT = 3;
    let html = "";
    for (const period of periodKeys) {
      const label = periodLabels[period];
      const rankingData = this.getRankingData(period, dept);
      const metrics = this.getDepartmentMetrics(this.currentUserData[period], dept);

      let rows = "";
      let showVerMas = false;
      let summaryText = "";

      if (rankingData) {
        const { logins, ranking } = rankingData;
        const total = ranking.length;
        const currentLoginIndex = logins.indexOf(this.currentLogin);
        const userPosition = currentLoginIndex >= 0 ? ranking.indexOf(currentLoginIndex) + 1 : null;
        const rankingLink = (p, pos) => `<span class="ranking-open-link" data-period="${p}" role="button" tabindex="0">Ranking ${pos}/${total}</span>`;

        for (let i = 0; i < Math.min(TOP_COMPACT, ranking.length); i++) {
          const idx = ranking[i];
          const login = logins[idx] || "-";
          const isYou = login === this.currentLogin;
          const rowClass = isYou ? "ranking-row-you" : "";
          const suffix = isYou ? ` ${rankingLink(period, i + 1)}` : "";
          rows += `<tr class="${rowClass}"><td class="ranking-pos">${i + 1}</td><td class="ranking-login">${login}${suffix}</td></tr>`;
        }
        if (userPosition != null && userPosition > TOP_COMPACT) {
          rows += `<tr class="ranking-row-you"><td class="ranking-pos">${userPosition}</td><td class="ranking-login">${this.currentLogin} ${rankingLink(period, userPosition)}</td></tr>`;
        }
      } else {
        rows = "<tr><td colspan=\"2\" class=\"ranking-empty\">Sin datos</td></tr>";
      }

      html += `
        <div class="ranking-period-block" data-period="${period}">
          <h5 class="ranking-period-block-title">${label}</h5>
          <div class="ranking-content ranking-content-compact">
            <table class="ranking-table ranking-table-compact ranking-table-no-head">
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll(".ranking-open-link").forEach(el => {
      const openModal = () => this.openRankingModal(el.getAttribute("data-period"));
      el.addEventListener("click", openModal);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(); } });
    });
  }

  /**
   * Abre el modal con el ranking completo (Top 10 + tu posición) para el período indicado.
   * @param {string} [period] - last_week | last_month | last_3_months | last_6_months (por defecto last_week)
   */
  openRankingModal(period) {
    const modal = document.getElementById("ranking-modal");
    const tbody = document.getElementById("ranking-modal-tbody");
    const titleEl = document.getElementById("ranking-modal-title");
    if (!modal || !tbody || !titleEl) return;

    const p = period || "last_week";
    const dept = this.currentDepartment;
    const rankingData = this.getRankingData(p, dept);
    const periodLabels = { last_week: "Semana", last_month: "Mes", last_3_months: "3 Meses", last_6_months: "6 Meses" };
    const deptLabel = this.DEPARTMENTS.find(d => d.key === dept)?.label || dept;
    titleEl.textContent = `Ranking completo (${deptLabel}) – ${periodLabels[p]}`;

    if (!rankingData) {
      tbody.innerHTML = "<tr><td colspan=\"2\">Sin datos</td></tr>";
    } else {
      const { logins, ranking } = rankingData;
      let rows = "";
      for (let i = 0; i < ranking.length; i++) {
        const idx = ranking[i];
        const login = logins[idx] || "-";
        const isYou = login === this.currentLogin;
        const rowClass = isYou ? "ranking-row-you" : "";
        rows += `<tr class="${rowClass}"><td class="ranking-pos">${i + 1}</td><td class="ranking-login">${login}</td></tr>`;
      }
      tbody.innerHTML = rows;
    }

    modal.style.display = "block";
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("ranking-modal-close").onclick = () => this.closeRankingModal();
    modal.querySelector(".ranking-modal-backdrop").onclick = () => this.closeRankingModal();
  }

  closeRankingModal() {
    const modal = document.getElementById("ranking-modal");
    if (modal) {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    }
  }

  /**
   * Verifica si un período tiene datos para un departamento
   */
  hasDepartmentData(period, departmentKey) {
    if (!this.currentUserData) return false;
    const periodData = this.currentUserData[period];
    if (!periodData || !periodData[departmentKey]) return false;
    const dept = periodData[departmentKey];
    if (typeof dept !== "object" || Array.isArray(dept)) return false;
    if (departmentKey === "each_stow") {
      const combined = dept.combined;
      return combined && (combined.rate !== undefined && combined.rate !== null);
    }
    // receive, pick, pack, shipping: objeto con categorías (cada una puede tener rate/total_units)
    const keys = Object.keys(dept).filter(k => !["date_range"].includes(k));
    for (const k of keys) {
      const cat = dept[k];
      if (cat && typeof cat === "object" && (cat.rate !== undefined || cat.total_units !== undefined)) return true;
    }
    return false;
  }

  /**
   * Devuelve las métricas "principales" de un período para un departamento (rate, rank, units, hours, percentile)
   */
  getDepartmentMetrics(periodData, departmentKey) {
    if (!periodData || !periodData[departmentKey]) return null;
    const dept = periodData[departmentKey];
    if (departmentKey === "each_stow" && dept.combined) {
      const c = dept.combined;
      return { rate: c.rate, rank: c.rank, total_units: c.total_units, total_hours: c.total_hours, percentile: c.percentile };
    }
    if (departmentKey === "each_stow") return null;
    // receive/pick/pack/shipping: promediar o usar primera categoría con datos
    const keys = Object.keys(dept).filter(k => typeof dept[k] === "object" && dept[k] && (dept[k].rate !== undefined || dept[k].total_units !== undefined));
    if (keys.length === 0) return null;
    let rateSum = 0, rankSum = 0, unitsSum = 0, hoursSum = 0, pctSum = 0, n = 0;
    for (const k of keys) {
      const cat = dept[k];
      if (cat.rate != null) { rateSum += cat.rate; n++; }
      if (cat.rank != null) rankSum += cat.rank;
      if (cat.total_units != null) unitsSum += cat.total_units;
      if (cat.total_hours != null) hoursSum += cat.total_hours;
      if (cat.percentile != null) pctSum += cat.percentile;
    }
    const count = keys.length;
    return {
      rate: n ? rateSum / n : null,
      rank: count ? Math.round(rankSum / count) : null,
      total_units: unitsSum || null,
      total_hours: hoursSum || null,
      percentile: count ? pctSum / count : null
    };
  }

  /**
   * Obtiene el promedio general (avg) de metadata para un período y departamento
   */
  getMetadataAvgForDepartment(metadataPeriod, departmentKey) {
    if (!metadataPeriod || !departmentKey) return 0;
    if (departmentKey === "each_stow") {
      return metadataPeriod.each_stow?.combined?.avg ?? 0;
    }
    const dept = metadataPeriod[departmentKey];
    if (!dept || typeof dept !== "object") return 0;
    let sum = 0, n = 0;
    for (const k of Object.keys(dept)) {
      const v = dept[k]?.avg;
      if (v != null && typeof v === "number") { sum += v; n++; }
    }
    return n ? sum / n : 0;
  }

  /**
   * Lista de departamentos que tienen datos en al menos un período
   */
  getAvailableDepartments() {
    if (!this.currentUserData) return [];
    const periods = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const available = new Set();
    for (const key of this.DEPARTMENTS.map(d => d.key)) {
      for (const p of periods) {
        if (this.hasDepartmentData(p, key)) { available.add(key); break; }
      }
    }
    return this.DEPARTMENTS.filter(d => available.has(d.key)).map(d => d.key);
  }

  /**
   * Muestra el selector de departamento y actualiza estado (solo habilitados los que tienen datos)
   */
  updateDepartmentUI() {
    const wrap = document.getElementById("department-buttons-wrap");
    if (!wrap) return;
    if (!this.currentUserData) {
      wrap.style.display = "none";
      return;
    }
    const available = this.getAvailableDepartments();
    if (available.length === 0) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "flex";
    if (!available.includes(this.currentDepartment)) {
      this.currentDepartment = available[0];
    }
    this.DEPARTMENTS.forEach(d => {
      const btn = document.querySelector(`.department-btn[data-department="${d.key}"]`);
      if (!btn) return;
      const hasData = available.includes(d.key);
      btn.disabled = !hasData;
      btn.classList.toggle("active", this.currentDepartment === d.key);
      btn.title = hasData ? `Ver métricas de ${d.label}` : `Sin datos de ${d.label}`;
    });
  }

  /**
   * Cambia el departamento seleccionado y actualiza métricas y gráficos
   */
  selectDepartment(key) {
    if (!this.currentUserData) return;
    const available = this.getAvailableDepartments();
    if (!available.includes(key)) return;
    this.currentDepartment = key;
    this.updateDepartmentUI();
    this.updatePeriodButtons();
    this.updateRankingPanel();
    this.updateVisualization();
  }

  /**
   * Verifica si un período tiene datos disponibles (para el departamento actual)
   */
  hasPeriodData(period) {
    if (!this.currentUserData) return false;
    return this.hasDepartmentData(period, this.currentDepartment);
  }

  /**
   * Actualiza el estado de los botones de período según datos disponibles
   */
  updatePeriodButtons() {
    const periods = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const periodLabels = {
      "last_week": "Semana",
      "last_month": "Mes",
      "last_3_months": "3 Meses",
      "last_6_months": "6 Meses"
    };
    
    // Siempre verificar manualmente que realmente haya datos (no confiar solo en metadata)
    const availablePeriods = [];
    periods.forEach(period => {
      if (this.hasPeriodData(period)) {
        availablePeriods.push(period);
      }
    });
    
    console.log("📊 Períodos disponibles:", availablePeriods);
    
    // Actualizar cada botón
    document.querySelectorAll(".period-btn, .period-btn-compact").forEach(btn => {
      const period = btn.dataset.period;
      const hasData = this.hasPeriodData(period);
      
      if (hasData) {
        // Habilitar botón
        btn.disabled = false;
        btn.classList.remove("disabled", "no-data");
        btn.title = `Ver datos de ${periodLabels[period] || period}`;
      } else {
        // Deshabilitar botón
        btn.disabled = true;
        btn.classList.add("disabled", "no-data");
        btn.title = `No hay datos disponibles para ${periodLabels[period] || period}`;
        // Si estaba activo, remover la clase active
        if (btn.classList.contains("active")) {
          btn.classList.remove("active");
        }
      }
    });
    
    // Si el período actual no tiene datos, cambiar al primer disponible
    if (!this.hasPeriodData(this.currentPeriod)) {
      if (availablePeriods.length > 0) {
        this.currentPeriod = availablePeriods[0];
        this.selectPeriod(availablePeriods[0]);
      } else {
        // Si no hay ningún período disponible, limpiar la visualización
        this.showUserSelectionMessage();
      }
    }
  }

  /**
   * Deshabilita todos los botones de período
   */
  disableAllPeriodButtons() {
    document.querySelectorAll(".period-btn, .period-btn-compact").forEach(btn => {
      btn.disabled = true;
      btn.classList.add("disabled", "no-data");
      btn.classList.remove("active");
    });
  }

  /**
   * Selecciona un período
   */
  selectPeriod(period) {
    // Verificar que el período tenga datos antes de seleccionarlo
    if (!this.hasPeriodData(period)) {
      console.warn(`⚠️ Intento de seleccionar período sin datos: ${period}`);
      if (window.showToast) {
        window.showToast("Este período no tiene datos disponibles", "warning");
      }
      return;
    }
    
    this.currentPeriod = period;
    
    // Actualizar botones (tanto period-btn como period-btn-compact)
    document.querySelectorAll(".period-btn, .period-btn-compact").forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.period === period && !btn.disabled) {
        btn.classList.add("active");
      }
    });
    
    // Actualizar visualización si hay usuario seleccionado
    if (this.currentLogin && this.currentUserData) {
      this.updateVisualization();
    }
  }

  /**
   * Carga los datos del historial
   */
  async loadHistoryData() {
    console.log("📊 Cargando datos del historial...");
    // Los datos se cargan cuando se selecciona un usuario
    this.updateUI();
  }

  /**
   * Simula la carga de datos (placeholder)
   */
  async simulateDataLoad() {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Datos simulados
    this.data.summary = {
      period: "Últimos 30 días",
      analyzedUsers: 45,
      totalStows: 28450,
      dailyAverage: 948,
    };

    this.data.users = [
      {
        id: 1,
        name: "Juan Pérez",
        login: "jperez",
        shift: "day",
        stows: 1250,
        rate: 15.2,
        efficiency: 92,
        hours: 8.2,
        date: "2024-01-15",
      },
      {
        id: 2,
        name: "María García",
        login: "mgarcia",
        shift: "night",
        stows: 1180,
        rate: 14.1,
        efficiency: 88,
        hours: 8.4,
        date: "2024-01-15",
      },
      {
        id: 3,
        name: "Carlos López",
        login: "clopez",
        shift: "day",
        stows: 1350,
        rate: 16.8,
        efficiency: 95,
        hours: 8.0,
        date: "2024-01-15",
      },
      {
        id: 4,
        name: "Ana Martínez",
        login: "amartinez",
        shift: "night",
        stows: 980,
        rate: 12.3,
        efficiency: 85,
        hours: 8.0,
        date: "2024-01-14",
      },
      {
        id: 5,
        name: "Luis Rodríguez",
        login: "lrodriguez",
        shift: "day",
        stows: 1420,
        rate: 17.8,
        efficiency: 97,
        hours: 8.0,
        date: "2024-01-14",
      },
    ];
  }

  /**
   * Actualiza la interfaz de usuario
   */
  updateUI() {
    if (this.currentUserData && this.currentLogin) {
      this.updateVisualization();
    } else {
      // Mostrar mensaje de que se necesita seleccionar un usuario
      this.showUserSelectionMessage();
    }
  }

  /**
   * Actualiza toda la visualización con los datos del usuario
   */
  updateVisualization() {
    if (!this.currentUserData) {
      console.warn("⚠️ No hay datos del usuario para visualizar");
      this.showUserSelectionMessage();
      return;
    }
    
    const period = this.currentPeriod;
    const userPeriodData = this.currentUserData[period];
    const metadataPeriodData = this.metadataUsers?.periods?.[period] || {};
    
    console.log(`📊 Actualizando visualización para período: ${period}`);
    console.log("📊 userPeriodData:", userPeriodData);
    console.log("📊 metadataPeriodData:", metadataPeriodData);
    console.log("📊 userPeriodData.each_stow:", userPeriodData?.each_stow);
    
    if (!userPeriodData) {
      console.warn(`⚠️ No hay datos del usuario para el período ${period}`);
      this.showUserSelectionMessage();
      return;
    }
    
    if (!this.metadataUsers || !this.metadataUsers.periods?.[period]) {
      console.warn(`⚠️ No hay metadata para el período ${period}, continuando sin comparaciones`);
    }
    
    const genericSection = document.getElementById("generic-charts-section");
    const stowSection = document.getElementById("stow-detail-section");
    const receiveSection = document.getElementById("receive-detail-section");
    const pickSection = document.getElementById("pick-detail-section");
    const packSection = document.getElementById("pack-detail-section");
    const shippingSection = document.getElementById("shipping-detail-section");
    const detailSections = [stowSection, receiveSection, pickSection, packSection, shippingSection];
    const hideAllDetails = () => detailSections.forEach(el => { if (el) el.style.display = "none"; });
    if (this.currentDepartment === "each_stow") {
      if (genericSection) genericSection.style.display = "none";
      hideAllDetails();
      if (stowSection) stowSection.style.display = "block";
      this.updateStowDetailViews();
    } else if (this.currentDepartment === "receive") {
      if (genericSection) genericSection.style.display = "none";
      hideAllDetails();
      if (receiveSection) receiveSection.style.display = "block";
      this.updateReceiveDetailViews();
    } else if (this.currentDepartment === "pick") {
      if (genericSection) genericSection.style.display = "none";
      hideAllDetails();
      if (pickSection) pickSection.style.display = "block";
      this.updatePickDetailViews();
    } else if (this.currentDepartment === "pack") {
      if (genericSection) genericSection.style.display = "none";
      hideAllDetails();
      if (packSection) packSection.style.display = "block";
      this.updatePackDetailViews();
    } else if (this.currentDepartment === "shipping") {
      if (genericSection) genericSection.style.display = "none";
      hideAllDetails();
      if (shippingSection) shippingSection.style.display = "block";
      this.updateShippingDetailViews();
    } else {
      hideAllDetails();
      if (genericSection) genericSection.style.display = "block";
      this.updateEvolutionCharts();
    }
  }

  /**
   * Muestra mensaje de selección de usuario y limpia los elementos
   */
  showUserSelectionMessage() {
    const userContainer = document.getElementById("selected-user-container");
    if (userContainer) userContainer.style.display = "none";
    const deptWrap = document.getElementById("department-buttons-wrap");
    if (deptWrap) deptWrap.style.display = "none";
    this.clearPeriodMetrics();
    this.clearEvolutionCharts();
  }

  /**
   * Actualiza un grupo de KPIs específico
   */
  updateKPIGroup(userTask, metadataTask, prefix) {
    if (!userTask) {
      // Limpiar todos los elementos si no hay datos
      const elements = [
        `${prefix}-rate`, `${prefix}-avg`, `${prefix}-percentile`,
        `${prefix}-rank`, `${prefix}-total-users`, `${prefix}-difference`,
        `${prefix}-diff-indicator`, `${prefix}-percentile-bar`
      ];
      elements.forEach(id => {
        const el = document.getElementById(`kpi-${id}`);
        if (el) {
          if (id.includes('percentile-bar')) {
            el.style.width = "0%";
            el.className = "percentile-bar-compact";
          } else {
            el.textContent = "-";
          }
        }
      });
      return;
    }

    // Rate
    const rateEl = document.getElementById(`kpi-${prefix}-rate`);
    if (rateEl) {
      rateEl.textContent = userTask.rate?.toFixed(2) || "-";
    }

    // Promedio (solo si hay metadata)
    const avgEl = document.getElementById(`kpi-${prefix}-avg`);
    if (avgEl) {
      if (metadataTask?.avg !== undefined) {
        avgEl.textContent = metadataTask.avg.toFixed(2);
      } else {
        avgEl.textContent = "-";
      }
    }

    // Percentil
    const percentileEl = document.getElementById(`kpi-${prefix}-percentile`);
    if (percentileEl) {
      if (userTask.percentile !== undefined) {
        percentileEl.textContent = `${userTask.percentile.toFixed(1)}%`;
      } else {
        percentileEl.textContent = "-";
      }
    }

    // Rank
    const rankEl = document.getElementById(`kpi-${prefix}-rank`);
    const totalUsersEl = document.getElementById(`kpi-${prefix}-total-users`);
    if (rankEl) {
      if (userTask.rank !== undefined) {
        rankEl.textContent = `#${userTask.rank}`;
      } else {
        rankEl.textContent = "-";
      }
    }
    if (totalUsersEl) {
      if (userTask.total_users !== undefined) {
        totalUsersEl.textContent = userTask.total_users;
      } else {
        totalUsersEl.textContent = "-";
      }
    }

    // Diferencia
    const differenceEl = document.getElementById(`kpi-${prefix}-difference`);
    const diffIndicatorEl = document.getElementById(`kpi-${prefix}-diff-indicator`);
    if (differenceEl && userTask.rate !== undefined) {
      if (metadataTask?.avg !== undefined) {
        const diff = userTask.rate - metadataTask.avg;
        differenceEl.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
        differenceEl.className = `kpi-compact-value ${diff >= 0 ? 'positive' : 'negative'}`;
        
        // Actualizar indicador basado en la diferencia (no en el percentil)
        if (diffIndicatorEl) {
          let indicator = "";
          let className = "";
          if (diff > 0) {
            // Diferencia positiva = por encima del promedio
            if (diff >= metadataTask.avg * 0.2) {
              // Más del 20% por encima = muy por encima
              indicator = "Muy por encima";
              className = "very-high";
            } else {
              indicator = "Por encima";
              className = "high";
            }
          } else if (diff < 0) {
            // Diferencia negativa = por debajo del promedio
            if (Math.abs(diff) >= metadataTask.avg * 0.2) {
              // Más del 20% por debajo = muy por debajo
              indicator = "Muy por debajo";
              className = "very-low";
            } else {
              indicator = "Por debajo";
              className = "low";
            }
          } else {
            // Diferencia = 0 = en el promedio
            indicator = "En promedio";
            className = "medium";
          }
          diffIndicatorEl.textContent = indicator;
          diffIndicatorEl.className = `kpi-compact-indicator ${className}`;
        }
      } else {
        differenceEl.textContent = userTask.rate.toFixed(2);
        differenceEl.className = "kpi-compact-value";
        if (diffIndicatorEl) {
          diffIndicatorEl.textContent = "-";
          diffIndicatorEl.className = "kpi-compact-indicator";
        }
      }
    }

    // Barra de percentil
    const percentileBarEl = document.getElementById(`kpi-${prefix}-percentile-bar`);
    if (percentileBarEl && userTask.percentile !== undefined) {
      percentileBarEl.style.width = `${userTask.percentile}%`;
      percentileBarEl.className = `percentile-bar-compact ${this.getPercentileClass(userTask.percentile)}`;
    }
  }

  /**
   * Actualiza las tarjetas KPI - Combined, Stow to Prime y Transfer In
   */
  updateKPIs(userData, metadataData) {
    // Actualizar Combined
    const userCombined = userData.each_stow?.combined;
    const metadataCombined = metadataData?.each_stow?.combined;
    this.updateKPIGroup(userCombined, metadataCombined, "combined");

    // Actualizar Stow to Prime
    const userStp = userData.each_stow?.stow_to_prime;
    const metadataStp = metadataData?.each_stow?.stow_to_prime;
    this.updateKPIGroup(userStp, metadataStp, "stp");

    // Actualizar Transfer In
    const userTi = userData.each_stow?.transfer_in;
    const metadataTi = metadataData?.each_stow?.transfer_in;
    this.updateKPIGroup(userTi, metadataTi, "ti");
  }

  /**
   * Actualiza todos los gráficos de evolución temporal
   */
  updateEvolutionCharts() {
    if (!this.currentUserData) {
      this.clearEvolutionCharts();
      return;
    }

    // Recopilar datos de todos los períodos disponibles
    const periods = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const periodLabels = {
      "last_week": "Semana",
      "last_month": "Mes",
      "last_3_months": "3 Meses",
      "last_6_months": "6 Meses"
    };

    this.updateRateEvolutionChart(periods, periodLabels);
    this.updatePercentileEvolutionChart(periods, periodLabels);
    this.updateEffortRateEvolutionChart(periods, periodLabels);
  }

  /**
   * Limpia todos los gráficos de evolución
   */
  clearEvolutionCharts() {
    const chartIds = ["rate-evolution-chart", "percentile-evolution-chart", "effort-rate-evolution-chart"];
    const placeholder = '<div style="padding: 20px; text-align: center; color: #666"><p>Selecciona un usuario para ver la evolución</p></div>';
    chartIds.forEach(id => {
      const chartEl = document.getElementById(id);
      if (chartEl) chartEl.innerHTML = placeholder;
    });
    this.clearStowDetailSection();
  }

  clearStowDetailSection() {
    const ids = ["stow-combined-chart", "stow-combined-kpis", "stow-combined-period-selector", "stow-combined-metric-selector", "stow-pallet-combined-chart", "stow-pallet-combined-kpis", "stow-pallet-combined-period-selector", "stow-pallet-combined-metric-selector", "stow-esfuerzo-chart", "stow-esfuerzo-kpis", "stow-esfuerzo-period-selector", "stow-esfuerzo-extra", "each-stow-metric-selector", "each-stow-charts-grid", "each-stow-comparison-table", "pallet-stow-metric-selector", "pallet-stow-charts-grid", "pallet-stow-comparison-table", "receive-level1-grid", "pick-level1-grid", "pack-level1-grid", "shipping-level1-grid"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
  }

  /**
   * Rellena la vista detallada de Stow (Nivel 1, 2, 3) cuando departamento = Stow
   */
  updateStowDetailViews() {
    if (!this.currentUserData) return;
    const periods = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const periodLabels = { last_week: "Semana", last_month: "Mes", last_3_months: "3 Meses", last_6_months: "6 Meses" };
    this.renderStowLevel1(periods, periodLabels);
    this.renderStowLevel2(periods, periodLabels);
  }

  /**
   * Receive: detalle por categoría (Decant PID, Decant TSI, Receive Each, PreEditor, Prep, Cubiscan, Rcv_Pallet). Datos desde JSON.
   */
  updateReceiveDetailViews() {
    if (!this.currentUserData) return;
    const periods = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const periodLabels = { last_week: "Semana", last_month: "Mes", last_3_months: "3 Meses", last_6_months: "6 Meses" };
    const grid = document.getElementById("receive-level1-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const meta = this.metadataUsers?.periods || {};
    this.RECEIVE_CATEGORIES.forEach(({ key: catKey, label }) => {
      const dataPoints = this._buildReceiveDataPoints(periods, periodLabels, catKey);
      const blockId = `receive-block-${catKey}`;
      const chartId = `receive-chart-${catKey}`;
      const periodSelectorId = `receive-period-${catKey}`;
      const kpisId = `receive-kpis-${catKey}`;
      if (!this.receiveKpiPeriod[catKey]) this.receiveKpiPeriod[catKey] = "last_month";
      const kpiPeriod = this.receiveKpiPeriod[catKey];
      const rec = this.currentUserData[kpiPeriod]?.receive?.[catKey];
      const metaCat = meta[kpiPeriod]?.receive?.[catKey];
      const kpiHtml = rec ? `
        <span class="stow-kpi"><strong>Rate</strong> ${rec.rate?.toFixed(2) ?? "-"}</span>
        <span class="stow-kpi"><strong>Promedio</strong> ${(metaCat?.avg ?? rec.avg_general ?? 0).toFixed(2)}</span>
        <span class="stow-kpi"><strong>Rank</strong> #${rec.rank ?? "-"} / ${rec.total_users ?? "-"}</span>
        <span class="stow-kpi"><strong>Percentil</strong> ${rec.percentile != null ? rec.percentile.toFixed(1) + "%" : "-"}</span>
        <span class="stow-kpi"><strong>Unidades</strong> ${(rec.total_units ?? 0).toLocaleString()}</span>
        <span class="stow-kpi"><strong>Horas</strong> ${(rec.total_hours ?? 0).toFixed(1)}h</span>
      ` : "<span class=\"stow-kpi\">Sin datos</span>";
      const block = document.createElement("div");
      block.className = "stow-level1-block receive-detail-block";
      block.id = blockId;
      block.setAttribute("data-receive-cat", catKey);
      block.innerHTML = `
        <h4 class="stow-block-title">${label}</h4>
        <div id="${chartId}" class="user-history-chart"></div>
        <span class="stow-kpi-period-label">Datos del período:</span>
        <div id="${periodSelectorId}" class="stow-period-selector"></div>
        <div id="${kpisId}" class="stow-kpi-row">${kpiHtml}</div>
      `;
      grid.appendChild(block);
      this._renderStowLineChart(chartId, dataPoints, { userColor: "var(--user-history-chart-user)", avgColor: "var(--user-history-chart-avg-dark)", metric: "rate" });
      this._renderReceivePeriodSelector(periodSelectorId, catKey, periods, periodLabels);
    });
  }

  _buildReceiveDataPoints(periods, periodLabels, catKey) {
    const dataPoints = [];
    const meta = this.metadataUsers?.periods || {};
    periods.forEach(p => {
      const rec = this.currentUserData[p]?.receive?.[catKey];
      if (!rec || rec.rate == null) return;
      const avg = meta[p]?.receive?.[catKey]?.avg ?? rec.avg_general ?? 0;
      dataPoints.push({ period: periodLabels[p], userRate: rec.rate, avgRate: avg });
    });
    return dataPoints;
  }

  _renderReceivePeriodSelector(containerId, catKey, periods, periodLabels) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const periodKeys = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const current = this.receiveKpiPeriod[catKey] || "last_month";
    container.innerHTML = periodKeys.map(p => {
      const label = periodLabels[p];
      const active = p === current ? " active" : "";
      return `<button type="button" class="stow-period-btn${active}" data-period="${p}" data-receive-cat="${catKey}">${label}</button>`;
    }).join("");
    container.querySelectorAll(".stow-period-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.receiveKpiPeriod[btn.getAttribute("data-receive-cat")] = btn.getAttribute("data-period");
        this.updateReceiveDetailViews();
      });
    });
  }

  /**
   * Pick: detalle por categoría (Orderpicker, SIOC, Pallet, Noncon, etc.). Datos desde JSON.
   */
  updatePickDetailViews() {
    if (!this.currentUserData) return;
    const periods = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const periodLabels = { last_week: "Semana", last_month: "Mes", last_3_months: "3 Meses", last_6_months: "6 Meses" };
    const grid = document.getElementById("pick-level1-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const meta = this.metadataUsers?.periods || {};
    this.PICK_CATEGORIES.forEach(({ key: catKey, label }) => {
      const dataPoints = this._buildPickDataPoints(periods, periodLabels, catKey);
      if (!this.pickKpiPeriod[catKey]) this.pickKpiPeriod[catKey] = "last_month";
      const kpiPeriod = this.pickKpiPeriod[catKey];
      const rec = this.currentUserData[kpiPeriod]?.pick?.[catKey];
      const metaCat = meta[kpiPeriod]?.pick?.[catKey];
      const kpiHtml = rec ? `
        <span class="stow-kpi"><strong>Rate</strong> ${rec.rate?.toFixed(2) ?? "-"}</span>
        <span class="stow-kpi"><strong>Promedio</strong> ${(metaCat?.avg ?? rec.avg_general ?? 0).toFixed(2)}</span>
        <span class="stow-kpi"><strong>Rank</strong> #${rec.rank ?? "-"} / ${rec.total_users ?? "-"}</span>
        <span class="stow-kpi"><strong>Percentil</strong> ${rec.percentile != null ? rec.percentile.toFixed(1) + "%" : "-"}</span>
        <span class="stow-kpi"><strong>Unidades</strong> ${(rec.total_units ?? 0).toLocaleString()}</span>
        <span class="stow-kpi"><strong>Horas</strong> ${(rec.total_hours ?? 0).toFixed(1)}h</span>
      ` : "<span class=\"stow-kpi\">Sin datos</span>";
      const chartId = `pick-chart-${catKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const periodSelectorId = `pick-period-${catKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const kpisId = `pick-kpis-${catKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const block = document.createElement("div");
      block.className = "stow-level1-block pick-detail-block";
      block.setAttribute("data-pick-cat", catKey);
      block.innerHTML = `
        <h4 class="stow-block-title">${label}</h4>
        <div id="${chartId}" class="user-history-chart"></div>
        <span class="stow-kpi-period-label">Datos del período:</span>
        <div id="${periodSelectorId}" class="stow-period-selector"></div>
        <div id="${kpisId}" class="stow-kpi-row">${kpiHtml}</div>
      `;
      grid.appendChild(block);
      this._renderStowLineChart(chartId, dataPoints, { userColor: "var(--user-history-chart-user)", avgColor: "var(--user-history-chart-avg-dark)", metric: "rate" });
      this._renderPickPeriodSelector(periodSelectorId, catKey, periods, periodLabels);
    });
  }

  _buildPickDataPoints(periods, periodLabels, catKey) {
    const dataPoints = [];
    const meta = this.metadataUsers?.periods || {};
    periods.forEach(p => {
      const rec = this.currentUserData[p]?.pick?.[catKey];
      if (!rec || rec.rate == null) return;
      const avg = meta[p]?.pick?.[catKey]?.avg ?? rec.avg_general ?? 0;
      dataPoints.push({ period: periodLabels[p], userRate: rec.rate, avgRate: avg });
    });
    return dataPoints;
  }

  _renderPickPeriodSelector(containerId, catKey, periods, periodLabels) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const periodKeys = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const current = this.pickKpiPeriod[catKey] || "last_month";
    const safeCat = catKey.replace(/\./g, "_");
    container.innerHTML = periodKeys.map(p => {
      const label = periodLabels[p];
      const active = p === current ? " active" : "";
      return `<button type="button" class="stow-period-btn${active}" data-period="${p}" data-pick-cat="${safeCat}">${label}</button>`;
    }).join("");
    container.querySelectorAll(".stow-period-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = this.PICK_CATEGORIES.find(c => c.key.replace(/\./g, "_") === btn.getAttribute("data-pick-cat"))?.key || catKey;
        this.pickKpiPeriod[key] = btn.getAttribute("data-period");
        this.updatePickDetailViews();
      });
    });
  }

  /**
   * Pack: detalle por categoría (ScanVerify NonCon, HandTape Small). Datos desde JSON.
   */
  updatePackDetailViews() {
    if (!this.currentUserData) return;
    const periods = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const periodLabels = { last_week: "Semana", last_month: "Mes", last_3_months: "3 Meses", last_6_months: "6 Meses" };
    const grid = document.getElementById("pack-level1-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const meta = this.metadataUsers?.periods || {};
    this.PACK_CATEGORIES.forEach(({ key: catKey, label }) => {
      const dataPoints = this._buildDeptCategoryDataPoints(periods, periodLabels, "pack", catKey);
      if (!this.packKpiPeriod[catKey]) this.packKpiPeriod[catKey] = "last_month";
      const kpiPeriod = this.packKpiPeriod[catKey];
      const rec = this.currentUserData[kpiPeriod]?.pack?.[catKey];
      const metaCat = meta[kpiPeriod]?.pack?.[catKey];
      const kpiHtml = rec ? `
        <span class="stow-kpi"><strong>Rate</strong> ${rec.rate?.toFixed(2) ?? "-"}</span>
        <span class="stow-kpi"><strong>Promedio</strong> ${(metaCat?.avg ?? rec.avg_general ?? 0).toFixed(2)}</span>
        <span class="stow-kpi"><strong>Rank</strong> #${rec.rank ?? "-"} / ${rec.total_users ?? "-"}</span>
        <span class="stow-kpi"><strong>Percentil</strong> ${rec.percentile != null ? rec.percentile.toFixed(1) + "%" : "-"}</span>
        <span class="stow-kpi"><strong>Unidades</strong> ${(rec.total_units ?? 0).toLocaleString()}</span>
        <span class="stow-kpi"><strong>Horas</strong> ${(rec.total_hours ?? 0).toFixed(1)}h</span>
      ` : "<span class=\"stow-kpi\">Sin datos</span>";
      const chartId = `pack-chart-${catKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const periodSelectorId = `pack-period-${catKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const kpisId = `pack-kpis-${catKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const block = document.createElement("div");
      block.className = "stow-level1-block pack-detail-block";
      block.innerHTML = `
        <h4 class="stow-block-title">${label}</h4>
        <div id="${chartId}" class="user-history-chart"></div>
        <span class="stow-kpi-period-label">Datos del período:</span>
        <div id="${periodSelectorId}" class="stow-period-selector"></div>
        <div id="${kpisId}" class="stow-kpi-row">${kpiHtml}</div>
      `;
      grid.appendChild(block);
      this._renderStowLineChart(chartId, dataPoints, { userColor: "var(--user-history-chart-user)", avgColor: "var(--user-history-chart-avg-dark)", metric: "rate" });
      this._renderDeptPeriodSelector(periodSelectorId, catKey, "pack", periods, periodLabels, "packKpiPeriod", "updatePackDetailViews");
    });
  }

  /**
   * Shipping: detalle por categoría. Datos desde JSON.
   */
  updateShippingDetailViews() {
    if (!this.currentUserData) return;
    const periods = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const periodLabels = { last_week: "Semana", last_month: "Mes", last_3_months: "3 Meses", last_6_months: "6 Meses" };
    const grid = document.getElementById("shipping-level1-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const meta = this.metadataUsers?.periods || {};
    this.SHIPPING_CATEGORIES.forEach(({ key: catKey, label }) => {
      const dataPoints = this._buildDeptCategoryDataPoints(periods, periodLabels, "shipping", catKey);
      if (!this.shippingKpiPeriod[catKey]) this.shippingKpiPeriod[catKey] = "last_month";
      const kpiPeriod = this.shippingKpiPeriod[catKey];
      const rec = this.currentUserData[kpiPeriod]?.shipping?.[catKey];
      const metaCat = meta[kpiPeriod]?.shipping?.[catKey];
      const kpiHtml = rec ? `
        <span class="stow-kpi"><strong>Rate</strong> ${rec.rate?.toFixed(2) ?? "-"}</span>
        <span class="stow-kpi"><strong>Promedio</strong> ${(metaCat?.avg ?? rec.avg_general ?? 0).toFixed(2)}</span>
        <span class="stow-kpi"><strong>Rank</strong> #${rec.rank ?? "-"} / ${rec.total_users ?? "-"}</span>
        <span class="stow-kpi"><strong>Percentil</strong> ${rec.percentile != null ? rec.percentile.toFixed(1) + "%" : "-"}</span>
        <span class="stow-kpi"><strong>Unidades</strong> ${(rec.total_units ?? 0).toLocaleString()}</span>
        <span class="stow-kpi"><strong>Horas</strong> ${(rec.total_hours ?? 0).toFixed(1)}h</span>
      ` : "<span class=\"stow-kpi\">Sin datos</span>";
      const chartId = `shipping-chart-${catKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const periodSelectorId = `shipping-period-${catKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const kpisId = `shipping-kpis-${catKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const block = document.createElement("div");
      block.className = "stow-level1-block shipping-detail-block";
      block.innerHTML = `
        <h4 class="stow-block-title">${label}</h4>
        <div id="${chartId}" class="user-history-chart"></div>
        <span class="stow-kpi-period-label">Datos del período:</span>
        <div id="${periodSelectorId}" class="stow-period-selector"></div>
        <div id="${kpisId}" class="stow-kpi-row">${kpiHtml}</div>
      `;
      grid.appendChild(block);
      this._renderStowLineChart(chartId, dataPoints, { userColor: "var(--user-history-chart-user)", avgColor: "var(--user-history-chart-avg-dark)", metric: "rate" });
      this._renderDeptPeriodSelector(periodSelectorId, catKey, "shipping", periods, periodLabels, "shippingKpiPeriod", "updateShippingDetailViews");
    });
  }

  _buildDeptCategoryDataPoints(periods, periodLabels, deptKey, catKey) {
    const dataPoints = [];
    const meta = this.metadataUsers?.periods || {};
    periods.forEach(p => {
      const rec = this.currentUserData[p]?.[deptKey]?.[catKey];
      if (!rec || rec.rate == null) return;
      const avg = meta[p]?.[deptKey]?.[catKey]?.avg ?? rec.avg_general ?? 0;
      dataPoints.push({ period: periodLabels[p], userRate: rec.rate, avgRate: avg });
    });
    return dataPoints;
  }

  _renderDeptPeriodSelector(containerId, catKey, deptKey, periods, periodLabels, periodStateKey, updateMethod) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const periodKeys = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const current = this[periodStateKey][catKey] || "last_month";
    const safeCat = catKey.replace(/\./g, "_");
    container.innerHTML = periodKeys.map(p => {
      const label = periodLabels[p];
      const active = p === current ? " active" : "";
      return `<button type="button" class="stow-period-btn${active}" data-period="${p}" data-cat="${safeCat}">${label}</button>`;
    }).join("");
    container.querySelectorAll(".stow-period-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = catKey;
        this[periodStateKey][key] = btn.getAttribute("data-period");
        this[updateMethod]();
      });
    });
  }

  /**
   * Nivel 1: Stow Combined, Pallet Combined, Esfuerzo (gráfico línea + KPIs)
   */
  renderStowLevel1(periods, periodLabels) {
    const period = this.currentPeriod;
    const periodData = this.currentUserData[period];
    const meta = this.metadataUsers?.periods?.[period] || {};

    this._renderStowMetricSelector("stow-combined-metric-selector", "combined", periods, periodLabels);
    const combinedData = this._buildStowLevel1DataPoints(periods, periodLabels, "combined");
    this._renderStowLineChart("stow-combined-chart", combinedData, { userColor: "var(--user-history-chart-user)", avgColor: "var(--user-history-chart-avg-dark)", metric: this.stowChartMetric.combined });
    this._renderStowPeriodSelector("stow-combined-period-selector", "combined", periods, periodLabels);
    const combinedPeriod = this.stowKpiPeriod.combined;
    const combined = this.currentUserData[combinedPeriod]?.each_stow?.combined;
    const combinedKpis = document.getElementById("stow-combined-kpis");
    if (combinedKpis) {
      combinedKpis.innerHTML = combined ? `
        <span class="stow-kpi"><strong>Rate</strong> ${combined.rate?.toFixed(2) ?? "-"}</span>
        <span class="stow-kpi"><strong>Rank</strong> #${combined.rank ?? "-"} / ${combined.total_users ?? "-"}</span>
        <span class="stow-kpi"><strong>Percentil</strong> ${combined.percentile != null ? combined.percentile.toFixed(1) + "%" : "-"}</span>
        <span class="stow-kpi"><strong>Unidades</strong> ${(combined.total_units ?? 0).toLocaleString()}</span>
        <span class="stow-kpi"><strong>Horas</strong> ${(combined.total_hours ?? 0).toFixed(1)}h</span>
      ` : "<span class=\"stow-kpi\">Sin datos</span>";
    }

    this._renderStowMetricSelector("stow-pallet-combined-metric-selector", "pallet", periods, periodLabels);
    const palletData = this._buildStowLevel1DataPoints(periods, periodLabels, "pallet");
    this._renderStowLineChart("stow-pallet-combined-chart", palletData, { userColor: "var(--user-history-chart-user)", avgColor: "var(--user-history-chart-avg-dark)", metric: this.stowChartMetric.pallet });
    this._renderStowPeriodSelector("stow-pallet-combined-period-selector", "pallet", periods, periodLabels);
    const palletPeriod = this.stowKpiPeriod.pallet;
    const palletCombined = this.currentUserData[palletPeriod]?.pallet_stow?.combined;
    const palletKpis = document.getElementById("stow-pallet-combined-kpis");
    if (palletKpis) {
      palletKpis.innerHTML = palletCombined ? `
        <span class="stow-kpi"><strong>Pallet rate</strong> ${palletCombined.pallet_rate?.toFixed(2) ?? "-"}</span>
        <span class="stow-kpi"><strong>Rank</strong> #${palletCombined.rank_pallet ?? "-"} / ${palletCombined.total_users ?? "-"}</span>
        <span class="stow-kpi"><strong>Percentil</strong> ${palletCombined.percentile_pallet != null ? palletCombined.percentile_pallet.toFixed(1) + "%" : "-"}</span>
        <span class="stow-kpi"><strong>Pallets</strong> ${(palletCombined.pallet_units ?? 0).toLocaleString()}</span>
        <span class="stow-kpi"><strong>Horas</strong> ${(palletCombined.total_hours ?? 0).toFixed(1)}h</span>
      ` : "<span class=\"stow-kpi\">Sin datos</span>";
    }

    // Esfuerzo (naranja)
    const esfuerzoData = [];
    periods.forEach(p => {
      const pd = this.currentUserData[p];
      const ef = pd?.rate_por_esfuerzo;
      const avg = ef?.avg_rate_esfuerzo_general ?? 0;
      if (ef?.rate_por_esfuerzo != null) esfuerzoData.push({ period: periodLabels[p], userRate: ef.rate_por_esfuerzo, avgRate: avg });
    });
    this._renderStowLineChart("stow-esfuerzo-chart", esfuerzoData, { userColor: "var(--user-history-esfuerzo)", avgColor: "var(--user-history-chart-avg-dark)" });
    this._renderStowPeriodSelector("stow-esfuerzo-period-selector", "esfuerzo", periods, periodLabels);
    const esfuerzoPeriod = this.stowKpiPeriod.esfuerzo;
    const esfuerzo = this.currentUserData[esfuerzoPeriod]?.rate_por_esfuerzo;
    const esfuerzoKpis = document.getElementById("stow-esfuerzo-kpis");
    if (esfuerzoKpis) {
      esfuerzoKpis.innerHTML = esfuerzo ? `
        <span class="stow-kpi stow-kpi-esfuerzo"><strong>Rate esfuerzo</strong> ${esfuerzo.rate_por_esfuerzo?.toFixed(2) ?? "-"}</span>
        <span class="stow-kpi"><strong>UPH</strong> ${esfuerzo.uph?.toFixed(2) ?? "-"}</span>
        <span class="stow-kpi"><strong>Rank esfuerzo</strong> #${esfuerzo.rank_esfuerzo ?? "-"} / ${esfuerzo.total_users ?? "-"}</span>
        <span class="stow-kpi"><strong>Percentil</strong> ${esfuerzo.percentile_esfuerzo != null ? esfuerzo.percentile_esfuerzo.toFixed(1) + "%" : "-"}</span>
      ` : "<span class=\"stow-kpi\">Sin datos</span>";
    }
    const esfuerzoExtra = document.getElementById("stow-esfuerzo-extra");
    if (esfuerzoExtra) {
      esfuerzoExtra.innerHTML = esfuerzo ? `
        <span class="stow-kpi"><strong>Distancia total</strong> ${(esfuerzo.total_distance ?? 0).toFixed(0)} m</span>
        <span class="stow-kpi"><strong>Distancia/hora</strong> ${(esfuerzo.distance_per_hour ?? 0).toFixed(0)}</span>
        <span class="stow-kpi"><strong>Cart changes</strong> ${esfuerzo.cart_changes ?? "-"}</span>
        <span class="stow-kpi"><strong>Errores</strong> ${esfuerzo.errores ?? "-"}</span>
      ` : "";
    }
  }

  _buildStowDataPoints(periods, periodLabels, section, category) {
    const metric = section === "each_stow" ? this.stowChartMetric.each_stow : this.stowChartMetric.pallet_stow;
    const dataPoints = [];
    const meta = this.metadataUsers?.periods || {};
    periods.forEach(p => {
      const pd = this.currentUserData[p];
      const c = section === "each_stow" ? pd?.each_stow?.[category] : pd?.pallet_stow?.[category];
      if (!c) return;
      let userVal, avgVal;
      if (metric === "rate") {
        userVal = section === "each_stow" ? c.rate : c.pallet_rate;
        avgVal = section === "each_stow" ? (meta[p]?.each_stow?.[category]?.avg ?? 0) : (meta[p]?.pallet_stow?.[category]?.avg ?? 0);
      } else if (metric === "hours") {
        userVal = c.total_hours != null ? c.total_hours : null;
        avgVal = section === "each_stow" ? (meta[p]?.each_stow?.[category]?.avg_hours ?? null) : (meta[p]?.pallet_stow?.[category]?.avg_hours ?? null);
      } else {
        userVal = section === "each_stow" ? c.percentile : c.percentile_pallet;
        avgVal = 50;
      }
      if (userVal != null) dataPoints.push({ period: periodLabels[p], userRate: userVal, avgRate: avgVal != null ? avgVal : 0 });
    });
    return dataPoints;
  }

  _buildStowLevel1DataPoints(periods, periodLabels, blockKey) {
    const metric = this.stowChartMetric[blockKey];
    const dataPoints = [];
    const meta = this.metadataUsers?.periods || {};
    const section = blockKey === "combined" ? "each_stow" : "pallet_stow";
    const cat = "combined";
    periods.forEach(p => {
      const pd = this.currentUserData[p];
      const c = section === "each_stow" ? pd?.each_stow?.combined : pd?.pallet_stow?.combined;
      if (!c) return;
      let userVal, avgVal;
      if (metric === "rate") {
        userVal = section === "each_stow" ? c.rate : c.pallet_rate;
        avgVal = section === "each_stow" ? (meta[p]?.each_stow?.combined?.avg ?? 0) : (meta[p]?.pallet_stow?.combined?.avg ?? 0);
      } else if (metric === "hours") {
        userVal = c.total_hours != null ? c.total_hours : null;
        avgVal = section === "each_stow" ? (meta[p]?.each_stow?.combined?.avg_hours ?? null) : (meta[p]?.pallet_stow?.combined?.avg_hours ?? null);
      } else {
        userVal = section === "each_stow" ? c.percentile : c.percentile_pallet;
        avgVal = 50;
      }
      if (userVal != null) dataPoints.push({ period: periodLabels[p], userRate: userVal, avgRate: avgVal != null ? avgVal : 0 });
    });
    return dataPoints;
  }

  _renderStowMetricSelector(containerId, blockKey, periods, periodLabels) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const current = this.stowChartMetric[blockKey] || "rate";
    const options = [
      { key: "rate", label: "UPH / Rate" },
      { key: "hours", label: "Horas" },
      { key: "percentile", label: "Percentil" }
    ];
    container.innerHTML = options.map(o => {
      const active = o.key === current ? " active" : "";
      return `<button type="button" class="stow-metric-btn${active}" data-metric="${o.key}" data-block="${blockKey}">${o.label}</button>`;
    }).join("");
    container.querySelectorAll(".stow-metric-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.stowChartMetric[blockKey] = btn.getAttribute("data-metric");
        this.updateStowDetailViews();
      });
    });
  }

  _renderStowPeriodSelector(containerId, blockKey, periods, periodLabels) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const periodKeys = ["last_week", "last_month", "last_3_months", "last_6_months"];
    const current = this.stowKpiPeriod[blockKey] || "last_month";
    container.innerHTML = periodKeys.map(p => {
      const label = periodLabels[p];
      const active = p === current ? " active" : "";
      return `<button type="button" class="stow-period-btn${active}" data-period="${p}" data-block="${blockKey}">${label}</button>`;
    }).join("");
    container.querySelectorAll(".stow-period-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.stowKpiPeriod[blockKey] = btn.getAttribute("data-period");
        this.updateStowDetailViews();
      });
    });
  }

  _renderStowLineChart(containerId, dataPoints, options = {}) {
    const chartEl = document.getElementById(containerId);
    if (!chartEl) return;
    const metric = options.metric || "rate";
    const formatVal = (v) => metric === "percentile" ? (v.toFixed(1) + "%") : metric === "hours" ? v.toFixed(1) : v.toFixed(1);
    if (!dataPoints || dataPoints.length === 0) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos</div>';
      return;
    }
    const userColor = options.userColor ?? "var(--user-history-chart-user)";
    const avgColor = options.avgColor ?? "var(--user-history-chart-avg-dark)";
    let maxRate = Math.max(...dataPoints.map(d => Math.max(d.userRate, d.avgRate))) * 1.1 || 1;
    if (metric === "percentile") maxRate = Math.min(100, Math.max(maxRate, 50));
    const chartHeight = 240;
    const chartWidth = Math.max(400, dataPoints.length * 100);
    const padding = { top: 44, right: 50, bottom: 44, left: 50 };
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;
    const baselineY = padding.top + graphHeight;
    const gradientId = "grad-" + containerId.replace(/[^a-zA-Z0-9_-]/g, "");

    let svg = `<svg width="${chartWidth}" height="${chartHeight}" style="overflow:visible" viewBox="0 0 ${chartWidth} ${chartHeight}">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${userColor};stop-opacity:0.35" />
          <stop offset="100%" style="stop-color:${userColor};stop-opacity:0" />
        </linearGradient>
      </defs>
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${baselineY}" stroke="var(--user-history-border)" stroke-width="2"/>
      <line x1="${padding.left}" y1="${baselineY}" x2="${padding.left + graphWidth}" y2="${baselineY}" stroke="var(--user-history-border)" stroke-width="2"/>`;
    const axisSuffix = metric === "percentile" ? "%" : metric === "hours" ? "h" : "";
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + graphHeight * (1 - i / 4);
      const v = (maxRate * i / 4).toFixed(metric === "hours" ? 1 : 0) + axisSuffix;
      svg += `<line x1="${padding.left - 5}" y1="${y}" x2="${padding.left + graphWidth}" y2="${y}" stroke="var(--user-history-border)" stroke-dasharray="4,4" opacity="0.3"/><text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--user-history-text-secondary)">${v}</text>`;
    }
    const step = dataPoints.length > 1 ? graphWidth / (dataPoints.length - 1) : 0;
    let userLinePath = "";
    let userAreaPath = `M ${padding.left},${baselineY}`;
    for (let i = 0; i < dataPoints.length; i++) {
      const x = padding.left + (i * step);
      const uy = padding.top + graphHeight - (dataPoints[i].userRate / maxRate * graphHeight);
      userAreaPath += ` L ${x},${uy}`;
      userLinePath += (i === 0 ? "M " : " L ") + `${x},${uy}`;
    }
    userAreaPath += ` L ${padding.left + graphWidth},${baselineY} Z`;
    svg += `<path d="${userAreaPath}" fill="url(#${gradientId})"/>`;

    let avgPath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].avgRate / maxRate * graphHeight)}`;
    for (let i = 1; i < dataPoints.length; i++) {
      const x = padding.left + (i * step);
      avgPath += ` L ${x},${padding.top + graphHeight - (dataPoints[i].avgRate / maxRate * graphHeight)}`;
    }
    svg += `<path d="${avgPath}" fill="none" stroke="${avgColor}" stroke-width="2" stroke-dasharray="5,5" opacity="0.9"/>`;
    svg += `<path d="${userLinePath}" fill="none" stroke="${userColor}" stroke-width="3" stroke-linecap="round"/>`;

    dataPoints.forEach((d, i) => {
      const x = padding.left + (i * step);
      const uy = padding.top + graphHeight - (d.userRate / maxRate * graphHeight);
      const ay = padding.top + graphHeight - (d.avgRate / maxRate * graphHeight);
      svg += `<circle cx="${x}" cy="${uy}" r="5" fill="${userColor}" stroke="white" stroke-width="1.5"/>`;
      svg += `<circle cx="${x}" cy="${ay}" r="3.5" fill="${avgColor}" stroke="white" stroke-width="1"/>`;
      svg += `<text x="${x}" y="${uy - 8}" text-anchor="middle" font-size="10" font-weight="600" fill="${userColor}">${formatVal(d.userRate)}</text>`;
      svg += `<text x="${x}" y="${ay + 14}" text-anchor="middle" font-size="9" fill="${avgColor}">${formatVal(d.avgRate)}</text>`;
      svg += `<text x="${x}" y="${baselineY + 16}" text-anchor="middle" font-size="10" fill="var(--user-history-text-secondary)">${d.period}</text>`;
    });
    svg += `<text x="${chartWidth - padding.right - 55}" y="${padding.top + 12}" font-size="10" fill="${userColor}">Usuario</text><line x1="${chartWidth - padding.right - 65}" y1="${padding.top + 18}" x2="${chartWidth - padding.right - 20}" y2="${padding.top + 18}" stroke="${userColor}" stroke-width="2.5"/><text x="${chartWidth - padding.right - 55}" y="${padding.top + 32}" font-size="10" fill="${avgColor}">Promedio</text><line x1="${chartWidth - padding.right - 65}" y1="${padding.top + 38}" x2="${chartWidth - padding.right - 20}" y2="${padding.top + 38}" stroke="${avgColor}" stroke-dasharray="5,5" stroke-width="2"/>`;
    svg += "</svg>";
    chartEl.innerHTML = svg;
  }

  /**
   * Nivel 2: Each Stow y Pallet Stow por tipo (evolución en el tiempo: usuario vs promedio)
   */
  renderStowLevel2(periods, periodLabels) {
    const period = this.currentPeriod;
    const periodData = this.currentUserData[period];
    const eachStow = periodData?.each_stow || {};
    const palletStow = periodData?.pallet_stow || {};
    const catOrder = ["stow_to_prime", "stow_to_prime_e", "stow_to_prime_w", "transfer_in", "transfer_in_e", "transfer_in_w", "combined", "combined_e", "combined_w"];
    const catLabels = { stow_to_prime: "Stow to Prime", stow_to_prime_e: "Stow to Prime E", stow_to_prime_w: "Stow to Prime W", transfer_in: "Transfer In", transfer_in_e: "Transfer In E", transfer_in_w: "Transfer In W", combined: "Combined", combined_e: "Combined E", combined_w: "Combined W" };

    this._renderStowMetricSelector("each-stow-metric-selector", "each_stow", periods, periodLabels);
    const eachGrid = document.getElementById("each-stow-charts-grid");
    if (eachGrid) {
      eachGrid.innerHTML = "";
      const metric = this.stowChartMetric.each_stow;
      catOrder.forEach(catKey => {
        const dataPoints = this._buildStowDataPoints(periods, periodLabels, "each_stow", catKey);
        const cell = document.createElement("div");
        cell.className = "stow-level2-chart-cell";
        const chartId = `each-stow-chart-${catKey}`;
        cell.innerHTML = `<h5 class="stow-category-chart-title">${catLabels[catKey] || catKey}</h5><div id="${chartId}" class="user-history-chart"></div>`;
        eachGrid.appendChild(cell);
        this._renderStowLineChart(chartId, dataPoints, { userColor: "var(--user-history-chart-user)", avgColor: "var(--user-history-chart-avg-dark)", metric });
      });
    }
    const eachCats = catOrder.filter(k => eachStow[k] && (eachStow[k].rate != null || eachStow[k].total_units != null));
    const eachTable = document.getElementById("each-stow-comparison-table");
    if (eachTable) {
      eachTable.innerHTML = eachCats.length ? `<thead><tr><th>Categoría</th><th>Unidades</th><th>Horas</th><th>Rate</th><th>Rank</th></tr></thead><tbody>${eachCats.map(k => { const c = eachStow[k]; return `<tr><td>${catLabels[k] || k}</td><td>${(c.total_units ?? 0).toLocaleString()}</td><td>${(c.total_hours ?? 0).toFixed(1)}h</td><td>${(c.rate ?? 0).toFixed(2)}</td><td>#${c.rank ?? "-"}</td></tr>`; }).join("")}</tbody>` : "";
    }

    this._renderStowMetricSelector("pallet-stow-metric-selector", "pallet_stow", periods, periodLabels);
    const palletGrid = document.getElementById("pallet-stow-charts-grid");
    if (palletGrid) {
      palletGrid.innerHTML = "";
      const metric = this.stowChartMetric.pallet_stow;
      catOrder.forEach(catKey => {
        const dataPoints = this._buildStowDataPoints(periods, periodLabels, "pallet_stow", catKey);
        const cell = document.createElement("div");
        cell.className = "stow-level2-chart-cell";
        const chartId = `pallet-stow-chart-${catKey}`;
        cell.innerHTML = `<h5 class="stow-category-chart-title">${catLabels[catKey] || catKey}</h5><div id="${chartId}" class="user-history-chart"></div>`;
        palletGrid.appendChild(cell);
        this._renderStowLineChart(chartId, dataPoints, { userColor: "var(--user-history-success)", avgColor: "var(--user-history-chart-avg-dark)", metric });
      });
    }
    const palletCats = catOrder.filter(k => palletStow[k] && (palletStow[k].pallet_rate != null || palletStow[k].pallet_units != null));
    const palletTable = document.getElementById("pallet-stow-comparison-table");
    if (palletTable) {
      palletTable.innerHTML = palletCats.length ? `<thead><tr><th>Categoría</th><th>Pallets</th><th>Horas</th><th>Pallet rate</th><th>Rank</th></tr></thead><tbody>${palletCats.map(k => { const c = palletStow[k]; return `<tr><td>${catLabels[k] || k}</td><td>${(c.pallet_units ?? 0).toLocaleString()}</td><td>${(c.total_hours ?? 0).toFixed(1)}h</td><td>${(c.pallet_rate ?? 0).toFixed(2)}</td><td>#${c.rank_pallet ?? "-"}</td></tr>`; }).join("")}</tbody>` : "";
    }
  }

  /**
   * Actualiza gráfico de evolución del rate (usuario vs promedio)
   */
  updateRateEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("rate-evolution-chart");
    if (!chartEl) return;

    const dataPoints = [];
    const periodsWithData = [];

    const dept = this.currentDepartment;
    periods.forEach(period => {
      const periodData = this.currentUserData[period];
      const metadataPeriod = this.metadataUsers?.periods?.[period];
      const metrics = this.getDepartmentMetrics(periodData, dept);
      if (metrics?.rate != null) {
        const userRate = metrics.rate;
        const avgRate = this.getMetadataAvgForDepartment(metadataPeriod, dept) || 0;
        dataPoints.push({ period: periodLabels[period], userRate, avgRate });
        periodsWithData.push(periodLabels[period]);
      }
    });

    if (dataPoints.length === 0) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos suficientes para mostrar la evolución</div>';
      return;
    }

    // Crear gráfico de línea temporal
    const maxRate = Math.max(...dataPoints.map(d => Math.max(d.userRate, d.avgRate))) * 1.1;
    const chartHeight = 300;
    const chartWidth = Math.max(600, periodsWithData.length * 150);
    const padding = { top: 40, right: 180, bottom: 60, left: 60 }; // Más espacio a la derecha para la leyenda
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;

    const userColor = "var(--user-history-chart-user)";
    const avgColor = "var(--user-history-chart-avg)";
    let svg = `
      <svg width="${chartWidth}" height="${chartHeight}" style="overflow: visible;">
        <defs>
          <linearGradient id="userLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${userColor};stop-opacity:0.35" />
            <stop offset="100%" style="stop-color:${userColor};stop-opacity:0" />
          </linearGradient>
          <linearGradient id="avgLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${avgColor};stop-opacity:0.25" />
            <stop offset="100%" style="stop-color:${avgColor};stop-opacity:0" />
          </linearGradient>
        </defs>
        
        <!-- Ejes -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + graphHeight}" 
              stroke="var(--user-history-border)" stroke-width="2"/>
        <line x1="${padding.left}" y1="${padding.top + graphHeight}" x2="${padding.left + graphWidth}" y2="${padding.top + graphHeight}" 
              stroke="var(--user-history-border)" stroke-width="2"/>
        
        <!-- Líneas de referencia -->
    `;

    // Líneas de referencia horizontales
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight * (1 - i / 5));
      const value = (maxRate * i / 5).toFixed(0);
      svg += `
        <line x1="${padding.left - 5}" y1="${y}" x2="${padding.left + graphWidth}" y2="${y}" 
              stroke="var(--user-history-border)" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>
        <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="var(--user-history-text-secondary)">${value}</text>
      `;
    }

    // Área bajo la línea del usuario
    let userPath = `M ${padding.left},${padding.top + graphHeight}`;
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.userRate / maxRate * graphHeight);
      userPath += ` L ${x},${y}`;
    });
    userPath += ` L ${padding.left + graphWidth},${padding.top + graphHeight} Z`;
    svg += `<path d="${userPath}" fill="url(#userLineGradient)"/>`;

    // Área bajo la línea del promedio
    let avgPath = `M ${padding.left},${padding.top + graphHeight}`;
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
      avgPath += ` L ${x},${y}`;
    });
    avgPath += ` L ${padding.left + graphWidth},${padding.top + graphHeight} Z`;
    svg += `<path d="${avgPath}" fill="url(#avgLineGradient)"/>`;

    // Línea del usuario
    let userLinePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].userRate / maxRate * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.userRate / maxRate * graphHeight);
        userLinePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${userLinePath}" fill="none" stroke="${userColor}" stroke-width="3.5" stroke-linecap="round"/>`;

    // Línea del promedio
    let avgLinePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].avgRate / maxRate * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
        avgLinePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${avgLinePath}" fill="none" stroke="${avgColor}" stroke-width="2" stroke-dasharray="5,5" opacity="0.85"/>`;

    // Puntos y etiquetas con interactividad
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const userY = padding.top + graphHeight - (point.userRate / maxRate * graphHeight);
      const avgY = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
      
      // Área invisible más grande para facilitar hover y click
      const hoverRadius = 12;
      svg += `<circle cx="${x}" cy="${userY}" r="${hoverRadius}" fill="transparent" class="chart-point-hover" 
              data-period="${point.period}" data-type="user" data-value="${point.userRate.toFixed(2)}" 
              data-avg="${point.avgRate.toFixed(2)}" style="cursor: pointer;"/>`;
      svg += `<circle cx="${x}" cy="${avgY}" r="${hoverRadius}" fill="transparent" class="chart-point-hover" 
              data-period="${point.period}" data-type="avg" data-value="${point.avgRate.toFixed(2)}" 
              data-user="${point.userRate.toFixed(2)}" style="cursor: pointer;"/>`;
      
      // Puntos visibles (usuario más destacado)
      svg += `<circle cx="${x}" cy="${userY}" r="5" fill="${userColor}" stroke="white" stroke-width="2" 
              class="chart-point-user" data-period="${point.period}" style="cursor: pointer;"/>`;
      svg += `<circle cx="${x}" cy="${avgY}" r="4" fill="${avgColor}" stroke="white" stroke-width="2" 
              class="chart-point-avg" data-period="${point.period}" style="cursor: pointer;"/>`;
      
      // Etiquetas de valor (ocultas por defecto, se muestran en tooltip)
      svg += `<text x="${x}" y="${userY - 10}" text-anchor="middle" font-size="11" font-weight="600" 
              fill="${userColor}" class="chart-value-label" style="pointer-events: none;">${point.userRate.toFixed(1)}</text>`;
      svg += `<text x="${x}" y="${avgY - 10}" text-anchor="middle" font-size="10" 
              fill="${avgColor}" class="chart-value-label" style="pointer-events: none;">${point.avgRate.toFixed(1)}</text>`;
      
      // Etiquetas de período
      svg += `<text x="${x}" y="${padding.top + graphHeight + 20}" text-anchor="middle" font-size="11" 
              fill="var(--user-history-text-secondary)" style="pointer-events: none;">${point.period}</text>`;
    });

    // Leyenda interactiva (fuera del área del gráfico, a la derecha)
    const legendX = chartWidth - padding.right + 20; // Fuera del área del gráfico
    const legendY = padding.top + 20;
    svg += `
      <g transform="translate(${legendX}, ${legendY})">
        <g class="chart-legend-item" data-series="user" style="cursor: pointer;">
          <line x1="0" y1="10" x2="30" y2="10" stroke="${userColor}" stroke-width="3" class="legend-line-user"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-user">Usuario</text>
        </g>
        <g class="chart-legend-item" data-series="avg" style="cursor: pointer;" transform="translate(0, 20)">
          <line x1="0" y1="10" x2="30" y2="10" stroke="${avgColor}" stroke-width="2" stroke-dasharray="5,5" opacity="0.85" class="legend-line-avg"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-avg">Promedio</text>
        </g>
      </g>
    `;

    // Tooltip
    svg += `
      <g id="rate-chart-tooltip" style="display: none; pointer-events: none;">
        <rect x="0" y="0" width="140" height="80" fill="rgba(0,0,0,0.85)" rx="6" ry="6"/>
        <text x="10" y="20" font-size="12" font-weight="600" fill="white" id="tooltip-period">Período</text>
        <text x="10" y="40" font-size="11" id="tooltip-user">Usuario: -</text>
        <text x="10" y="55" font-size="11" fill="#cccccc" id="tooltip-avg">Promedio: -</text>
        <text x="10" y="70" font-size="11" font-weight="600" fill="white" id="tooltip-diff">Diferencia: -</text>
      </g>
    `;

    svg += '</svg>';
    chartEl.innerHTML = svg;
    const tooltipUserEl = chartEl.querySelector('#tooltip-user');
    if (tooltipUserEl) tooltipUserEl.setAttribute('fill', userColor);
    
    // Agregar interactividad después de insertar el SVG
    this.setupRateChartInteractivity(chartEl, dataPoints, periods);
  }

  /**
   * Configura interactividad para el gráfico de evolución del rate
   */
  setupRateChartInteractivity(chartEl, dataPoints, periods) {
    const svg = chartEl.querySelector('svg');
    if (!svg) return;

    const tooltip = svg.querySelector('#rate-chart-tooltip');
    const tooltipPeriod = svg.querySelector('#tooltip-period');
    const tooltipUser = svg.querySelector('#tooltip-user');
    const tooltipAvg = svg.querySelector('#tooltip-avg');
    const tooltipDiff = svg.querySelector('#tooltip-diff');

    let userLineVisible = true;
    let avgLineVisible = true;

    // Tooltips y click en puntos
    const hoverPoints = svg.querySelectorAll('.chart-point-hover');
    hoverPoints.forEach(point => {
      const period = point.getAttribute('data-period');
      const type = point.getAttribute('data-type');
      const value = parseFloat(point.getAttribute('data-value'));
      const otherValue = parseFloat(point.getAttribute(type === 'user' ? 'data-avg' : 'data-user'));

      // Hover para tooltip
      point.addEventListener('mouseenter', (e) => {
        if (tooltip && tooltipPeriod && tooltipUser && tooltipAvg && tooltipDiff) {
          const rect = svg.getBoundingClientRect();
          const pointRect = point.getBoundingClientRect();
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = e.clientX - rect.left;
          svgPoint.y = e.clientY - rect.top;

          tooltipPeriod.textContent = period;
          if (type === 'user') {
            tooltipUser.textContent = `Usuario: ${value.toFixed(2)}`;
            tooltipAvg.textContent = `Promedio: ${otherValue.toFixed(2)}`;
          } else {
            tooltipUser.textContent = `Usuario: ${otherValue.toFixed(2)}`;
            tooltipAvg.textContent = `Promedio: ${value.toFixed(2)}`;
          }
          const diff = (type === 'user' ? value : otherValue) - (type === 'user' ? otherValue : value);
          tooltipDiff.textContent = `Diferencia: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
          tooltipDiff.setAttribute('fill', diff >= 0 ? '#10b981' : '#ef4444');

          tooltip.setAttribute('transform', `translate(${svgPoint.x - 70}, ${svgPoint.y - 90})`);
          tooltip.style.display = 'block';
        }
      });

      point.addEventListener('mouseleave', () => {
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      });

      point.addEventListener('mousemove', (e) => {
        if (tooltip && tooltip.style.display !== 'none') {
          const rect = svg.getBoundingClientRect();
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = e.clientX - rect.left;
          svgPoint.y = e.clientY - rect.top;
          tooltip.setAttribute('transform', `translate(${svgPoint.x - 70}, ${svgPoint.y - 90})`);
        }
      });

      // Click para detalles
      point.addEventListener('click', () => {
        this.showPeriodDetails(period, periods);
      });
    });

    // Leyendas interactivas
    const legendItems = svg.querySelectorAll('.chart-legend-item');
    legendItems.forEach(item => {
      item.addEventListener('click', () => {
        const series = item.getAttribute('data-series');
        if (series === 'user') {
          userLineVisible = !userLineVisible;
          const userLine = svg.querySelector('path[stroke="var(--user-history-primary)"]');
          const userPath = svg.querySelector('path[fill="url(#userLineGradient)"]');
          const userPoints = svg.querySelectorAll('.chart-point-user');
          const userLabels = svg.querySelectorAll('.chart-value-label');
          if (userLine) userLine.style.opacity = userLineVisible ? '1' : '0.3';
          if (userPath) userPath.style.opacity = userLineVisible ? '1' : '0.3';
          userPoints.forEach(p => p.style.opacity = userLineVisible ? '1' : '0.3');
          userLabels.forEach((label, i) => {
            if (i % 2 === 0) label.style.opacity = userLineVisible ? '1' : '0.3';
          });
          const legendLine = item.querySelector('.legend-line-user');
          const legendText = item.querySelector('.legend-text-user');
          if (legendLine) legendLine.style.opacity = userLineVisible ? '1' : '0.3';
          if (legendText) legendText.style.opacity = userLineVisible ? '1' : '0.5';
        } else if (series === 'avg') {
          avgLineVisible = !avgLineVisible;
          const avgLine = svg.querySelector('path[stroke="#666"]');
          const avgPath = svg.querySelector('path[fill="url(#avgLineGradient)"]');
          const avgPoints = svg.querySelectorAll('.chart-point-avg');
          const avgLabels = svg.querySelectorAll('.chart-value-label');
          if (avgLine) avgLine.style.opacity = avgLineVisible ? '0.7' : '0.2';
          if (avgPath) avgPath.style.opacity = avgLineVisible ? '1' : '0.2';
          avgPoints.forEach(p => p.style.opacity = avgLineVisible ? '1' : '0.2');
          avgLabels.forEach((label, i) => {
            if (i % 2 === 1) label.style.opacity = avgLineVisible ? '1' : '0.2';
          });
          const legendLine = item.querySelector('.legend-line-avg');
          const legendText = item.querySelector('.legend-text-avg');
          if (legendLine) legendLine.style.opacity = avgLineVisible ? '0.7' : '0.2';
          if (legendText) legendText.style.opacity = avgLineVisible ? '1' : '0.5';
        }
      });
    });
  }

  /**
   * Muestra detalles de un período específico
   */
  showPeriodDetails(periodLabel, periods) {
    // Encontrar el período correspondiente
    const periodMap = {
      'Semana': 'last_week',
      'Mes': 'last_month',
      '3 Meses': 'last_3_months',
      '6 Meses': 'last_6_months'
    };
    const periodKey = periodMap[periodLabel];
    if (!periodKey) return;

    const periodData = this.currentUserData[periodKey];
    const metadataPeriod = this.metadataUsers?.periods?.[periodKey];
    
    if (!periodData) return;

    const combined = periodData.each_stow?.combined;
    const stp = periodData.each_stow?.stow_to_prime;
    const ti = periodData.each_stow?.transfer_in;

    // Crear modal de detalles
    const modal = document.createElement('div');
    modal.className = 'period-details-modal';
    modal.innerHTML = `
      <div class="period-details-content">
        <div class="period-details-header">
          <h3>Detalles del Período: ${periodLabel}</h3>
          <button class="period-details-close">&times;</button>
        </div>
        <div class="period-details-body">
          ${combined ? `
            <div class="period-detail-section">
              <h4>Combined</h4>
              <div class="period-detail-grid">
                <div class="period-detail-item">
                  <span class="period-detail-label">Rate:</span>
                  <span class="period-detail-value">${combined.rate?.toFixed(2) || '-'}</span>
                </div>
                <div class="period-detail-item">
                  <span class="period-detail-label">Artículos:</span>
                  <span class="period-detail-value">${combined.total_units?.toLocaleString() || '-'}</span>
                </div>
                <div class="period-detail-item">
                  <span class="period-detail-label">Horas:</span>
                  <span class="period-detail-value">${combined.total_hours?.toFixed(1) || '-'}h</span>
                </div>
                <div class="period-detail-item">
                  <span class="period-detail-label">Rank:</span>
                  <span class="period-detail-value">#${combined.rank || '-'} / ${combined.total_users || '-'}</span>
                </div>
                <div class="period-detail-item">
                  <span class="period-detail-label">Percentil:</span>
                  <span class="period-detail-value">${combined.percentile?.toFixed(1) || '-'}%</span>
                </div>
                <div class="period-detail-item">
                  <span class="period-detail-label">Promedio General:</span>
                  <span class="period-detail-value">${(metadataPeriod?.each_stow?.combined?.avg || combined.avg_general || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ` : ''}
          ${stp ? `
            <div class="period-detail-section">
              <h4>Stow to Prime</h4>
              <div class="period-detail-grid">
                <div class="period-detail-item">
                  <span class="period-detail-label">Rate:</span>
                  <span class="period-detail-value">${stp.rate?.toFixed(2) || '-'}</span>
                </div>
                <div class="period-detail-item">
                  <span class="period-detail-label">Artículos:</span>
                  <span class="period-detail-value">${stp.total_units?.toLocaleString() || '-'}</span>
                </div>
                <div class="period-detail-item">
                  <span class="period-detail-label">Horas:</span>
                  <span class="period-detail-value">${stp.total_hours?.toFixed(1) || '-'}h</span>
                </div>
              </div>
            </div>
          ` : ''}
          ${ti ? `
            <div class="period-detail-section">
              <h4>Transfer In</h4>
              <div class="period-detail-grid">
                <div class="period-detail-item">
                  <span class="period-detail-label">Rate:</span>
                  <span class="period-detail-value">${ti.rate?.toFixed(2) || '-'}</span>
                </div>
                <div class="period-detail-item">
                  <span class="period-detail-label">Artículos:</span>
                  <span class="period-detail-value">${ti.total_units?.toLocaleString() || '-'}</span>
                </div>
                <div class="period-detail-item">
                  <span class="period-detail-label">Horas:</span>
                  <span class="period-detail-value">${ti.total_hours?.toFixed(1) || '-'}h</span>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Cerrar modal
    const closeBtn = modal.querySelector('.period-details-close');
    const closeModal = () => {
      modal.remove();
    };
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  /**
   * Actualiza gráfico de evolución Stow to Prime (solo departamento Stow)
   */
  updateStowToPrimeEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("stp-evolution-chart");
    if (chartEl && this.currentDepartment !== "each_stow") {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">Selecciona Stow para ver este gráfico</div>';
      return;
    }
    this._renderTaskRateEvolutionChart("stp-evolution-chart", "stow_to_prime", periods, periodLabels, "stp");
  }

  /**
   * Actualiza gráfico de evolución Transfer In / TSI (solo departamento Stow)
   */
  updateTransferInEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("tsi-evolution-chart");
    if (chartEl && this.currentDepartment !== "each_stow") {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">Selecciona Stow para ver este gráfico</div>';
      return;
    }
    this._renderTaskRateEvolutionChart("tsi-evolution-chart", "transfer_in", periods, periodLabels, "tsi");
  }

  /**
   * Helper: renderiza gráfico de evolución usuario vs promedio para un tipo de tarea
   */
  _renderTaskRateEvolutionChart(chartId, taskKey, periods, periodLabels, gradientPrefix) {
    const chartEl = document.getElementById(chartId);
    if (!chartEl) return;

    const dataPoints = [];
    const periodsWithData = [];

    periods.forEach(period => {
      const periodData = this.currentUserData[period];
      const metadataPeriod = this.metadataUsers?.periods?.[period];
      const taskData = periodData?.each_stow?.[taskKey];
      const metaTask = metadataPeriod?.each_stow?.[taskKey];

      if (taskData?.rate !== undefined) {
        const userRate = taskData.rate;
        const avgRate = metaTask?.avg ?? taskData.avg_general ?? 0;

        dataPoints.push({
          period: periodLabels[period],
          userRate,
          avgRate
        });
        periodsWithData.push(periodLabels[period]);
      }
    });

    if (dataPoints.length === 0) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos suficientes para mostrar la evolución</div>';
      return;
    }

    const maxRate = Math.max(...dataPoints.map(d => Math.max(d.userRate, d.avgRate))) * 1.1;
    const chartHeight = 300;
    const chartWidth = Math.max(600, periodsWithData.length * 150);
    const padding = { top: 40, right: 180, bottom: 60, left: 60 };
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;
    const idUser = gradientPrefix + "UserLineGradient";
    const idAvg = gradientPrefix + "AvgLineGradient";
    const tooltipId = gradientPrefix + "-chart-tooltip";

    let svg = `
      <svg width="${chartWidth}" height="${chartHeight}" style="overflow: visible;">
        <defs>
          <linearGradient id="${idUser}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:var(--user-history-primary);stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:var(--user-history-primary);stop-opacity:0" />
          </linearGradient>
          <linearGradient id="${idAvg}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#666;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#666;stop-opacity:0" />
          </linearGradient>
        </defs>
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + graphHeight}" stroke="var(--user-history-border)" stroke-width="2"/>
        <line x1="${padding.left}" y1="${padding.top + graphHeight}" x2="${padding.left + graphWidth}" y2="${padding.top + graphHeight}" stroke="var(--user-history-border)" stroke-width="2"/>
    `;

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight * (1 - i / 5));
      const value = (maxRate * i / 5).toFixed(0);
      svg += `<line x1="${padding.left - 5}" y1="${y}" x2="${padding.left + graphWidth}" y2="${y}" stroke="var(--user-history-border)" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>
        <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="var(--user-history-text-secondary)">${value}</text>`;
    }

    let userPath = `M ${padding.left},${padding.top + graphHeight}`;
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.userRate / maxRate * graphHeight);
      userPath += ` L ${x},${y}`;
    });
    userPath += ` L ${padding.left + graphWidth},${padding.top + graphHeight} Z`;
    svg += `<path d="${userPath}" fill="url(#${idUser})"/>`;

    let avgPath = `M ${padding.left},${padding.top + graphHeight}`;
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
      avgPath += ` L ${x},${y}`;
    });
    avgPath += ` L ${padding.left + graphWidth},${padding.top + graphHeight} Z`;
    svg += `<path d="${avgPath}" fill="url(#${idAvg})"/>`;

    let userLinePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].userRate / maxRate * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.userRate / maxRate * graphHeight);
        userLinePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${userLinePath}" fill="none" stroke="var(--user-history-primary)" stroke-width="3" stroke-linecap="round"/>`;

    let avgLinePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].avgRate / maxRate * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
        avgLinePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${avgLinePath}" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5" opacity="0.7"/>`;

    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const userY = padding.top + graphHeight - (point.userRate / maxRate * graphHeight);
      const avgY = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
      const hoverRadius = 12;
      svg += `<circle cx="${x}" cy="${userY}" r="${hoverRadius}" fill="transparent" class="chart-point-hover" data-period="${point.period}" data-type="user" data-value="${point.userRate.toFixed(2)}" data-avg="${point.avgRate.toFixed(2)}" style="cursor: pointer;"/>`;
      svg += `<circle cx="${x}" cy="${avgY}" r="${hoverRadius}" fill="transparent" class="chart-point-hover" data-period="${point.period}" data-type="avg" data-value="${point.avgRate.toFixed(2)}" data-user="${point.userRate.toFixed(2)}" style="cursor: pointer;"/>`;
      svg += `<circle cx="${x}" cy="${userY}" r="5" fill="var(--user-history-primary)" stroke="white" stroke-width="2" class="chart-point-user" data-period="${point.period}" style="cursor: pointer;"/>`;
      svg += `<circle cx="${x}" cy="${avgY}" r="4" fill="#666" stroke="white" stroke-width="2" class="chart-point-avg" data-period="${point.period}" style="cursor: pointer;"/>`;
      svg += `<text x="${x}" y="${userY - 10}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--user-history-primary)" class="chart-value-label" style="pointer-events: none;">${point.userRate.toFixed(1)}</text>`;
      svg += `<text x="${x}" y="${avgY - 10}" text-anchor="middle" font-size="10" fill="#666" class="chart-value-label" style="pointer-events: none;">${point.avgRate.toFixed(1)}</text>`;
      svg += `<text x="${x}" y="${padding.top + graphHeight + 20}" text-anchor="middle" font-size="11" fill="var(--user-history-text-secondary)" style="pointer-events: none;">${point.period}</text>`;
    });

    const legendX = chartWidth - padding.right + 20;
    const legendY = padding.top + 20;
    svg += `<g transform="translate(${legendX}, ${legendY})">
        <g class="chart-legend-item" data-series="user" style="cursor: pointer;">
          <line x1="0" y1="10" x2="30" y2="10" stroke="var(--user-history-primary)" stroke-width="3" class="legend-line-user"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-user">Usuario</text>
        </g>
        <g class="chart-legend-item" data-series="avg" style="cursor: pointer;" transform="translate(0, 20)">
          <line x1="0" y1="10" x2="30" y2="10" stroke="#666" stroke-width="2" stroke-dasharray="5,5" opacity="0.7" class="legend-line-avg"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-avg">Promedio</text>
        </g>
      </g>`;

    svg += `<g id="${tooltipId}" style="display: none; pointer-events: none;">
        <rect x="0" y="0" width="140" height="80" fill="rgba(0,0,0,0.85)" rx="6" ry="6"/>
        <text x="10" y="20" font-size="12" font-weight="600" fill="white" id="tooltip-period">Período</text>
        <text x="10" y="40" font-size="11" fill="#a0d2ff" id="tooltip-user">Usuario: -</text>
        <text x="10" y="55" font-size="11" fill="#cccccc" id="tooltip-avg">Promedio: -</text>
        <text x="10" y="70" font-size="11" font-weight="600" fill="white" id="tooltip-diff">Diferencia: -</text>
      </g>`;

    svg += "</svg>";
    chartEl.innerHTML = svg;
    this._setupTaskRateChartInteractivity(chartEl, dataPoints, periods, tooltipId);
  }

  _setupTaskRateChartInteractivity(chartEl, dataPoints, periods, tooltipId) {
    const svg = chartEl.querySelector("svg");
    if (!svg) return;

    const tooltip = svg.querySelector(`#${tooltipId}`);
    const tooltipPeriod = tooltip?.querySelector("#tooltip-period");
    const tooltipUser = tooltip?.querySelector("#tooltip-user");
    const tooltipAvg = tooltip?.querySelector("#tooltip-avg");
    const tooltipDiff = tooltip?.querySelector("#tooltip-diff");

    const hoverPoints = svg.querySelectorAll(".chart-point-hover");
    hoverPoints.forEach(point => {
      const period = point.getAttribute("data-period");
      const type = point.getAttribute("data-type");
      const value = parseFloat(point.getAttribute("data-value"));
      const otherValue = parseFloat(point.getAttribute(type === "user" ? "data-avg" : "data-user"));

      point.addEventListener("mouseenter", (e) => {
        if (tooltip && tooltipPeriod && tooltipUser && tooltipAvg && tooltipDiff) {
          const rect = svg.getBoundingClientRect();
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = e.clientX - rect.left;
          svgPoint.y = e.clientY - rect.top;
          tooltipPeriod.textContent = period;
          if (type === "user") {
            tooltipUser.textContent = `Usuario: ${value.toFixed(2)}`;
            tooltipAvg.textContent = `Promedio: ${otherValue.toFixed(2)}`;
          } else {
            tooltipUser.textContent = `Usuario: ${otherValue.toFixed(2)}`;
            tooltipAvg.textContent = `Promedio: ${value.toFixed(2)}`;
          }
          const diff = (type === "user" ? value : otherValue) - (type === "user" ? otherValue : value);
          tooltipDiff.textContent = `Diferencia: ${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`;
          tooltipDiff.setAttribute("fill", diff >= 0 ? "#10b981" : "#ef4444");
          tooltip.setAttribute("transform", `translate(${svgPoint.x - 70}, ${svgPoint.y - 90})`);
          tooltip.style.display = "block";
        }
      });

      point.addEventListener("mouseleave", () => {
        if (tooltip) tooltip.style.display = "none";
      });

      point.addEventListener("mousemove", (e) => {
        if (tooltip && tooltip.style.display !== "none") {
          const rect = svg.getBoundingClientRect();
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = e.clientX - rect.left;
          svgPoint.y = e.clientY - rect.top;
          tooltip.setAttribute("transform", `translate(${svgPoint.x - 70}, ${svgPoint.y - 90})`);
        }
      });

      point.addEventListener("click", () => {
        this.showPeriodDetails(period, periods);
      });
    });
  }

  /**
   * Actualiza gráfico de evolución del percentil (según departamento actual)
   */
  updatePercentileEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("percentile-evolution-chart");
    if (!chartEl) return;

    const dept = this.currentDepartment;
    const dataPoints = [];
    periods.forEach(period => {
      const periodData = this.currentUserData[period];
      const metrics = this.getDepartmentMetrics(periodData, dept);
      if (metrics?.percentile != null) {
        dataPoints.push({ period: periodLabels[period], percentile: metrics.percentile });
      }
    });

    if (dataPoints.length === 0) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos</div>';
      return;
    }

    // Crear gráfico de área
    const chartHeight = 250;
    const chartWidth = Math.max(400, dataPoints.length * 120);
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;

    let svg = `<svg width="${chartWidth}" height="${chartHeight}">`;
    
    // Ejes
    svg += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + graphHeight}" stroke="var(--user-history-border)" stroke-width="2"/>`;
    svg += `<line x1="${padding.left}" y1="${padding.top + graphHeight}" x2="${padding.left + graphWidth}" y2="${padding.top + graphHeight}" stroke="var(--user-history-border)" stroke-width="2"/>`;

    // Líneas de referencia (0%, 25%, 50%, 75%, 100%)
    [0, 25, 50, 75, 100].forEach(percent => {
      const y = padding.top + graphHeight - (percent / 100 * graphHeight);
      svg += `<line x1="${padding.left - 5}" y1="${y}" x2="${padding.left + graphWidth}" y2="${y}" stroke="var(--user-history-border)" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>`;
      svg += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--user-history-text-secondary)">${percent}%</text>`;
    });

    const userColor = "var(--user-history-chart-user)";
    const avgColor = "var(--user-history-chart-avg)";
    // Línea de referencia promedio (50%)
    const ref50y = padding.top + graphHeight - (50 / 100 * graphHeight);
    svg += `<line x1="${padding.left}" y1="${ref50y}" x2="${padding.left + graphWidth}" y2="${ref50y}" stroke="${avgColor}" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.8"/>`;
    svg += `<text x="${padding.left + graphWidth + 6}" y="${ref50y + 4}" font-size="10" fill="${avgColor}">Promedio 50%</text>`;

    // Área bajo la curva
    let areaPath = `M ${padding.left},${padding.top + graphHeight}`;
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.percentile / 100 * graphHeight);
      areaPath += ` L ${x},${y}`;
    });
    areaPath += ` L ${padding.left + graphWidth},${padding.top + graphHeight} Z`;
    svg += `<path d="${areaPath}" fill="${userColor}" opacity="0.25"/>`;

    // Línea usuario
    let linePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].percentile / 100 * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.percentile / 100 * graphHeight);
        linePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${linePath}" fill="none" stroke="${userColor}" stroke-width="3.5" stroke-linecap="round"/>`;

    // Puntos con interactividad
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.percentile / 100 * graphHeight);
      
      // Área invisible más grande para facilitar hover y click
      const hoverRadius = 12;
      svg += `<circle cx="${x}" cy="${y}" r="${hoverRadius}" fill="transparent" class="chart-point-hover" 
              data-period="${point.period}" data-value="${point.percentile.toFixed(2)}" style="cursor: pointer;"/>`;
      
      // Punto visible
      svg += `<circle cx="${x}" cy="${y}" r="5" fill="${userColor}" stroke="white" stroke-width="2" 
              class="chart-point-percentile" data-period="${point.period}" style="cursor: pointer;"/>`;
      svg += `<text x="${x}" y="${y - 10}" text-anchor="middle" font-size="11" font-weight="600" 
              fill="${userColor}" class="chart-value-label" style="pointer-events: none;">${point.percentile.toFixed(1)}%</text>`;
      svg += `<text x="${x}" y="${padding.top + graphHeight + 20}" text-anchor="middle" font-size="11" 
              fill="var(--user-history-text-secondary)" style="pointer-events: none;">${point.period}</text>`;
    });

    // Tooltip
    svg += `
      <g id="percentile-chart-tooltip" style="display: none; pointer-events: none;">
        <rect x="0" y="0" width="120" height="60" fill="rgba(0,0,0,0.85)" rx="6" ry="6"/>
        <text x="10" y="20" font-size="12" font-weight="600" fill="white" id="tooltip-period-pct">Período</text>
        <text x="10" y="40" font-size="11" fill="var(--user-history-chart-user)" id="tooltip-percentile">Percentil: -</text>
      </g>
    `;

    svg += '</svg>';
    chartEl.innerHTML = svg;
    
    // Agregar interactividad después de insertar el SVG
    this.setupPercentileChartInteractivity(chartEl, dataPoints, periods);
  }

  /**
   * Configura interactividad para el gráfico de evolución del percentil
   */
  setupPercentileChartInteractivity(chartEl, dataPoints, periods) {
    const svg = chartEl.querySelector('svg');
    if (!svg) return;

    const tooltip = svg.querySelector('#percentile-chart-tooltip');
    const tooltipPeriod = svg.querySelector('#tooltip-period-pct');
    const tooltipPercentile = svg.querySelector('#tooltip-percentile');

    // Tooltips y click en puntos
    const hoverPoints = svg.querySelectorAll('.chart-point-hover');
    hoverPoints.forEach(point => {
      const period = point.getAttribute('data-period');
      const value = parseFloat(point.getAttribute('data-value'));

      // Hover para tooltip
      point.addEventListener('mouseenter', (e) => {
        if (tooltip && tooltipPeriod && tooltipPercentile) {
          const rect = svg.getBoundingClientRect();
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = e.clientX - rect.left;
          svgPoint.y = e.clientY - rect.top;

          tooltipPeriod.textContent = period;
          tooltipPercentile.textContent = `Percentil: ${value.toFixed(1)}%`;

          tooltip.setAttribute('transform', `translate(${svgPoint.x - 60}, ${svgPoint.y - 70})`);
          tooltip.style.display = 'block';
        }
      });

      point.addEventListener('mouseleave', () => {
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      });

      point.addEventListener('mousemove', (e) => {
        if (tooltip && tooltip.style.display !== 'none') {
          const rect = svg.getBoundingClientRect();
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = e.clientX - rect.left;
          svgPoint.y = e.clientY - rect.top;
          tooltip.setAttribute('transform', `translate(${svgPoint.x - 60}, ${svgPoint.y - 70})`);
        }
      });

      // Click para detalles
      point.addEventListener('click', () => {
        this.showPeriodDetails(period, periods);
      });
    });
  }

  /**
   * Actualiza gráfico de evolución del rate por esfuerzo (solo Stow)
   */
  updateEffortRateEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("effort-rate-evolution-chart");
    if (!chartEl) return;
    if (this.currentDepartment !== "each_stow") {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">Solo disponible para Stow</div>';
      return;
    }

    const dataPoints = [];
    periods.forEach(period => {
      const periodData = this.currentUserData[period];
      if (periodData?.rate_por_esfuerzo?.rate_por_esfuerzo !== undefined) {
        const userRate = periodData.rate_por_esfuerzo.rate_por_esfuerzo;
        const avgRate = periodData.rate_por_esfuerzo.avg_rate_esfuerzo_general || 0;
        
        dataPoints.push({
          period: periodLabels[period],
          effortRate: userRate,
          avgRate: avgRate
        });
      }
    });

    if (dataPoints.length === 0) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos suficientes</div>';
      return;
    }

    // Crear gráfico de línea temporal
    const maxRate = Math.max(...dataPoints.map(d => Math.max(d.effortRate, d.avgRate))) * 1.1;
    const chartHeight = 250;
    const chartWidth = Math.max(400, dataPoints.length * 120);
    const padding = { top: 40, right: 180, bottom: 60, left: 60 }; // Más espacio a la derecha para la leyenda
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;

    const effortUserColor = "var(--user-history-esfuerzo)";
    const effortAvgColor = "var(--user-history-chart-avg)";
    let svg = `
      <svg width="${chartWidth}" height="${chartHeight}" style="overflow: visible;">
        <defs>
          <linearGradient id="effortLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${effortUserColor};stop-opacity:0.35" />
            <stop offset="100%" style="stop-color:${effortUserColor};stop-opacity:0" />
          </linearGradient>
          <linearGradient id="effortAvgLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${effortAvgColor};stop-opacity:0.25" />
            <stop offset="100%" style="stop-color:${effortAvgColor};stop-opacity:0" />
          </linearGradient>
        </defs>
        
        <!-- Ejes -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + graphHeight}" 
              stroke="var(--user-history-border)" stroke-width="2"/>
        <line x1="${padding.left}" y1="${padding.top + graphHeight}" x2="${padding.left + graphWidth}" y2="${padding.top + graphHeight}" 
              stroke="var(--user-history-border)" stroke-width="2"/>
        
        <!-- Líneas de referencia -->
    `;

    // Líneas de referencia horizontales
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight * (1 - i / 5));
      const value = (maxRate * i / 5).toFixed(0);
      svg += `
        <line x1="${padding.left - 5}" y1="${y}" x2="${padding.left + graphWidth}" y2="${y}" 
              stroke="var(--user-history-border)" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>
        <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="var(--user-history-text-secondary)">${value}</text>
      `;
    }

    // Área bajo la línea del usuario
    let userAreaPath = `M ${padding.left},${padding.top + graphHeight}`;
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.effortRate / maxRate * graphHeight);
      userAreaPath += ` L ${x},${y}`;
    });
    userAreaPath += ` L ${padding.left + graphWidth},${padding.top + graphHeight} Z`;
    svg += `<path d="${userAreaPath}" fill="url(#effortLineGradient)"/>`;

    // Área bajo la línea del promedio
    let avgAreaPath = `M ${padding.left},${padding.top + graphHeight}`;
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
      avgAreaPath += ` L ${x},${y}`;
    });
    avgAreaPath += ` L ${padding.left + graphWidth},${padding.top + graphHeight} Z`;
    svg += `<path d="${avgAreaPath}" fill="url(#effortAvgLineGradient)"/>`;

    // Línea del usuario
    let userLinePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].effortRate / maxRate * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.effortRate / maxRate * graphHeight);
        userLinePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${userLinePath}" fill="none" stroke="${effortUserColor}" stroke-width="3.5" stroke-linecap="round" class="effort-user-line"/>`;

    // Línea del promedio
    let avgLinePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].avgRate / maxRate * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
        avgLinePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${avgLinePath}" fill="none" stroke="${effortAvgColor}" stroke-width="2" stroke-dasharray="5,5" opacity="0.85" class="effort-avg-line"/>`;

    // Puntos con interactividad
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const userY = padding.top + graphHeight - (point.effortRate / maxRate * graphHeight);
      const avgY = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
      
      // Área invisible más grande para facilitar hover y click
      const hoverRadius = 12;
      svg += `<circle cx="${x}" cy="${userY}" r="${hoverRadius}" fill="transparent" class="chart-point-hover" 
              data-period="${point.period}" data-type="user" data-value="${point.effortRate.toFixed(2)}" 
              data-avg="${point.avgRate.toFixed(2)}" style="cursor: pointer;"/>`;
      svg += `<circle cx="${x}" cy="${avgY}" r="${hoverRadius}" fill="transparent" class="chart-point-hover" 
              data-period="${point.period}" data-type="avg" data-value="${point.avgRate.toFixed(2)}" 
              data-user="${point.effortRate.toFixed(2)}" style="cursor: pointer;"/>`;
      
      // Puntos visibles (naranja para esfuerzo)
      svg += `<circle cx="${x}" cy="${userY}" r="5" fill="${effortUserColor}" stroke="white" stroke-width="2" 
              class="chart-point-effort-user" data-period="${point.period}" style="cursor: pointer;"/>`;
      svg += `<circle cx="${x}" cy="${avgY}" r="4" fill="${effortAvgColor}" stroke="white" stroke-width="2" 
              class="chart-point-effort-avg" data-period="${point.period}" style="cursor: pointer;"/>`;
      
      // Etiquetas de valor
      svg += `<text x="${x}" y="${userY - 10}" text-anchor="middle" font-size="11" font-weight="600" 
              fill="${effortUserColor}" class="chart-value-label" style="pointer-events: none;">${point.effortRate.toFixed(1)}</text>`;
      svg += `<text x="${x}" y="${avgY - 10}" text-anchor="middle" font-size="10" 
              fill="${effortAvgColor}" class="chart-value-label" style="pointer-events: none;">${point.avgRate.toFixed(1)}</text>`;
      
      // Etiquetas de período
      svg += `<text x="${x}" y="${padding.top + graphHeight + 20}" text-anchor="middle" font-size="11" 
              fill="var(--user-history-text-secondary)" style="pointer-events: none;">${point.period}</text>`;
    });

    // Leyenda interactiva (fuera del área del gráfico, a la derecha)
    const legendX = chartWidth - padding.right + 20;
    const legendY = padding.top + 20;
    svg += `
      <g transform="translate(${legendX}, ${legendY})">
        <g class="chart-legend-item" data-series="user" style="cursor: pointer;">
          <line x1="0" y1="10" x2="30" y2="10" stroke="${effortUserColor}" stroke-width="3" class="legend-line-user-effort"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-user-effort">Usuario</text>
        </g>
        <g class="chart-legend-item" data-series="avg" style="cursor: pointer;" transform="translate(0, 20)">
          <line x1="0" y1="10" x2="30" y2="10" stroke="${effortAvgColor}" stroke-width="2" stroke-dasharray="5,5" opacity="0.85" class="legend-line-avg-effort"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-avg-effort">Promedio</text>
        </g>
      </g>
    `;

    // Tooltip
    svg += `
      <g id="effort-chart-tooltip" style="display: none; pointer-events: none;">
        <rect x="0" y="0" width="140" height="80" fill="rgba(0,0,0,0.85)" rx="6" ry="6"/>
        <text x="10" y="20" font-size="12" font-weight="600" fill="white" id="tooltip-period-effort">Período</text>
        <text x="10" y="40" font-size="11" fill="${effortUserColor}" id="tooltip-effort-user">Usuario: -</text>
        <text x="10" y="55" font-size="11" fill="#cccccc" id="tooltip-effort-avg">Promedio: -</text>
        <text x="10" y="70" font-size="11" font-weight="600" fill="white" id="tooltip-effort-diff">Diferencia: -</text>
      </g>
    `;

    svg += '</svg>';
    chartEl.innerHTML = svg;
    
    // Agregar interactividad después de insertar el SVG
    this.setupEffortRateChartInteractivity(chartEl, dataPoints, periods);
  }

  /**
   * Configura interactividad para el gráfico de evolución del rate por esfuerzo
   */
  setupEffortRateChartInteractivity(chartEl, dataPoints, periods) {
    const svg = chartEl.querySelector('svg');
    if (!svg) return;

    const tooltip = svg.querySelector('#effort-chart-tooltip');
    const tooltipPeriod = svg.querySelector('#tooltip-period-effort');
    const tooltipUser = svg.querySelector('#tooltip-effort-user');
    const tooltipAvg = svg.querySelector('#tooltip-effort-avg');
    const tooltipDiff = svg.querySelector('#tooltip-effort-diff');

    let userLineVisible = true;
    let avgLineVisible = true;

    // Tooltips y click en puntos
    const hoverPoints = svg.querySelectorAll('.chart-point-hover');
    hoverPoints.forEach(point => {
      const period = point.getAttribute('data-period');
      const type = point.getAttribute('data-type');
      const value = parseFloat(point.getAttribute('data-value'));
      const otherValue = parseFloat(point.getAttribute(type === 'user' ? 'data-avg' : 'data-user'));

      // Hover para tooltip
      point.addEventListener('mouseenter', (e) => {
        if (tooltip && tooltipPeriod && tooltipUser && tooltipAvg && tooltipDiff) {
          const rect = svg.getBoundingClientRect();
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = e.clientX - rect.left;
          svgPoint.y = e.clientY - rect.top;

          tooltipPeriod.textContent = period;
          if (type === 'user') {
            tooltipUser.textContent = `Usuario: ${value.toFixed(2)}`;
            tooltipAvg.textContent = `Promedio: ${otherValue.toFixed(2)}`;
          } else {
            tooltipUser.textContent = `Usuario: ${otherValue.toFixed(2)}`;
            tooltipAvg.textContent = `Promedio: ${value.toFixed(2)}`;
          }
          const diff = (type === 'user' ? value : otherValue) - (type === 'user' ? otherValue : value);
          tooltipDiff.textContent = `Diferencia: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
          tooltipDiff.setAttribute('fill', diff >= 0 ? '#10b981' : '#ef4444');

          tooltip.setAttribute('transform', `translate(${svgPoint.x - 70}, ${svgPoint.y - 90})`);
          tooltip.style.display = 'block';
        }
      });

      point.addEventListener('mouseleave', () => {
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      });

      point.addEventListener('mousemove', (e) => {
        if (tooltip && tooltip.style.display !== 'none') {
          const rect = svg.getBoundingClientRect();
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = e.clientX - rect.left;
          svgPoint.y = e.clientY - rect.top;
          tooltip.setAttribute('transform', `translate(${svgPoint.x - 70}, ${svgPoint.y - 90})`);
        }
      });

      // Click para detalles
      point.addEventListener('click', () => {
        this.showPeriodDetails(period, periods);
      });
    });

    // Leyendas interactivas
    const legendItems = svg.querySelectorAll('.chart-legend-item');
    legendItems.forEach(item => {
      item.addEventListener('click', () => {
        const series = item.getAttribute('data-series');
        if (series === 'user') {
          userLineVisible = !userLineVisible;
          const userLine = svg.querySelector('.effort-user-line');
          const userPath = svg.querySelector('path[fill="url(#effortLineGradient)"]');
          const userPoints = svg.querySelectorAll('.chart-point-effort-user');
          const userLabels = svg.querySelectorAll('.chart-value-label');
          if (userLine) userLine.style.opacity = userLineVisible ? '1' : '0.3';
          if (userPath) userPath.style.opacity = userLineVisible ? '1' : '0.3';
          userPoints.forEach(p => p.style.opacity = userLineVisible ? '1' : '0.3');
          userLabels.forEach((label, i) => {
            if (i % 2 === 0) label.style.opacity = userLineVisible ? '1' : '0.3';
          });
          const legendLine = item.querySelector('.legend-line-user-effort');
          const legendText = item.querySelector('.legend-text-user-effort');
          if (legendLine) legendLine.style.opacity = userLineVisible ? '1' : '0.3';
          if (legendText) legendText.style.opacity = userLineVisible ? '1' : '0.5';
        } else if (series === 'avg') {
          avgLineVisible = !avgLineVisible;
          const avgLine = svg.querySelector('.effort-avg-line');
          const avgPath = svg.querySelector('path[fill="url(#effortAvgLineGradient)"]');
          const avgPoints = svg.querySelectorAll('.chart-point-effort-avg');
          const avgLabels = svg.querySelectorAll('.chart-value-label');
          if (avgLine) avgLine.style.opacity = avgLineVisible ? '0.7' : '0.2';
          if (avgPath) avgPath.style.opacity = avgLineVisible ? '1' : '0.2';
          avgPoints.forEach(p => p.style.opacity = avgLineVisible ? '1' : '0.2');
          avgLabels.forEach((label, i) => {
            if (i % 2 === 1) label.style.opacity = avgLineVisible ? '1' : '0.2';
          });
          const legendLine = item.querySelector('.legend-line-avg-effort');
          const legendText = item.querySelector('.legend-text-avg-effort');
          if (legendLine) legendLine.style.opacity = avgLineVisible ? '0.7' : '0.2';
          if (legendText) legendText.style.opacity = avgLineVisible ? '1' : '0.5';
        }
      });
    });
  }

  /**
   * Obtiene la clase CSS según el percentil
   */
  getPercentileClass(percentile) {
    if (percentile >= 75) return "very-high";
    if (percentile >= 50) return "high";
    if (percentile >= 25) return "medium";
    return "low";
  }

  /**
   * Actualiza la tabla de rendimiento - Muestra TODAS las categorías con rate
   */
  updatePerformanceTable(userData, metadataData) {
    const tbody = document.querySelector("#performance-table tbody");
    if (!tbody) {
      console.error("❌ Tabla #performance-table tbody no encontrada");
      return;
    }
    
    tbody.innerHTML = "";
    
    console.log("📊 ===== ACTUALIZANDO TABLA DE RENDIMIENTO =====");
    console.log("📊 userData:", userData);
    console.log("📊 userData.each_stow:", userData?.each_stow);
    
    if (!userData || !userData.each_stow) {
      console.error("❌ No hay datos each_stow en userData");
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No hay datos disponibles</td></tr>';
      return;
    }
    
    // Mapeo de labels
    const taskLabels = {
      "combined": "Combined",
      "stow_to_prime": "Stow to Prime",
      "transfer_in": "Transfer In (TSI)",
      "stow_to_prime_e": "Stow to Prime (E)",
      "stow_to_prime_w": "Stow to Prime (W)",
      "transfer_in_e": "Transfer In (E)",
      "transfer_in_w": "Transfer In (W)",
      "combined_e": "Combined (E)",
      "combined_w": "Combined (W)"
    };
    
    // Orden de prioridad - PRINCIPALES PRIMERO
    const mainKeys = ["combined", "stow_to_prime", "transfer_in"];
    const secondaryKeys = ["stow_to_prime_e", "stow_to_prime_w", "transfer_in_e", "transfer_in_w", "combined_e", "combined_w"];
    
    // Obtener TODAS las claves que existen en each_stow
    const allTaskKeys = Object.keys(userData.each_stow);
    console.log("📊 Total de categorías encontradas:", allTaskKeys.length);
    console.log("📊 Categorías:", allTaskKeys);
    
    // Verificar que las principales existan
    mainKeys.forEach(key => {
      if (allTaskKeys.includes(key)) {
        const task = userData.each_stow[key];
        console.log(`✅ ${key} encontrado:`, task);
        if (task.rate !== undefined) {
          console.log(`   Rate: ${task.rate}`);
        } else {
          console.warn(`   ⚠️ ${key} NO tiene rate`);
        }
      } else {
        console.warn(`❌ ${key} NO encontrado en los datos`);
      }
    });
    
    // Ordenar: principales primero, luego secundarias, luego el resto
    const sortedTaskKeys = [];
    
    // Añadir principales en orden (OBLIGATORIO mostrarlas si existen)
    mainKeys.forEach(key => {
      if (allTaskKeys.includes(key)) {
        sortedTaskKeys.push(key);
        console.log(`✅ Categoría principal añadida: ${key}`);
      }
    });
    
    // Añadir secundarias en orden
    secondaryKeys.forEach(key => {
      if (allTaskKeys.includes(key)) sortedTaskKeys.push(key);
    });
    
    // Añadir cualquier otra que no esté en las listas
    allTaskKeys.forEach(key => {
      if (!sortedTaskKeys.includes(key)) sortedTaskKeys.push(key);
    });
    
    console.log("📊 Categorías ordenadas para mostrar:", sortedTaskKeys);
    
    // Procesar cada tarea - OBLIGATORIO mostrar todas las que tienen rate
    let rowsAdded = 0;
    sortedTaskKeys.forEach(taskKey => {
      const userTask = userData.each_stow[taskKey];
      
      if (!userTask) {
        console.warn(`⚠️ ${taskKey}: userTask es null/undefined`);
        return;
      }
      
      // OBLIGATORIO: Mostrar todas las que tienen rate válido
      if (userTask.rate === undefined || userTask.rate === null) {
        console.warn(`⚠️ Saltando ${taskKey}: no tiene rate válido (rate=${userTask.rate})`);
        return;
      }
      
      const metadataTask = metadataData?.each_stow?.[taskKey];
      const avg = metadataTask?.avg || 0;
      const taskLabel = taskLabels[taskKey] || taskKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const isMain = mainKeys.includes(taskKey);
      
      const row = document.createElement("tr");
      const rate = userTask.rate || 0;
      const diff = rate - avg;
      const diffPercent = avg > 0 ? ((diff / avg) * 100).toFixed(1) : 0;
      
      row.innerHTML = `
        <td><strong>${taskLabel}</strong>${isMain ? ' <span class="main-task-badge">Principal</span>' : ''}</td>
        <td>${rate.toFixed(2)}</td>
        <td>${avg.toFixed(2)}</td>
        <td class="${diff >= 0 ? 'positive' : 'negative'}">
          ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${diffPercent >= 0 ? '+' : ''}${diffPercent}%)
        </td>
        <td>${userTask.percentile !== undefined ? userTask.percentile.toFixed(1) + '%' : '-'}</td>
        <td>${userTask.rank !== undefined ? '#' + userTask.rank : '-'}</td>
        <td>${userTask.total_users || '-'}</td>
      `;
      if (isMain) row.classList.add("main-task-row");
      tbody.appendChild(row);
      rowsAdded++;
      
      console.log(`✅ Añadida fila para ${taskKey}: rate=${rate.toFixed(2)}, avg=${avg.toFixed(2)}`);
    });
    
    console.log(`📊 Total de filas añadidas: ${rowsAdded}`);
    
    if (rowsAdded === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
            No se encontraron datos de rendimiento para este período
          </td>
        </tr>
      `;
    }
    
    // Procesar tareas pallet_stow si existen
    if (userData.pallet_stow) {
      Object.keys(userData.pallet_stow).forEach(taskKey => {
        const userTask = userData.pallet_stow[taskKey];
        
        if (!userTask) return;
        
        // Para pallet, usar pallet_rate
        const rate = userTask.pallet_rate || 0;
        
        if (rate === 0) return; // Saltar si no hay rate
        
        const metadataTask = metadataData?.pallet_stow?.[taskKey];
        const avg = metadataTask?.avg_pallet_general || 0;
        
        const diff = rate - avg;
        const diffPercent = avg > 0 ? ((diff / avg) * 100).toFixed(1) : 0;
        
        const label = taskKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${label}</strong> <span class="pallet-badge">Pallet</span></td>
          <td>${rate.toFixed(2)}</td>
          <td>${avg.toFixed(2)}</td>
          <td class="${diff >= 0 ? 'positive' : 'negative'}">
            ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${diffPercent >= 0 ? '+' : ''}${diffPercent}%)
          </td>
          <td>${userTask.percentile_pallet !== undefined ? userTask.percentile_pallet.toFixed(1) + '%' : '-'}</td>
          <td>${userTask.rank_pallet !== undefined ? '#' + userTask.rank_pallet : '-'}</td>
          <td>${userTask.total_users || '-'}</td>
        `;
        row.classList.add("pallet-task-row");
        tbody.appendChild(row);
        rowsAdded++;
        console.log(`✅ Añadida fila pallet para ${taskKey}: rate=${rate.toFixed(2)}`);
      });
    }
    
    console.log(`📊 Total final de filas: ${rowsAdded}`);
  }

  /**
   * Actualiza las métricas de esfuerzo
   */
  updateEffortMetrics(userData, metadataData) {
    const effortData = userData.rate_por_esfuerzo;
    if (!effortData) return;
    
    // UPH
    const uphEl = document.getElementById("effort-uph");
    const uphAvgEl = document.getElementById("effort-uph-avg");
    if (uphEl && effortData.uph !== undefined) {
      uphEl.textContent = effortData.uph.toFixed(2);
    }
    if (uphAvgEl && effortData.avg_uph_general !== undefined) {
      uphAvgEl.textContent = effortData.avg_uph_general.toFixed(2);
    }
    
    // Rate por esfuerzo
    const rateEl = document.getElementById("effort-rate");
    const rateAvgEl = document.getElementById("effort-rate-avg");
    if (rateEl && effortData.rate_por_esfuerzo !== undefined) {
      rateEl.textContent = effortData.rate_por_esfuerzo.toFixed(2);
    }
    if (rateAvgEl && effortData.avg_rate_esfuerzo_general !== undefined) {
      rateAvgEl.textContent = effortData.avg_rate_esfuerzo_general.toFixed(2);
    }
    
    // Distancia
    const distanceEl = document.getElementById("effort-distance");
    const distanceHourEl = document.getElementById("effort-distance-hour");
    if (distanceEl && effortData.total_distance !== undefined) {
      distanceEl.textContent = effortData.total_distance.toFixed(2) + " m";
    }
    if (distanceHourEl && effortData.distance_per_hour !== undefined) {
      distanceHourEl.textContent = effortData.distance_per_hour.toFixed(2) + " m/h";
    }
    
    // ASINs y Bins
    const asinsEl = document.getElementById("effort-asins");
    const binsEl = document.getElementById("effort-bins");
    if (asinsEl && effortData.asins_unicos !== undefined) {
      asinsEl.textContent = effortData.asins_unicos;
    }
    if (binsEl && effortData.bins_unicos !== undefined) {
      binsEl.textContent = effortData.bins_unicos;
    }
    
    // Cambios de carro y errores
    const cartChangesEl = document.getElementById("effort-cart-changes");
    const unitsPerCartEl = document.getElementById("effort-units-per-cart");
    const errorsEl = document.getElementById("effort-errors");
    if (cartChangesEl && effortData.cart_changes !== undefined) {
      cartChangesEl.textContent = effortData.cart_changes;
    }
    if (unitsPerCartEl && effortData.promedio_units_por_cart !== undefined) {
      unitsPerCartEl.textContent = effortData.promedio_units_por_cart.toFixed(2);
    }
    if (errorsEl && effortData.errores !== undefined) {
      errorsEl.textContent = effortData.errores;
    }
    
    // Percentil y rank de esfuerzo
    const effortPercentileEl = document.getElementById("effort-percentile");
    const effortRankEl = document.getElementById("effort-rank");
    if (effortPercentileEl && effortData.percentile_esfuerzo !== undefined) {
      effortPercentileEl.textContent = effortData.percentile_esfuerzo.toFixed(1) + "%";
    }
    if (effortRankEl && effortData.rank_esfuerzo !== undefined) {
      effortRankEl.textContent = "#" + effortData.rank_esfuerzo;
    }
  }

  /**
   * Actualiza los gráficos comparativos
   */
  updateCharts(userData, metadataData) {
    console.log("📊 Actualizando gráficos con datos del período:", this.currentPeriod);
    
    // Gráfica principal: Rate Usuario vs Promedios
    this.updateRateComparisonChart(userData, metadataData);
    
    // Gráfica secundaria: Comparación por tipo de tarea
    this.updateTaskComparisonChart(userData, metadataData);
  }

  /**
   * Actualiza gráfica de comparación de rates
   */
  updateRateComparisonChart(userData, metadataData) {
    const chartEl = document.getElementById("rate-comparison-chart");
    if (!chartEl) {
      console.warn("⚠️ Elemento rate-comparison-chart no encontrado");
      return;
    }
    
    console.log("📊 Actualizando gráfica de comparación de rates...");
    
    // Obtener datos principales - verificar que existan
    const tasks = [
      { key: "combined", label: "Combined", userData: userData.each_stow?.combined, metadataData: metadataData?.each_stow?.combined },
      { key: "stow_to_prime", label: "Stow to Prime", userData: userData.each_stow?.stow_to_prime, metadataData: metadataData?.each_stow?.stow_to_prime },
      { key: "transfer_in", label: "Transfer In (TSI)", userData: userData.each_stow?.transfer_in, metadataData: metadataData?.each_stow?.transfer_in }
    ];
    
    // Filtrar solo las que tienen datos del usuario (metadata es opcional)
    const validTasks = tasks.filter(t => {
      const hasUserData = t.userData && t.userData.rate !== undefined && t.userData.rate !== null;
      return hasUserData;
    });
    
    console.log("📊 Tareas válidas encontradas:", validTasks.length, validTasks.map(t => t.label));
    
    if (validTasks.length === 0) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos disponibles para este período</div>';
      return;
    }
    
    // Crear gráfica de barras simple con HTML/CSS
    let html = '<div class="rate-comparison-bars">';
    
    validTasks.forEach(task => {
      const userRate = task.userData.rate;
      const avgRate = task.metadataData?.avg || 0; // Usar 0 si no hay metadata
      const maxRate = Math.max(userRate, avgRate || userRate) * 1.2; // 20% más para el máximo
      const userPercent = (userRate / maxRate) * 100;
      const avgPercent = avgRate > 0 ? (avgRate / maxRate) * 100 : 0;
      const diff = avgRate > 0 ? userRate - avgRate : 0;
      const diffPercent = avgRate > 0 ? ((diff / avgRate) * 100).toFixed(1) : 0;
      
      html += `
        <div class="rate-comparison-item">
          <div class="rate-comparison-label">
            <strong>${task.label}</strong>
            <span class="rate-diff ${diff >= 0 ? 'positive' : 'negative'}">
              ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${diffPercent >= 0 ? '+' : ''}${diffPercent}%)
            </span>
          </div>
          <div class="rate-comparison-bars-container">
            <div class="rate-bar-wrapper">
              <div class="rate-bar-label">Usuario</div>
              <div class="rate-bar">
                <div class="rate-bar-fill user-rate" style="width: ${userPercent}%">
                  <span class="rate-value">${userRate.toFixed(2)}</span>
                </div>
              </div>
            </div>
            ${avgRate > 0 ? `
            <div class="rate-bar-wrapper">
              <div class="rate-bar-label">Promedio</div>
              <div class="rate-bar">
                <div class="rate-bar-fill avg-rate" style="width: ${avgPercent}%">
                  <span class="rate-value">${avgRate.toFixed(2)}</span>
                </div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    chartEl.innerHTML = html;
  }

  /**
   * Actualiza gráfica de comparación por tipo de tarea
   */
  updateTaskComparisonChart(userData, metadataData) {
    const chartEl = document.getElementById("task-comparison-chart");
    if (!chartEl) {
      console.warn("⚠️ Elemento task-comparison-chart no encontrado");
      return;
    }
    
    console.log("📊 Actualizando gráfica de comparación por tipo de tarea...");
    
    // Similar a la anterior pero más compacta
    const tasks = [
      { key: "combined", label: "Combined" },
      { key: "stow_to_prime", label: "Stow to Prime" },
      { key: "transfer_in", label: "Transfer In" }
    ];
    
    let html = '<div class="task-comparison-grid">';
    let hasData = false;
    
    tasks.forEach(task => {
      const userTask = userData.each_stow?.[task.key];
      const metadataTask = metadataData?.each_stow?.[task.key];
      
      // Mostrar si hay datos del usuario (metadata es opcional)
      if (!userTask || userTask.rate === undefined) {
        return;
      }
      
      hasData = true;
      
      const userRate = userTask.rate;
      const avgRate = metadataTask?.avg || 0;
      const diff = avgRate > 0 ? userRate - avgRate : 0;
      const diffPercent = avgRate > 0 ? ((diff / avgRate) * 100).toFixed(1) : 0;
      
      html += `
        <div class="task-comparison-card">
          <h4>${task.label}</h4>
          <div class="task-rate-user">${userRate.toFixed(2)}</div>
          ${avgRate > 0 ? `<div class="task-rate-avg">Promedio: ${avgRate.toFixed(2)}</div>` : '<div class="task-rate-avg">Promedio: N/A</div>'}
          ${avgRate > 0 ? `
          <div class="task-rate-diff ${diff >= 0 ? 'positive' : 'negative'}">
            ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${diffPercent >= 0 ? '+' : ''}${diffPercent}%)
          </div>
          ` : ''}
          <div class="task-percentile">Percentil: ${userTask.percentile !== undefined ? userTask.percentile.toFixed(1) + '%' : 'N/A'}</div>
        </div>
      `;
    });
    
    html += '</div>';
    
    if (!hasData) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos disponibles para este período</div>';
    } else {
      chartEl.innerHTML = html;
    }
  }

  /**
   * Actualiza el resumen del período
   */
  updateSummary() {
    const { period, analyzedUsers, totalStows, dailyAverage } =
      this.data.summary;

    const periodEl = document.getElementById("selected-period");
    const usersEl = document.getElementById("analyzed-users");
    const stowsEl = document.getElementById("total-period-stows");
    const averageEl = document.getElementById("daily-average");

    if (periodEl) periodEl.textContent = period;
    if (usersEl) usersEl.textContent = analyzedUsers;
    if (stowsEl) stowsEl.textContent = totalStows.toLocaleString();
    if (averageEl) averageEl.textContent = dailyAverage.toLocaleString();
  }

  /**
   * Actualiza los gráficos
   */
  updateCharts() {
    // Placeholder para gráficos
    console.log("📈 Actualizando gráficos de historial...");
  }

  /**
   * Actualiza la tabla de historial
   */
  updateTable() {
    const tbody = document.querySelector("#history-table tbody");
    const tableInfo = document.getElementById("table-info");

    if (!tbody) return;

    tbody.innerHTML = "";

    this.data.users.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.date}</td>
        <td>${user.name}</td>
        <td>${user.login}</td>
        <td><span class="badge badge-${user.shift}">${
        user.shift === "day" ? "Día" : "Noche"
      }</span></td>
        <td>${user.stows}</td>
        <td>${user.rate}</td>
        <td><span class="efficiency ${this.getEfficiencyClass(
          user.efficiency
        )}">${user.efficiency}%</span></td>
        <td>${user.hours}h</td>
        <td>
          <button class="user-history-btn user-history-btn-secondary" onclick="userHistoryController.showUserDetails(${
            user.id
          })">
            Ver Detalles
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });

    if (tableInfo) {
      tableInfo.textContent = `Mostrando ${this.data.users.length} registros`;
    }
  }

  /**
   * Actualiza la paginación
   */
  updatePagination() {
    const pageInfo = document.getElementById("page-info");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (pageInfo) {
      pageInfo.textContent = `Página ${this.data.pagination.currentPage} de ${this.data.pagination.totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = this.data.pagination.currentPage === 1;
    }

    if (nextBtn) {
      nextBtn.disabled =
        this.data.pagination.currentPage === this.data.pagination.totalPages;
    }
  }

  /**
   * Obtiene la clase CSS para la eficiencia
   */
  getEfficiencyClass(efficiency) {
    if (efficiency >= 90) return "high";
    if (efficiency >= 70) return "medium";
    return "low";
  }

  /**
   * Aplica los filtros
   */
  applyFilters() {
    console.log("🔍 Aplicando filtros de historial...");
    // Lógica de filtrado aquí
  }

  /**
   * Página anterior
   */
  previousPage() {
    if (this.data.pagination.currentPage > 1) {
      this.data.pagination.currentPage--;
      this.loadData();
    }
  }

  /**
   * Página siguiente
   */
  nextPage() {
    if (this.data.pagination.currentPage < this.data.pagination.totalPages) {
      this.data.pagination.currentPage++;
      this.loadData();
    }
  }

  /**
   * Muestra los detalles de un usuario
   */
  showUserDetails(userId) {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return;

    const modal = document.getElementById("user-detail-modal");
    const userName = document.getElementById("modal-user-name");
    const userContent = document.getElementById("user-detail-content");

    if (userName) userName.textContent = `Detalles de ${user.name}`;
    if (userContent) {
      userContent.innerHTML = `
        <div class="user-details">
          <h4>Información del Usuario</h4>
          <p><strong>Login:</strong> ${user.login}</p>
          <p><strong>Turno:</strong> ${
            user.shift === "day" ? "Día" : "Noche"
          }</p>
          <p><strong>Fecha:</strong> ${user.date}</p>
          <p><strong>Stows:</strong> ${user.stows}</p>
          <p><strong>Rate/Hora:</strong> ${user.rate}</p>
          <p><strong>Eficiencia:</strong> ${user.efficiency}%</p>
          <p><strong>Horas Trabajadas:</strong> ${user.hours}h</p>
        </div>
      `;
    }

    if (modal) modal.style.display = "flex";
  }

  /**
   * Cierra el modal
   */
  closeModal() {
    const modal = document.getElementById("user-detail-modal");
    if (modal) modal.style.display = "none";
  }

  /**
   * Refresca los datos
   */
  async refreshData() {
    console.log("🔄 Refrescando datos de historial...");
    
    // Obtener el botón de actualizar
    const refreshBtn = document.getElementById("refresh-history");
    const originalText = refreshBtn ? refreshBtn.innerHTML : "";
    
    try {
      // Deshabilitar botón y mostrar estado de carga
      if (refreshBtn) {
        refreshBtn.disabled = true;
        const iconElement = refreshBtn.querySelector('#icon-refresh-history');
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
        window.showToast("Actualizando historial...", "info");
      }
      
      // Recargar datos
      await this.loadUsersIndex();
      await this.loadMetadataUsers();
      
      // Si hay usuario seleccionado, recargar sus datos
      if (this.currentLogin) {
        await this.loadUserData(this.currentLogin);
      }
      
      // Mostrar mensaje de éxito
      if (window.showToast) {
        window.showToast("Historial actualizado correctamente", "success");
      }
      
      console.log("✅ Historial actualizado correctamente");
    } catch (error) {
      console.error("❌ Error al actualizar historial:", error);
      if (window.showToast) {
        window.showToast("Error al actualizar historial", "error");
      }
    } finally {
      // Restaurar botón
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalText;
        const iconElement = refreshBtn.querySelector('#icon-refresh-history');
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
    console.log("📊 Exportando datos de historial...");
    // Lógica de exportación aquí
  }
}

// Variable global para mantener la instancia del controlador
window.userHistoryController = null;

// Función de inicialización
function initUserHistory() {
  console.log("🎬 Inicializando UserHistoryController...");

  // Si ya existe una instancia, reinicializar en lugar de crear otra
  if (window.userHistoryController) {
    console.log("♻️ Reinicializando UserHistoryController existente");
    window.userHistoryController.init();
    return;
  }

  // Crear nueva instancia
  window.userHistoryController = new UserHistoryController();
}

// Inicializar cuando se carga el script por primera vez
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUserHistory);
} else {
  initUserHistory();
}

// También inicializar cuando se dispara el evento custom de view-loaded
document.addEventListener("view:loaded", (e) => {
  if (e.detail && e.detail.view === "user-history") {
    console.log("🔄 Vista user-history cargada, reinicializando...");
    initUserHistory();
  }
});