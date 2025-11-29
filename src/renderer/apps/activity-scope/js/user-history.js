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
        this.updateVisualization();
      } else {
        console.warn(`⚠️ No se pudo cargar datos del usuario ${login}`);
        this.currentUserData = null;
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

    // Búsqueda alternativa
    const userSearch = document.getElementById("history-user-search");
    if (userSearch) {
      userSearch.addEventListener("input", (e) => this.onUserSearch(e.target.value));
      userSearch.addEventListener("focus", () => {
        if (userSearch.value.length >= 2) {
          this.onUserSearch(userSearch.value);
        }
      });
      userSearch.addEventListener("blur", () => {
        setTimeout(() => this.hideSuggestions(), 200);
      });
      userSearch.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const login = userSearch.value.trim();
          if (login) {
            const user = this.filteredUsers.find(u => u.login.toLowerCase() === login.toLowerCase());
            if (user) {
              this.selectUser(user.login);
              this.hideSuggestions();
              // Actualizar el select también
              if (userSelect) userSelect.value = user.login;
            } else {
              if (this.usersIndex && this.usersIndex.users) {
                const allUser = this.usersIndex.users.find(u => u.login.toLowerCase() === login.toLowerCase());
                if (allUser) {
                  this.selectUser(allUser.login);
                  this.hideSuggestions();
                  if (userSelect) userSelect.value = allUser.login;
                } else {
                  if (window.showToast) {
                    window.showToast(`Usuario ${login} no encontrado`, "error");
                  }
                }
              }
            }
          }
        }
      });
    }

    // Selector de período
    const periodButtons = document.querySelectorAll(".period-btn");
    periodButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const period = e.target.dataset.period;
        this.selectPeriod(period);
      });
    });

    // Modal
    const closeModalBtn = document.getElementById("close-modal");
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => this.closeModal());
    }
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
   * Maneja la búsqueda de usuario
   */
  onUserSearch(query) {
    if (!query || query.length < 2) {
      this.hideSuggestions();
      return;
    }
    
    const filtered = this.filteredUsers.filter(user => {
      const loginMatch = user.login.toLowerCase().includes(query.toLowerCase());
      const nameMatch = user.name.toLowerCase().includes(query.toLowerCase());
      return loginMatch || nameMatch;
    }).slice(0, 10); // Limitar a 10 sugerencias
    
    this.showSuggestions(filtered, query);
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
    users.forEach(user => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.innerHTML = `
        <strong>${user.login}</strong> - ${user.name}
        <small>${user.shift} | ${user.manager}</small>
      `;
      item.addEventListener("click", () => {
        document.getElementById("history-user-search").value = user.login;
        this.selectUser(user.login);
        this.hideSuggestions();
      });
      suggestionsEl.appendChild(item);
    });
    
    suggestionsEl.style.display = "block";
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
    const user = this.usersIndex.users.find(u => u.login === login);
    
    if (user) {
      // Mostrar información del usuario
      const userInfoEl = document.getElementById("selected-user-info");
      const userNameEl = document.getElementById("selected-user-name");
      const userDetailsEl = document.getElementById("selected-user-details");
      
      if (userInfoEl) userInfoEl.style.display = "block";
      if (userNameEl) userNameEl.textContent = `Usuario: ${user.name}`;
      if (userDetailsEl) {
        userDetailsEl.textContent = `Login: ${user.login} | Turno: ${user.shift || "N/A"} | Manager: ${user.manager || "N/A"}`;
      }
    }
    
    // Cargar datos del usuario
    await this.loadUserData(login);
    
    // Actualizar el select también
    const userSelect = document.getElementById("history-user-select");
    if (userSelect) {
      userSelect.value = login;
    }
    
    // Limpiar el campo de búsqueda
    const userSearch = document.getElementById("history-user-search");
    if (userSearch) {
      userSearch.value = "";
    }
  }

  /**
   * Selecciona un período
   */
  selectPeriod(period) {
    this.currentPeriod = period;
    
    // Actualizar botones
    document.querySelectorAll(".period-btn").forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.period === period) {
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
    if (!this.currentUserData || !this.metadataUsers) {
      console.warn("⚠️ No hay datos para visualizar");
      return;
    }
    
    const period = this.currentPeriod;
    const userPeriodData = this.currentUserData[period];
    const metadataPeriodData = this.metadataUsers.periods?.[period];
    
    if (!userPeriodData || !metadataPeriodData) {
      console.warn(`⚠️ No hay datos para el período ${period}`);
      return;
    }
    
    // Actualizar KPIs
    this.updateKPIs(userPeriodData, metadataPeriodData);
    
    // Actualizar tabla de rendimiento
    this.updatePerformanceTable(userPeriodData, metadataPeriodData);
    
    // Actualizar métricas de esfuerzo
    this.updateEffortMetrics(userPeriodData, metadataPeriodData);
    
    // Actualizar gráficos (placeholder por ahora)
    this.updateCharts(userPeriodData, metadataPeriodData);
  }

  /**
   * Muestra mensaje de selección de usuario
   */
  showUserSelectionMessage() {
    const tableBody = document.querySelector("#performance-table tbody");
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
            <p>Por favor, selecciona un usuario usando los filtros de búsqueda</p>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Actualiza las tarjetas KPI - Enfocado en Combined
   */
  updateKPIs(userData, metadataData) {
    // Obtener datos de combined (tarea principal)
    const userCombined = userData.each_stow?.combined;
    const metadataCombined = metadataData.each_stow?.combined;
    
    if (userCombined && metadataCombined) {
      // Rate Actual
      const rateEl = document.getElementById("kpi-rate-actual");
      const avgEl = document.getElementById("kpi-rate-avg");
      const diffEl = document.getElementById("kpi-rate-diff");
      
      if (rateEl) rateEl.textContent = userCombined.rate?.toFixed(2) || "-";
      if (avgEl) avgEl.textContent = metadataCombined.avg?.toFixed(2) || "-";
      
      if (diffEl && userCombined.rate && metadataCombined.avg) {
        const diff = userCombined.rate - metadataCombined.avg;
        const diffPercent = ((diff / metadataCombined.avg) * 100).toFixed(1);
        diffEl.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${diffPercent >= 0 ? '+' : ''}${diffPercent}%)`;
        diffEl.className = `kpi-diff ${diff >= 0 ? 'positive' : 'negative'}`;
      }
      
      // Percentil
      const percentileEl = document.getElementById("kpi-percentile");
      if (percentileEl && userCombined.percentile !== undefined) {
        percentileEl.textContent = `${userCombined.percentile.toFixed(1)}%`;
      }
      
      // Rank
      const rankEl = document.getElementById("kpi-rank");
      const totalUsersEl = document.getElementById("kpi-total-users");
      if (rankEl && userCombined.rank !== undefined) {
        rankEl.textContent = `#${userCombined.rank}`;
      }
      if (totalUsersEl && userCombined.total_users !== undefined) {
        totalUsersEl.textContent = userCombined.total_users;
      }
      
      // Diferencia general
      const differenceEl = document.getElementById("kpi-difference");
      const diffIndicatorEl = document.getElementById("kpi-diff-indicator");
      if (differenceEl && userCombined.rate && metadataCombined.avg) {
        const diff = userCombined.rate - metadataCombined.avg;
        differenceEl.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
        differenceEl.className = `kpi-value ${diff >= 0 ? 'positive' : 'negative'}`;
      }
      if (diffIndicatorEl && userCombined.percentile !== undefined) {
        const percentile = userCombined.percentile;
        let indicator = "Bajo promedio";
        let className = "low";
        if (percentile >= 75) {
          indicator = "Muy por encima";
          className = "very-high";
        } else if (percentile >= 50) {
          indicator = "Por encima";
          className = "high";
        } else if (percentile >= 25) {
          indicator = "Promedio";
          className = "medium";
        }
        diffIndicatorEl.textContent = indicator;
        diffIndicatorEl.className = `diff-indicator ${className}`;
      }
      
      // Barra de percentil
      const percentileBarEl = document.getElementById("kpi-percentile-bar");
      if (percentileBarEl && userCombined.percentile !== undefined) {
        percentileBarEl.style.width = `${userCombined.percentile}%`;
        percentileBarEl.className = `percentile-bar ${this.getPercentileClass(userCombined.percentile)}`;
      }
    }
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
   * Actualiza la tabla de rendimiento - Enfocado en tareas principales
   */
  updatePerformanceTable(userData, metadataData) {
    const tbody = document.querySelector("#performance-table tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    // Tareas principales primero
    const mainTaskTypes = [
      { key: "combined", label: "Combined", priority: 1 },
      { key: "stow_to_prime", label: "Stow to Prime", priority: 2 },
      { key: "transfer_in", label: "Transfer In (TSI)", priority: 3 }
    ];
    
    // Tareas secundarias
    const secondaryTaskTypes = [
      { key: "stow_to_prime_e", label: "Stow to Prime (E)", priority: 4 },
      { key: "stow_to_prime_w", label: "Stow to Prime (W)", priority: 5 },
      { key: "transfer_in_e", label: "Transfer In (E)", priority: 6 },
      { key: "transfer_in_w", label: "Transfer In (W)", priority: 7 },
      { key: "combined_e", label: "Combined (E)", priority: 8 },
      { key: "combined_w", label: "Combined (W)", priority: 9 }
    ];
    
    // Combinar y ordenar
    const taskTypes = [...mainTaskTypes, ...secondaryTaskTypes].sort((a, b) => a.priority - b.priority);
    
    // También incluir pallet_stow si existe
    const palletTasks = [];
    if (userData.pallet_stow) {
      Object.keys(userData.pallet_stow).forEach(key => {
        if (userData.pallet_stow[key] && Object.keys(userData.pallet_stow[key]).length > 0) {
          palletTasks.push({ key, label: `Pallet ${key.replace(/_/g, ' ')}`, isPallet: true });
        }
      });
    }
    
    // Procesar tareas each_stow
    taskTypes.forEach(task => {
      const userTask = userData.each_stow?.[task.key];
      const metadataTask = metadataData.each_stow?.[task.key];
      
      if (!userTask || !metadataTask) return;
      
      const row = document.createElement("tr");
      const rate = userTask.rate || 0;
      const avg = metadataTask.avg || 0;
      const diff = rate - avg;
      const diffPercent = avg > 0 ? ((diff / avg) * 100).toFixed(1) : 0;
      
      // Marcar las tareas principales
      const isMain = task.priority <= 3;
      
      row.innerHTML = `
        <td><strong>${task.label}</strong>${isMain ? ' <span class="main-task-badge">Principal</span>' : ''}</td>
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
    });
    
    // Procesar tareas pallet_stow si existen
    palletTasks.forEach(task => {
      const userTask = userData.pallet_stow?.[task.key];
      const metadataTask = metadataData.pallet_stow?.[task.key];
      
      if (!userTask || !metadataTask) return;
      
      // Para pallet, usar avg_each o avg_pallet según lo que esté disponible
      const rate = userTask.avg_each || userTask.avg_pallet || 0;
      const avg = metadataTask.avg_each || metadataTask.avg_pallet || 0;
      const diff = rate - avg;
      const diffPercent = avg > 0 ? ((diff / avg) * 100).toFixed(1) : 0;
      
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${task.label}</strong> <span class="pallet-badge">Pallet</span></td>
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
    });
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
    if (!chartEl) return;
    
    // Obtener datos principales
    const tasks = [
      { key: "combined", label: "Combined", userData: userData.each_stow?.combined, metadataData: metadataData.each_stow?.combined },
      { key: "stow_to_prime", label: "Stow to Prime", userData: userData.each_stow?.stow_to_prime, metadataData: metadataData.each_stow?.stow_to_prime },
      { key: "transfer_in", label: "Transfer In (TSI)", userData: userData.each_stow?.transfer_in, metadataData: metadataData.each_stow?.transfer_in }
    ];
    
    // Filtrar solo las que tienen datos
    const validTasks = tasks.filter(t => t.userData && t.metadataData && t.userData.rate !== undefined);
    
    if (validTasks.length === 0) {
      chartEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666">No hay datos disponibles para este período</div>';
      return;
    }
    
    // Crear gráfica de barras simple con HTML/CSS
    let html = '<div class="rate-comparison-bars">';
    
    validTasks.forEach(task => {
      const userRate = task.userData.rate;
      const avgRate = task.metadataData.avg;
      const maxRate = Math.max(userRate, avgRate) * 1.2; // 20% más para el máximo
      const userPercent = (userRate / maxRate) * 100;
      const avgPercent = (avgRate / maxRate) * 100;
      const diff = userRate - avgRate;
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
            <div class="rate-bar-wrapper">
              <div class="rate-bar-label">Promedio</div>
              <div class="rate-bar">
                <div class="rate-bar-fill avg-rate" style="width: ${avgPercent}%">
                  <span class="rate-value">${avgRate.toFixed(2)}</span>
                </div>
              </div>
            </div>
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
    if (!chartEl) return;
    
    // Similar a la anterior pero más compacta
    const tasks = [
      { key: "combined", label: "Combined" },
      { key: "stow_to_prime", label: "Stow to Prime" },
      { key: "transfer_in", label: "Transfer In" }
    ];
    
    let html = '<div class="task-comparison-grid">';
    
    tasks.forEach(task => {
      const userTask = userData.each_stow?.[task.key];
      const metadataTask = metadataData.each_stow?.[task.key];
      
      if (!userTask || !metadataTask || userTask.rate === undefined) return;
      
      const userRate = userTask.rate;
      const avgRate = metadataTask.avg;
      const diff = userRate - avgRate;
      const diffPercent = avgRate > 0 ? ((diff / avgRate) * 100).toFixed(1) : 0;
      
      html += `
        <div class="task-comparison-card">
          <h4>${task.label}</h4>
          <div class="task-rate-user">${userRate.toFixed(2)}</div>
          <div class="task-rate-avg">Promedio: ${avgRate.toFixed(2)}</div>
          <div class="task-rate-diff ${diff >= 0 ? 'positive' : 'negative'}">
            ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${diffPercent >= 0 ? '+' : ''}${diffPercent}%)
          </div>
          <div class="task-percentile">Percentil: ${userTask.percentile !== undefined ? userTask.percentile.toFixed(1) + '%' : 'N/A'}</div>
        </div>
      `;
    });
    
    html += '</div>';
    chartEl.innerHTML = html;
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
