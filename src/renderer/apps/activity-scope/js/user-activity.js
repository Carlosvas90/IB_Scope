/**
 * User Activity Controller
 * Maneja la lógica de monitoreo en tiempo real de usuarios
 */

import { UserImageService } from "./UserImageService.js";
import { getUserPhotoUrl } from "../../../core/utils/linkUtils.js";

class UserActivityController {
  constructor() {
    this.currentCategory = "each"; // Categoría por defecto
    this.stowData = null;
    this.effortData = null;
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

    this.init();
  }

  /**
   * Inicializa el controlador
   */
  async init() {
    console.log("🚀 Inicializando UserActivityController...");
    await this.loadData();
    await this.loadRosterData();
    await this.loadEmployee30minData();
    console.log("🔄 Ejecutando loadRotationData...");
    await this.loadRotationData();
    await this.loadAssetsPaths();
    this.setupEventListeners();
    this.setupHeatmapModalEvents();
    this.updateTable();
    this.setupUserImagePopups();
    this.setupUserDetailEvents();
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
    // Botón de actualizar datos
    const refreshBtn = document.getElementById("refresh-data");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshData());
    }

    // Botón de exportar
    const exportBtn = document.getElementById("export-data");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportData());
    }

    // Botones de categoría
    const categoryBtns = document.querySelectorAll(".category-btn");
    categoryBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const category = e.currentTarget.dataset.category;
        this.changeCategory(category);
      });
    });

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
    console.log("👥 Cargando datos del roster...");

    try {
      const appPath = await window.api.getAppPath();
      const rosterPath = `${appPath}\\Ejemplos\\roster.json`;

      console.log("📂 Intentando cargar Roster desde:", rosterPath);

      const rosterResult = await window.api.readJson(rosterPath);

      if (rosterResult.success) {
        this.rosterData = rosterResult.data;
        console.log("✅ Datos de Roster cargados:", {
          total_records: this.rosterData.metadata?.total_records || 0,
        });
      } else {
        console.error("❌ Error cargando Roster:", rosterResult.error);
      }
    } catch (error) {
      console.error("❌ Error al cargar roster:", error);
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
    console.log("⏰ Cargando datos de últimos 30 minutos...");

    try {
      const appPath = await window.api.getAppPath();
      const employee30minPath = `${appPath}\\Ejemplos\\employee_last_30min_19102025.json`;

      console.log(
        "📂 Intentando cargar Employee 30min desde:",
        employee30minPath
      );

      const employee30minResult = await window.api.readJson(employee30minPath);

      if (employee30minResult.success) {
        this.employee30minData = employee30minResult.data;
        console.log("✅ Datos de Employee 30min cargados:", {
          fecha: this.employee30minData.fecha,
          total_empleados: Object.keys(this.employee30minData.empleados || {})
            .length,
        });
      } else {
        console.error(
          "❌ Error cargando Employee 30min:",
          employee30minResult.error
        );
      }
    } catch (error) {
      console.error("❌ Error al cargar employee 30min:", error);
    }
  }

  /**
   * Carga datos de rotación de turnos
   */
  async loadRotationData() {
    try {
      console.log("🔄 Cargando datos de rotación de turnos...");

      // Intentar cargar desde Ejemplos primero (para desarrollo)
      let rotationData = null;
      try {
        rotationData = await window.api.readJson(
          "Ejemplos/Login_Rotation_Shift_20102025.json"
        );
        console.log(
          "✅ Datos de rotación cargados desde Ejemplos:",
          rotationData
        );
      } catch (error) {
        console.log(
          "⚠️ No se encontró en Ejemplos, intentando desde data_paths..."
        );

        // Intentar desde data_paths
        const config = await window.api.getConfig();
        if (config && config.data_paths) {
          for (const dataPath of config.data_paths) {
            try {
              const filePath = `${dataPath}Login_Rotation_Shift_20102025.json`;
              rotationData = await window.api.readJson(filePath);
              console.log(`✅ Datos de rotación cargados desde: ${filePath}`);
              break;
            } catch (pathError) {
              console.log(`❌ No se encontró en: ${filePath}`);
              continue;
            }
          }
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

  async loadData() {
    console.log("📊 Cargando datos de Stow...");

    try {
      // Obtener ruta base de la aplicación
      const appPath = await window.api.getAppPath();
      console.log("📂 App path:", appPath);

      // Construir rutas absolutas
      const stowPath = `${appPath}\\Ejemplos\\Stow_Data_19102025.json`;
      const effortPath = `${appPath}\\Ejemplos\\Categorias_Esfuerzo_19102025.json`;

      console.log("📂 Intentando cargar Stow desde:", stowPath);
      console.log("📂 Intentando cargar Esfuerzo desde:", effortPath);

      // Usar API de Electron para leer archivos
      const stowResult = await window.api.readJson(stowPath);
      const effortResult = await window.api.readJson(effortPath);

      if (stowResult.success) {
        this.stowData = stowResult.data;
        console.log("✅ Datos de Stow cargados:", {
          each_rates: this.stowData.stow_each_rates?.length || 0,
          pallet_rates: this.stowData.stow_pallet_rates?.length || 0,
        });
      } else {
        console.error("❌ Error cargando Stow:", stowResult.error);
      }

      if (effortResult.success) {
        this.effortData = effortResult.data;
        console.log("✅ Datos de Esfuerzo cargados:", {
          registros: this.effortData.data?.length || 0,
        });
      } else {
        console.error("❌ Error cargando Esfuerzo:", effortResult.error);
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

    // Actualizar tabla
    this.updateTable();
  }

  /**
   * Cambia el filtro de rotación (Early/Late)
   */
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

    // Actualizar icono del botón
    const sortDirectionBtn = document.getElementById("sort-direction-btn");
    if (sortDirectionBtn) {
      sortDirectionBtn.textContent =
        this.sortDirection === "desc" ? "🔽" : "🔼";
    }

    // Actualizar tabla
    this.updateTable();
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
        default:
          valueA = a.combinedUph || 0;
          valueB = b.combinedUph || 0;
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
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            No hay datos disponibles. Verificando carga de archivos...
          </td>
        </tr>
      `;
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
        <td class="cell-combined highlight-uph"><strong>${user.combined.uph.toFixed(
          0
        )}</strong></td>
      `;
      tbody.appendChild(row);
    });

    // Añadir mensaje si no hay datos
    if (usersWithData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            No hay datos disponibles para esta categoría
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla de Pallet Stow
   */
  renderPalletStowTable(thead, tbody, suffix) {
    if (!this.stowData || !this.stowData.stow_pallet_rates) return;

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
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            No hay datos disponibles para esta categoría
          </td>
        </tr>
      `;
    }
  }

  /**
   * Renderiza tabla de Esfuerzo
   */
  renderEffortTable(thead, tbody) {
    if (!this.effortData || !this.effortData.data) return;

    // Crear header
    thead.innerHTML = `
      <tr>
        <th>Login</th>
        <th>Horas</th>
        <th>Units</th>
        <th>Rate Ajustado</th>
      </tr>
    `;

    // Agrupar por usuario
    const userMap = new Map();

    this.effortData.data.forEach((entry) => {
      if (!entry.login) return;

      if (!userMap.has(entry.login)) {
        userMap.set(entry.login, {
          login: entry.login,
          hours: 0,
          units: 0,
          adjustedRate: 0,
          count: 0,
        });
      }

      const user = userMap.get(entry.login);
      user.hours += entry.hours || 0;
      user.units += entry.estandar_units || 0;
      user.adjustedRate += entry.rate_ajustado || 0;
      user.count++;
    });

    // Renderizar filas
    Array.from(userMap.values()).forEach((user) => {
      const avgAdjustedRate =
        user.count > 0 ? user.adjustedRate / user.count : 0;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${user.login}</strong></td>
        <td>${user.hours.toFixed(2)}</td>
        <td>${user.units.toFixed(0)}</td>
        <td><strong>${avgAdjustedRate.toFixed(2)}</strong></td>
      `;
      tbody.appendChild(row);
    });

    // Añadir mensaje si no hay datos
    if (userMap.size === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 2rem; color: #666;">
            No hay datos disponibles para esta categoría
          </td>
        </tr>
      `;
    }
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
    await this.loadData();
    this.updateTable();
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

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Resetear bandera
    this.isShowingUserDetail = false;
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
