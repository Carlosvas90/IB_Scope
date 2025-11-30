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
    
    // Datos de metadata y usuario actual
    this.metadataUsers = null;
    this.currentUserData = null;
    this.currentPeriod = "last_month"; // Por defecto último mes
    this.currentLogin = null;
    
    // Filtros
    this.selectedShift = "";
    this.selectedManager = "";
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
    
    // Cargar primero el índice de usuarios para tener los datos disponibles
    await this.loadUsersIndex();
    
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
        // Actualizar estado de botones de período según datos disponibles
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

    // Búsqueda por login (PRIMERO, busca en TODOS los usuarios, no afectada por filtros)
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
        // Prevenir clic si el botón está deshabilitado
        if (btn.disabled || btn.classList.contains("disabled") || btn.classList.contains("no-data")) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const period = e.target.dataset.period;
        this.selectPeriod(period);
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
    
    // Inicializar lista de usuarios filtrados
    this.filteredUsers = this.usersIndex.users || [];
    
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
   * Actualiza la lista de usuarios filtrados
   */
  updateFilteredUsers() {
    if (!this.usersIndex || !this.usersIndex.users) return;
    
    this.filteredUsers = this.usersIndex.users.filter(user => {
      if (this.selectedShift && user.shift !== this.selectedShift) return false;
      if (this.selectedManager && user.manager !== this.selectedManager) return false;
      return true;
    });
    
    console.log(`🔍 Usuarios filtrados: ${this.filteredUsers.length}`);
  }

  /**
   * Actualiza el filtro de managers según el turno seleccionado
   */
  updateManagerFilter() {
    if (!this.usersIndex || !this.usersIndex.users) return;
    
    const managerFilter = document.getElementById("history-manager-filter");
    if (!managerFilter) return;
    
    // Obtener managers únicos del turno seleccionado
    const managers = new Set();
    this.usersIndex.users.forEach(user => {
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
   * Maneja la búsqueda de usuario (busca en TODOS los usuarios, no solo en filteredUsers)
   */
  onUserSearch(query) {
    if (!query || query.length < 2) {
      this.hideSuggestions();
      this.suggestions = [];
      return;
    }
    
    // Buscar en TODOS los usuarios del índice (no afectado por filtros)
    const allUsers = this.usersIndex?.users || [];
    const filtered = allUsers.filter(user => {
      const loginMatch = user.login.toLowerCase().includes(query.toLowerCase());
      const nameMatch = user.name?.toLowerCase().includes(query.toLowerCase());
      return loginMatch || nameMatch;
    }).slice(0, 10); // Limitar a 10 sugerencias
    
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
    
    // Actualizar métricas por período después de cargar los datos
    this.updatePeriodMetrics();
    
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
   * Actualiza las métricas por período (artículos, horas, ranking, rate)
   */
  updatePeriodMetrics() {
    if (!this.currentUserData) {
      // Limpiar todas las métricas
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
      const combinedData = periodData?.each_stow?.combined;

      // Artículos ubicados (total_units)
      const unitsEl = document.getElementById(`metric-units-${period.label}`);
      if (unitsEl) {
        if (combinedData?.total_units !== undefined) {
          unitsEl.textContent = combinedData.total_units.toLocaleString();
        } else {
          unitsEl.textContent = "-";
        }
      }

      // Horas trabajadas (total_hours)
      const hoursEl = document.getElementById(`metric-hours-${period.label}`);
      if (hoursEl) {
        if (combinedData?.total_hours !== undefined) {
          hoursEl.textContent = combinedData.total_hours.toFixed(1) + "h";
        } else {
          hoursEl.textContent = "-";
        }
      }

      // Ranking Combined
      const rankEl = document.getElementById(`metric-rank-${period.label}`);
      if (rankEl) {
        if (combinedData?.rank !== undefined) {
          const totalUsers = combinedData.total_users || 0;
          rankEl.textContent = `#${combinedData.rank} / ${totalUsers}`;
        } else {
          rankEl.textContent = "-";
        }
      }

      // Rate Combined
      const rateEl = document.getElementById(`metric-rate-${period.label}`);
      if (rateEl) {
        if (combinedData?.rate !== undefined) {
          rateEl.textContent = combinedData.rate.toFixed(2);
        } else {
          rateEl.textContent = "-";
        }
      }
    });
  }

  /**
   * Limpia todas las métricas por período
   */
  clearPeriodMetrics() {
    const periods = ["week", "month", "3months", "6months"];
    const metrics = ["units", "hours", "rank", "rate"];

    periods.forEach(period => {
      metrics.forEach(metric => {
        const el = document.getElementById(`metric-${metric}-${period}`);
        if (el) el.textContent = "-";
      });
    });
  }

  /**
   * Verifica si un período tiene datos disponibles
   */
  hasPeriodData(period) {
    if (!this.currentUserData) return false;
    
    const periodData = this.currentUserData[period];
    if (!periodData) return false;
    
    // Verificar si tiene datos en each_stow (específicamente combined)
    const hasEachStow = periodData.each_stow && 
                        Object.keys(periodData.each_stow).length > 0 &&
                        periodData.each_stow.combined &&
                        periodData.each_stow.combined.rate !== undefined &&
                        periodData.each_stow.combined.rate !== null;
    
    return hasEachStow;
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
    
    // Actualizar KPIs (funciona aunque no haya metadata)
    this.updateKPIs(userPeriodData, metadataPeriodData);
    
    // Actualizar gráficos de evolución temporal
    this.updateEvolutionCharts();
  }

  /**
   * Muestra mensaje de selección de usuario y limpia los elementos
   */
  showUserSelectionMessage() {
    // Ocultar contenedor principal
    const userContainer = document.getElementById("selected-user-container");
    if (userContainer) {
      userContainer.style.display = "none";
    }
    
    // Limpiar métricas por período
    this.clearPeriodMetrics();
    
    // Limpiar todos los KPIs usando el método auxiliar
    this.updateKPIGroup(null, null, "combined");
    this.updateKPIGroup(null, null, "stp");
    this.updateKPIGroup(null, null, "ti");
    
    // Limpiar gráficos de evolución
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

    // Actualizar cada gráfico
    this.updateRateEvolutionChart(periods, periodLabels);
    this.updateTaskComparisonEvolutionChart(periods, periodLabels);
    this.updateRankEvolutionChart(periods, periodLabels);
    this.updatePercentileEvolutionChart(periods, periodLabels);
    this.updateEffortRateEvolutionChart(periods, periodLabels);
  }

  /**
   * Limpia todos los gráficos de evolución
   */
  clearEvolutionCharts() {
    const chartIds = [
      "rate-evolution-chart",
      "task-comparison-evolution-chart",
      "rank-evolution-chart",
      "percentile-evolution-chart",
      "effort-rate-evolution-chart"
    ];
    
    chartIds.forEach(id => {
      const chartEl = document.getElementById(id);
      if (chartEl) {
        chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666"><p>Selecciona un usuario para ver la evolución</p></div>';
      }
    });
  }

  /**
   * Actualiza gráfico de evolución del rate (usuario vs promedio)
   */
  updateRateEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("rate-evolution-chart");
    if (!chartEl) return;

    const dataPoints = [];
    const periodsWithData = [];

    periods.forEach(period => {
      const periodData = this.currentUserData[period];
      const metadataPeriod = this.metadataUsers?.periods?.[period];
      
      if (periodData?.each_stow?.combined?.rate !== undefined) {
        const userRate = periodData.each_stow.combined.rate;
        const avgRate = metadataPeriod?.each_stow?.combined?.avg || periodData.each_stow.combined.avg_general || 0;
        
        dataPoints.push({
          period: periodLabels[period],
          userRate: userRate,
          avgRate: avgRate
        });
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

    let svg = `
      <svg width="${chartWidth}" height="${chartHeight}" style="overflow: visible;">
        <defs>
          <linearGradient id="userLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:var(--user-history-primary);stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:var(--user-history-primary);stop-opacity:0" />
          </linearGradient>
          <linearGradient id="avgLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#666;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#666;stop-opacity:0" />
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
    svg += `<path d="${userLinePath}" fill="none" stroke="var(--user-history-primary)" stroke-width="3" stroke-linecap="round"/>`;

    // Línea del promedio
    let avgLinePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].avgRate / maxRate * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
        avgLinePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${avgLinePath}" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5" opacity="0.7"/>`;

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
      
      // Puntos visibles
      svg += `<circle cx="${x}" cy="${userY}" r="5" fill="var(--user-history-primary)" stroke="white" stroke-width="2" 
              class="chart-point-user" data-period="${point.period}" style="cursor: pointer;"/>`;
      svg += `<circle cx="${x}" cy="${avgY}" r="4" fill="#666" stroke="white" stroke-width="2" 
              class="chart-point-avg" data-period="${point.period}" style="cursor: pointer;"/>`;
      
      // Etiquetas de valor (ocultas por defecto, se muestran en tooltip)
      svg += `<text x="${x}" y="${userY - 10}" text-anchor="middle" font-size="11" font-weight="600" 
              fill="var(--user-history-primary)" class="chart-value-label" style="pointer-events: none;">${point.userRate.toFixed(1)}</text>`;
      svg += `<text x="${x}" y="${avgY - 10}" text-anchor="middle" font-size="10" 
              fill="#666" class="chart-value-label" style="pointer-events: none;">${point.avgRate.toFixed(1)}</text>`;
      
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
          <line x1="0" y1="10" x2="30" y2="10" stroke="var(--user-history-primary)" stroke-width="3" class="legend-line-user"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-user">Usuario</text>
        </g>
        <g class="chart-legend-item" data-series="avg" style="cursor: pointer;" transform="translate(0, 20)">
          <line x1="0" y1="10" x2="30" y2="10" stroke="#666" stroke-width="2" stroke-dasharray="5,5" opacity="0.7" class="legend-line-avg"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-avg">Promedio</text>
        </g>
      </g>
    `;

    // Tooltip
    svg += `
      <g id="rate-chart-tooltip" style="display: none; pointer-events: none;">
        <rect x="0" y="0" width="140" height="80" fill="rgba(0,0,0,0.85)" rx="6" ry="6"/>
        <text x="10" y="20" font-size="12" font-weight="600" fill="white" id="tooltip-period">Período</text>
        <text x="10" y="40" font-size="11" fill="#a0d2ff" id="tooltip-user">Usuario: -</text>
        <text x="10" y="55" font-size="11" fill="#cccccc" id="tooltip-avg">Promedio: -</text>
        <text x="10" y="70" font-size="11" font-weight="600" fill="white" id="tooltip-diff">Diferencia: -</text>
      </g>
    `;

    svg += '</svg>';
    chartEl.innerHTML = svg;
    
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
   * Actualiza gráfico de comparación de tareas por período
   */
  updateTaskComparisonEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("task-comparison-evolution-chart");
    if (!chartEl) return;

    const tasks = [
      { key: "combined", label: "Combined", color: "var(--user-history-primary)" },
      { key: "stow_to_prime", label: "Stow to Prime", color: "#10b981" },
      { key: "transfer_in", label: "Transfer In", color: "#3b82f6" }
    ];

    const dataByPeriod = [];
    periods.forEach(period => {
      const periodData = this.currentUserData[period];
      if (periodData?.each_stow) {
        const periodTasks = {};
        tasks.forEach(task => {
          const taskData = periodData.each_stow[task.key];
          if (taskData?.rate !== undefined) {
            periodTasks[task.key] = taskData.rate;
          }
        });
        if (Object.keys(periodTasks).length > 0) {
          dataByPeriod.push({
            period: periodLabels[period],
            tasks: periodTasks
          });
        }
      }
    });

    if (dataByPeriod.length === 0) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos suficientes</div>';
      return;
    }

    // Crear gráfico de barras agrupadas
    const maxRate = Math.max(...dataByPeriod.flatMap(p => Object.values(p.tasks))) * 1.2;
    const chartHeight = 300;
    const barWidth = 60;
    const barSpacing = 20;
    const groupSpacing = 40;
    const chartWidth = dataByPeriod.length * (tasks.length * barWidth + (tasks.length - 1) * barSpacing + groupSpacing) + 100;
    const padding = { top: 40, right: 40, bottom: 60, left: 80 };

    let svg = `<svg width="${chartWidth}" height="${chartHeight}" style="overflow: visible;">`;
    
    // Ejes
    svg += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${chartHeight - padding.bottom}" stroke="var(--user-history-border)" stroke-width="2"/>`;
    svg += `<line x1="${padding.left}" y1="${chartHeight - padding.bottom}" x2="${chartWidth - padding.right}" y2="${chartHeight - padding.bottom}" stroke="var(--user-history-border)" stroke-width="2"/>`;

    // Líneas de referencia
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + ((chartHeight - padding.top - padding.bottom) * (1 - i / 5));
      const value = (maxRate * i / 5).toFixed(0);
      svg += `<line x1="${padding.left - 5}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="var(--user-history-border)" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>`;
      svg += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="var(--user-history-text-secondary)">${value}</text>`;
    }

    // Barras
    dataByPeriod.forEach((periodData, periodIndex) => {
      const groupX = padding.left + periodIndex * (tasks.length * barWidth + (tasks.length - 1) * barSpacing + groupSpacing) + groupSpacing / 2;
      
      tasks.forEach((task, taskIndex) => {
        const rate = periodData.tasks[task.key];
        if (rate !== undefined) {
          const barX = groupX + taskIndex * (barWidth + barSpacing);
          const barHeight = (rate / maxRate) * (chartHeight - padding.top - padding.bottom);
          const barY = chartHeight - padding.bottom - barHeight;
          
          svg += `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${task.color}" opacity="0.8" rx="4"/>`;
          svg += `<text x="${barX + barWidth / 2}" y="${barY - 5}" text-anchor="middle" font-size="11" font-weight="600" fill="${task.color}">${rate.toFixed(1)}</text>`;
        }
      });
      
      // Etiqueta de período
      svg += `<text x="${groupX + (tasks.length * barWidth + (tasks.length - 1) * barSpacing) / 2}" y="${chartHeight - padding.bottom + 20}" text-anchor="middle" font-size="11" fill="var(--user-history-text-secondary)">${periodData.period}</text>`;
    });

    // Leyenda
    const legendX = padding.left + 20;
    const legendY = padding.top - 20;
    tasks.forEach((task, index) => {
      const x = legendX + index * 150;
      svg += `<rect x="${x}" y="${legendY}" width="20" height="12" fill="${task.color}" rx="2"/>`;
      svg += `<text x="${x + 25}" y="${legendY + 9}" font-size="12" fill="var(--user-history-text-primary)">${task.label}</text>`;
    });

    svg += '</svg>';
    chartEl.innerHTML = svg;
  }

  /**
   * Actualiza gráfico de evolución del rank
   */
  updateRankEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("rank-evolution-chart");
    if (!chartEl) return;

    const dataPoints = [];
    periods.forEach(period => {
      const periodData = this.currentUserData[period];
      if (periodData?.each_stow?.combined?.rank !== undefined) {
        dataPoints.push({
          period: periodLabels[period],
          rank: periodData.each_stow.combined.rank,
          totalUsers: periodData.each_stow.combined.total_users || 0
        });
      }
    });

    if (dataPoints.length === 0) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos</div>';
      return;
    }

    // Crear gráfico de barras invertido (rank más bajo = mejor)
    const maxRank = Math.max(...dataPoints.map(d => d.totalUsers || d.rank)) * 1.1;
    const chartHeight = 250;
    const chartWidth = Math.max(400, dataPoints.length * 120);
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;

    let svg = `<svg width="${chartWidth}" height="${chartHeight}">`;
    
    // Ejes
    svg += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + graphHeight}" stroke="var(--user-history-border)" stroke-width="2"/>`;
    svg += `<line x1="${padding.left}" y1="${padding.top + graphHeight}" x2="${padding.left + graphWidth}" y2="${padding.top + graphHeight}" stroke="var(--user-history-border)" stroke-width="2"/>`;

    // Barras
    const barWidth = graphWidth / dataPoints.length * 0.6;
    const barSpacing = graphWidth / dataPoints.length * 0.4;
    
    dataPoints.forEach((point, index) => {
      const x = padding.left + index * (graphWidth / dataPoints.length) + barSpacing / 2;
      const barHeight = (point.rank / maxRank) * graphHeight;
      const barY = padding.top + graphHeight - barHeight;
      const color = point.rank <= (point.totalUsers || maxRank) * 0.25 ? "#10b981" : 
                    point.rank <= (point.totalUsers || maxRank) * 0.5 ? "#3b82f6" : 
                    point.rank <= (point.totalUsers || maxRank) * 0.75 ? "#f59e0b" : "#ef4444";
      
      svg += `<rect x="${x}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${color}" opacity="0.8" rx="4"/>`;
      svg += `<text x="${x + barWidth / 2}" y="${barY - 5}" text-anchor="middle" font-size="12" font-weight="600" fill="${color}">#${point.rank}</text>`;
      svg += `<text x="${x + barWidth / 2}" y="${padding.top + graphHeight + 20}" text-anchor="middle" font-size="11" fill="var(--user-history-text-secondary)">${point.period}</text>`;
    });

    svg += '</svg>';
    chartEl.innerHTML = svg;
  }

  /**
   * Actualiza gráfico de evolución del percentil
   */
  updatePercentileEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("percentile-evolution-chart");
    if (!chartEl) return;

    const dataPoints = [];
    periods.forEach(period => {
      const periodData = this.currentUserData[period];
      if (periodData?.each_stow?.combined?.percentile !== undefined) {
        dataPoints.push({
          period: periodLabels[period],
          percentile: periodData.each_stow.combined.percentile
        });
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

    // Área bajo la curva
    let areaPath = `M ${padding.left},${padding.top + graphHeight}`;
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.percentile / 100 * graphHeight);
      areaPath += ` L ${x},${y}`;
    });
    areaPath += ` L ${padding.left + graphWidth},${padding.top + graphHeight} Z`;
    svg += `<path d="${areaPath}" fill="var(--user-history-primary)" opacity="0.2"/>`;

    // Línea
    let linePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].percentile / 100 * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.percentile / 100 * graphHeight);
        linePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${linePath}" fill="none" stroke="var(--user-history-primary)" stroke-width="3" stroke-linecap="round"/>`;

    // Puntos con interactividad
    dataPoints.forEach((point, index) => {
      const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
      const y = padding.top + graphHeight - (point.percentile / 100 * graphHeight);
      
      // Área invisible más grande para facilitar hover y click
      const hoverRadius = 12;
      svg += `<circle cx="${x}" cy="${y}" r="${hoverRadius}" fill="transparent" class="chart-point-hover" 
              data-period="${point.period}" data-value="${point.percentile.toFixed(2)}" style="cursor: pointer;"/>`;
      
      // Punto visible
      svg += `<circle cx="${x}" cy="${y}" r="5" fill="var(--user-history-primary)" stroke="white" stroke-width="2" 
              class="chart-point-percentile" data-period="${point.period}" style="cursor: pointer;"/>`;
      svg += `<text x="${x}" y="${y - 10}" text-anchor="middle" font-size="11" font-weight="600" 
              fill="var(--user-history-primary)" class="chart-value-label" style="pointer-events: none;">${point.percentile.toFixed(1)}%</text>`;
      svg += `<text x="${x}" y="${padding.top + graphHeight + 20}" text-anchor="middle" font-size="11" 
              fill="var(--user-history-text-secondary)" style="pointer-events: none;">${point.period}</text>`;
    });

    // Tooltip
    svg += `
      <g id="percentile-chart-tooltip" style="display: none; pointer-events: none;">
        <rect x="0" y="0" width="120" height="60" fill="rgba(0,0,0,0.85)" rx="6" ry="6"/>
        <text x="10" y="20" font-size="12" font-weight="600" fill="white" id="tooltip-period-pct">Período</text>
        <text x="10" y="40" font-size="11" fill="#a0d2ff" id="tooltip-percentile">Percentil: -</text>
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
   * Actualiza gráfico de evolución del rate por esfuerzo
   */
  updateEffortRateEvolutionChart(periods, periodLabels) {
    const chartEl = document.getElementById("effort-rate-evolution-chart");
    if (!chartEl) return;

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

    let svg = `
      <svg width="${chartWidth}" height="${chartHeight}" style="overflow: visible;">
        <defs>
          <linearGradient id="effortLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0" />
          </linearGradient>
          <linearGradient id="effortAvgLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#666;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#666;stop-opacity:0" />
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
    svg += `<path d="${userLinePath}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" class="effort-user-line"/>`;

    // Línea del promedio
    let avgLinePath = `M ${padding.left},${padding.top + graphHeight - (dataPoints[0].avgRate / maxRate * graphHeight)}`;
    dataPoints.forEach((point, index) => {
      if (index > 0) {
        const x = padding.left + (index * (graphWidth / (dataPoints.length - 1)));
        const y = padding.top + graphHeight - (point.avgRate / maxRate * graphHeight);
        avgLinePath += ` L ${x},${y}`;
      }
    });
    svg += `<path d="${avgLinePath}" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5" opacity="0.7" class="effort-avg-line"/>`;

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
      
      // Puntos visibles
      svg += `<circle cx="${x}" cy="${userY}" r="5" fill="#f59e0b" stroke="white" stroke-width="2" 
              class="chart-point-effort-user" data-period="${point.period}" style="cursor: pointer;"/>`;
      svg += `<circle cx="${x}" cy="${avgY}" r="4" fill="#666" stroke="white" stroke-width="2" 
              class="chart-point-effort-avg" data-period="${point.period}" style="cursor: pointer;"/>`;
      
      // Etiquetas de valor
      svg += `<text x="${x}" y="${userY - 10}" text-anchor="middle" font-size="11" font-weight="600" 
              fill="#f59e0b" class="chart-value-label" style="pointer-events: none;">${point.effortRate.toFixed(1)}</text>`;
      svg += `<text x="${x}" y="${avgY - 10}" text-anchor="middle" font-size="10" 
              fill="#666" class="chart-value-label" style="pointer-events: none;">${point.avgRate.toFixed(1)}</text>`;
      
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
          <line x1="0" y1="10" x2="30" y2="10" stroke="#f59e0b" stroke-width="3" class="legend-line-user-effort"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-user-effort">Usuario</text>
        </g>
        <g class="chart-legend-item" data-series="avg" style="cursor: pointer;" transform="translate(0, 20)">
          <line x1="0" y1="10" x2="30" y2="10" stroke="#666" stroke-width="2" stroke-dasharray="5,5" opacity="0.7" class="legend-line-avg-effort"/>
          <text x="35" y="14" font-size="12" fill="var(--user-history-text-primary)" class="legend-text-avg-effort">Promedio</text>
        </g>
      </g>
    `;

    // Tooltip
    svg += `
      <g id="effort-chart-tooltip" style="display: none; pointer-events: none;">
        <rect x="0" y="0" width="140" height="80" fill="rgba(0,0,0,0.85)" rx="6" ry="6"/>
        <text x="10" y="20" font-size="12" font-weight="600" fill="white" id="tooltip-period-effort">Período</text>
        <text x="10" y="40" font-size="11" fill="#fbbf24" id="tooltip-effort-user">Usuario: -</text>
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
    const errorsEl = document.getElementById("effort-errors");
    if (cartChangesEl && effortData.cart_changes !== undefined) {
      cartChangesEl.textContent = effortData.cart_changes;
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
