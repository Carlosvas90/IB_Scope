/**
 * User Activity Controller
 * Maneja la lógica de monitoreo en tiempo real de usuarios
 */

class UserActivityController {
  constructor() {
    this.data = {
      users: [],
      metrics: {
        totalUsers: 0,
        totalStows: 0,
        avgRate: 0,
        efficiency: 0,
      },
      charts: {
        hourlyActivity: null,
        topPerformers: null,
      },
    };

    this.init();
  }

  /**
   * Inicializa el controlador
   */
  init() {
    console.log("🚀 Inicializando UserActivityController...");
    this.setupEventListeners();
    this.loadData();
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
   * Carga los datos iniciales
   */
  async loadData() {
    console.log("📊 Cargando datos de User Activity...");

    try {
      // Simular carga de datos
      await this.simulateDataLoad();
      this.updateUI();
      console.log("✅ Datos cargados correctamente");
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
    }
  }

  /**
   * Simula la carga de datos (placeholder)
   */
  async simulateDataLoad() {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Datos simulados
    this.data.metrics = {
      totalUsers: 12,
      totalStows: 1247,
      avgRate: 156,
      efficiency: 87,
    };

    this.data.users = [
      {
        id: 1,
        name: "Juan Pérez",
        login: "jperez",
        shift: "day",
        stows: 45,
        rate: 12.5,
        efficiency: 92,
        lastActivity: "10:30",
      },
      {
        id: 2,
        name: "María García",
        login: "mgarcia",
        shift: "night",
        stows: 38,
        rate: 10.2,
        efficiency: 88,
        lastActivity: "09:45",
      },
      {
        id: 3,
        name: "Carlos López",
        login: "clopez",
        shift: "day",
        stows: 52,
        rate: 14.1,
        efficiency: 95,
        lastActivity: "11:15",
      },
    ];
  }

  /**
   * Actualiza la interfaz de usuario
   */
  updateUI() {
    this.updateMetrics();
    this.updateCharts();
    this.updateTable();
  }

  /**
   * Actualiza las métricas
   */
  updateMetrics() {
    const { totalUsers, totalStows, avgRate, efficiency } = this.data.metrics;

    const totalUsersEl = document.getElementById("total-users");
    const totalStowsEl = document.getElementById("total-stows");
    const avgRateEl = document.getElementById("avg-rate");
    const efficiencyEl = document.getElementById("efficiency");

    if (totalUsersEl) totalUsersEl.textContent = totalUsers;
    if (totalStowsEl) totalStowsEl.textContent = totalStows.toLocaleString();
    if (avgRateEl) avgRateEl.textContent = avgRate;
    if (efficiencyEl) efficiencyEl.textContent = `${efficiency}%`;
  }

  /**
   * Actualiza los gráficos
   */
  updateCharts() {
    // Placeholder para gráficos
    console.log("📈 Actualizando gráficos...");
  }

  /**
   * Actualiza la tabla de usuarios
   */
  updateTable() {
    const tbody = document.querySelector("#users-table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    this.data.users.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
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
        <td>${user.lastActivity}</td>
      `;
      tbody.appendChild(row);
    });
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
    console.log("🔍 Aplicando filtros...");
    // Lógica de filtrado aquí
  }

  /**
   * Refresca los datos
   */
  async refreshData() {
    console.log("🔄 Refrescando datos...");
    await this.loadData();
  }

  /**
   * Exporta los datos
   */
  exportData() {
    console.log("📊 Exportando datos...");
    // Lógica de exportación aquí
  }
}

// Inicializar cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  new UserActivityController();
});
